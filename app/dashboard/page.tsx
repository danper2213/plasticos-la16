import type { ComponentType } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  Package,
  PackageX,
  Receipt,
} from "lucide-react";
import { getDashboardSummary, getRecentActivity } from "./_lib/dashboard-data";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCop } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";

function countPhrase(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function situationMessage(input: {
  isAdmin: boolean;
  outOfStockCount: number;
  overduePayablesCount: number;
}): string {
  const issues: string[] = [];
  if (input.outOfStockCount > 0) {
    issues.push(
      countPhrase(input.outOfStockCount, "producto sin existencias", "productos sin existencias")
    );
  }
  if (input.isAdmin && input.overduePayablesCount > 0) {
    issues.push(
      countPhrase(
        input.overduePayablesCount,
        "factura de proveedor vencida",
        "facturas de proveedores vencidas"
      )
    );
  }
  if (issues.length === 0) {
    return input.isAdmin
      ? "Hoy no hay urgencias: todos los productos activos tienen existencias y ninguna factura de proveedor está vencida."
      : "Hoy no hay urgencias: todos los productos activos tienen existencias.";
  }
  return `Hoy conviene revisar: ${issues.join(" y ")}.`;
}

function SummaryCard({
  title,
  explanation,
  value,
  reading,
  needsAttention,
  href,
  actionLabel,
  icon: Icon,
}: {
  title: string;
  explanation: string;
  value: string;
  reading: string;
  needsAttention: boolean;
  href: string;
  actionLabel: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm",
        needsAttention ? "border-amber-500/40" : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{explanation}</p>
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            needsAttention
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
      <p className="mt-5 text-3xl font-black tabular-nums tracking-tight text-foreground">{value}</p>
      <p
        className={cn(
          "mt-2 text-sm leading-relaxed",
          needsAttention ? "font-medium text-amber-800 dark:text-amber-200" : "text-muted-foreground"
        )}
      >
        {reading}
      </p>
      <div className="mt-auto pt-4">
        <Button asChild variant={needsAttention ? "default" : "outline"} className="w-fit gap-2">
          <Link href={href}>
            {actionLabel}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export default async function DashboardPage() {
  const [summary, recentActivity] = await Promise.all([
    getDashboardSummary(),
    getRecentActivity(),
  ]);
  const today = new Date();
  const dateLabel = format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  const dateLabelCapitalized = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
  const hasUrgency =
    summary.outOfStockCount > 0 || (summary.isAdmin && summary.overduePayablesCount > 0);

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        icon={LayoutDashboard}
        title="Resumen operativo"
        description={`${dateLabelCapitalized}. Un vistazo a lo que nos deben, lo que debemos y si falta producto.`}
      />

      <section
        className={cn(
          "flex items-start gap-3 rounded-2xl border px-4 py-4",
          hasUrgency
            ? "border-amber-500/40 bg-amber-500/10"
            : "border-emerald-500/30 bg-emerald-500/10"
        )}
      >
        {hasUrgency ? (
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
        ) : (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
        )}
        <p
          className={cn(
            "text-sm font-medium leading-relaxed",
            hasUrgency ? "text-amber-950 dark:text-amber-100" : "text-emerald-950 dark:text-emerald-100"
          )}
        >
          {situationMessage(summary)}
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SummaryCard
          title="Lo que nos deben los clientes"
          explanation="Ventas registradas que el cliente todavía no ha pagado."
          value={formatCop(summary.pendingReceivables)}
          reading={
            summary.pendingReceivables > 0
              ? "Esta es la suma que falta por cobrar."
              : "No hay deudas de clientes pendientes."
          }
          needsAttention={false}
          href="/dashboard/receivables"
          actionLabel="Ver quién debe"
          icon={Receipt}
        />
        {summary.isAdmin ? (
          <SummaryCard
            title="Lo que debemos a proveedores"
            explanation="Facturas de proveedores que la empresa todavía no ha pagado."
            value={formatCop(summary.pendingPayables)}
            reading={
              summary.pendingPayables > 0
                ? "Esta es la suma que falta por pagar."
                : "No hay facturas de proveedores pendientes."
            }
            needsAttention={false}
            href="/dashboard/payables"
            actionLabel="Ver facturas por pagar"
            icon={CreditCard}
          />
        ) : null}
        <SummaryCard
          title="Productos sin existencias"
          explanation="Productos activos cuya cantidad en bodega está en cero."
          value={countPhrase(summary.outOfStockCount, "producto", "productos")}
          reading={
            summary.outOfStockCount > 0
              ? "Conviene reponerlos para poder seguir vendiéndolos."
              : "Todos los productos activos tienen existencias."
          }
          needsAttention={summary.outOfStockCount > 0}
          href="/dashboard/inventory"
          actionLabel="Ver inventario"
          icon={PackageX}
        />
        {summary.isAdmin ? (
          <SummaryCard
            title="Facturas de proveedores vencidas"
            explanation="Facturas que siguen sin pagar y cuya fecha de pago ya pasó."
            value={countPhrase(summary.overduePayablesCount, "factura", "facturas")}
            reading={
              summary.overduePayablesCount > 0
                ? "Estas ya debían haberse pagado."
                : "Ninguna factura pendiente está vencida."
            }
            needsAttention={summary.overduePayablesCount > 0}
            href="/dashboard/payables"
            actionLabel="Revisar cuentas por pagar"
            icon={AlertCircle}
          />
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Últimos movimientos</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cobros de clientes, pagos a proveedores y cambios de inventario.
            </p>
          </CardHeader>
          <CardContent>
            <RecentActivity items={recentActivity} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ir a una pantalla</CardTitle>
            <p className="text-sm text-muted-foreground">
              Atajos a lo que más se consulta desde aquí.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link
              href="/dashboard/inventory"
              className="flex items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/50"
            >
              <Package className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="block text-sm font-semibold">Inventario</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  Ver cuánto hay de cada producto.
                </span>
              </span>
            </Link>
            <Link
              href="/dashboard/receivables"
              className="flex items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/50"
            >
              <Receipt className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="block text-sm font-semibold">Cuentas por cobrar</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  Ver qué clientes todavía no han pagado.
                </span>
              </span>
            </Link>
            {summary.isAdmin ? (
              <Link
                href="/dashboard/payables"
                className="flex items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/50"
              >
                <CreditCard className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold">Cuentas por pagar</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    Ver qué facturas de proveedores faltan por pagar.
                  </span>
                </span>
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
