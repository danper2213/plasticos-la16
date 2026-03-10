import { requireUser } from "@/utils/supabase/require-user";
import type { UserRole } from "@/components/layout/sidebar";

export interface DashboardKpis {
  role: UserRole;
  /** Sum of current_balance from bank_accounts (admin only) */
  bankBalanceTotal: number;
  /** Sum of invoice_amount from accounts_payable where status = 'pending' (admin only) */
  accountsPayableTotal: number;
  /** Sum of total_amount from accounts_receivable where status = 'pending' (admin only) */
  accountsReceivableTotal: number;
  /** Count of products where stock_quantity < 50 */
  lowStockCount: number;
}

function safeSum(values: (number | null | undefined)[]): number {
  return values.reduce<number>(
    (acc, v) => acc + (typeof v === "number" && !Number.isNaN(v) ? v : 0),
    0
  );
}

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const { supabase, user } = await requireUser();

  let role: UserRole = "employee";
  try {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data?.role === "admin" || data?.role === "employee") {
      role = data.role;
    }
  } catch {
    // keep employee
  }

  const isAdmin = role === "admin";

  let bankBalanceTotal = 0;
  let accountsPayableTotal = 0;
  let accountsReceivableTotal = 0;
  let lowStockCount = 0;

  try {
    if (isAdmin) {
      const [bankRes, payablesRes, receivablesRes] = await Promise.all([
        supabase.from("bank_accounts").select("current_balance"),
        supabase
          .from("accounts_payable")
          .select("invoice_amount")
          .eq("status", "pending"),
        supabase
          .from("accounts_receivable")
          .select("total_amount")
          .eq("status", "pending"),
      ]);

      bankBalanceTotal = safeSum((bankRes.data ?? []).map((r) => r.current_balance));
      accountsPayableTotal = safeSum((payablesRes.data ?? []).map((r) => r.invoice_amount));
      accountsReceivableTotal = safeSum((receivablesRes.data ?? []).map((r) => r.total_amount));
    }

    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .lt("stock_quantity", 50);
    lowStockCount = count ?? 0;
  } catch {
    // Tables may not exist yet; keep zeros
  }

  return {
    role,
    bankBalanceTotal,
    accountsPayableTotal,
    accountsReceivableTotal,
    lowStockCount,
  };
}

export interface DashboardSummary {
  pendingReceivables: number;
  pendingPayables: number;
  outOfStockCount: number;
  overduePayablesCount: number;
}

/** Summary for dashboard home: receivables, payables, out-of-stock, overdue. No bank/cash metrics. */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { supabase } = await requireUser();

  const result: DashboardSummary = {
    pendingReceivables: 0,
    pendingPayables: 0,
    outOfStockCount: 0,
    overduePayablesCount: 0,
  };

  try {
    const today = new Date().toISOString().slice(0, 10);

    const [receivablesRes, payablesRes, outOfStockRes, overdueRes] = await Promise.all([
      supabase
        .from("accounts_receivable")
        .select("total_amount")
        .eq("status", "pending"),
      supabase
        .from("accounts_payable")
        .select("invoice_amount")
        .eq("status", "pending"),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("stock_quantity", 0)
        .eq("is_active", true),
      supabase
        .from("accounts_payable")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .lt("due_date", today),
    ]);

    result.pendingReceivables = safeSum(
      (receivablesRes.data ?? []).map((r) => r.total_amount)
    );
    result.pendingPayables = safeSum(
      (payablesRes.data ?? []).map((r) => r.invoice_amount)
    );
    result.outOfStockCount = outOfStockRes.count ?? 0;
    result.overduePayablesCount = overdueRes.count ?? 0;
  } catch {
    // Tables may not exist; keep zeros
  }

  return result;
}

export type RecentActivityItem = {
  id: string;
  type: "payment_out" | "payment_in" | "inventory";
  title: string;
  description: string;
  amount: number | null;
  date: string;
};

/** Fetches latest payments and movements, merges and sorts by date desc, returns top 6. */
export async function getRecentActivity(): Promise<RecentActivityItem[]> {
  const { supabase } = await requireUser();

  try {
    const [payablePaymentsRes, receivablePaymentsRes, inventoryRes] = await Promise.all([
      supabase
        .from("payable_payments")
        .select("id, amount_paid, payment_date, accounts_payable(suppliers(name))")
        .order("payment_date", { ascending: false })
        .limit(5),
      supabase
        .from("receivable_payments")
        .select("id, amount_received, payment_date, accounts_receivable(customers(name))")
        .order("payment_date", { ascending: false })
        .limit(5),
      supabase
        .from("inventory_movements")
        .select("id, movement_type, quantity, movement_date, products(name)")
        .order("movement_date", { ascending: false })
        .limit(5),
    ]);

    const paymentOut: RecentActivityItem[] = (payablePaymentsRes.data ?? []).map(
      (row: Record<string, unknown>) => {
        const apRaw = row.accounts_payable;
        const ap = Array.isArray(apRaw) ? apRaw[0] : apRaw;
        const apObj = ap as { suppliers?: { name?: string } | { name?: string }[] } | null | undefined;
        const suppliers = apObj?.suppliers;
        const supplierName =
          Array.isArray(suppliers) ? suppliers[0]?.name : (suppliers as { name?: string } | null)?.name;
        return {
          id: String(row.id),
          type: "payment_out" as const,
          title: "Pago a proveedor",
          description: "Pago registrado a " + (supplierName ?? "proveedor"),
          amount: typeof row.amount_paid === "number" ? row.amount_paid : null,
          date: String(row.payment_date ?? ""),
        };
      }
    );

    const paymentIn: RecentActivityItem[] = (receivablePaymentsRes.data ?? []).map(
      (row: Record<string, unknown>) => {
        const arRaw = row.accounts_receivable;
        const ar = Array.isArray(arRaw) ? arRaw[0] : arRaw;
        const arObj = ar as { customers?: { name?: string } | { name?: string }[] } | null | undefined;
        const customers = arObj?.customers;
        const customerName =
          Array.isArray(customers) ? customers[0]?.name : (customers as { name?: string } | null)?.name;
        return {
          id: String(row.id),
          type: "payment_in" as const,
          title: "Recaudo de cliente",
          description: "Pago recibido de " + (customerName ?? "cliente"),
          amount: typeof row.amount_received === "number" ? row.amount_received : null,
          date: String(row.payment_date ?? ""),
        };
      }
    );

    const inventory: RecentActivityItem[] = (inventoryRes.data ?? []).map(
      (row: Record<string, unknown>) => {
        const pRaw = row.products;
        const p = Array.isArray(pRaw) ? pRaw[0] : pRaw;
        const productName = (p as { name?: string } | null)?.name;
        const movementType = String(row.movement_type ?? "");
        const title =
          movementType === "in"
            ? "Entrada de inventario"
            : movementType === "out"
              ? "Salida de inventario"
              : "Ajuste de inventario";
        return {
          id: String(row.id),
          type: "inventory" as const,
          title,
          description: `${Number(row.quantity) || 0} unds de ${productName ?? "producto"}`,
          amount: null,
          date: String(row.movement_date ?? ""),
        };
      }
    );

    const merged = [...paymentOut, ...paymentIn, ...inventory].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return merged.slice(0, 6);
  } catch {
    return [];
  }
}
