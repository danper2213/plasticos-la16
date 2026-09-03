import { formatCop } from "@/lib/format";

export interface DailyRegisterInputs {
  previous_balance: number;
  samit_sales_total: number;
  cash_total: number;
  transfers_total: number;
  expenses_total: number;
  payments_total: number;
}

export interface DailyRegisterDerived {
  collected: number;
  samitDifference: number;
  outflows: number;
  endingBalance: number;
}

/** Tolerancia en COP para considerar que el recaudo cuadra con SAMIT. */
export const CUADRE_TOLERANCE_COP = 1000;

export function computeDailyRegister(
  input: DailyRegisterInputs
): DailyRegisterDerived {
  const cash = Number(input.cash_total) || 0;
  const transfers = Number(input.transfers_total) || 0;
  const expenses = Number(input.expenses_total) || 0;
  const payments = Number(input.payments_total) || 0;
  const previous = Number(input.previous_balance) || 0;
  const samit = Number(input.samit_sales_total) || 0;

  const collected = cash + transfers;
  const outflows = expenses + payments;
  const samitDifference = samit - collected;
  const endingBalance = previous + cash + transfers - expenses - payments;

  return { collected, samitDifference, outflows, endingBalance };
}

export function withDerived<T extends DailyRegisterInputs>(
  row: T
): T & DailyRegisterDerived {
  return { ...row, ...computeDailyRegister(row) };
}

export type AdviceSeverity = "ok" | "info" | "warning" | "alert";

export interface DailyAdvice {
  id: string;
  severity: AdviceSeverity;
  title: string;
  message: string;
}

export function buildDailyAdvice(
  input: DailyRegisterInputs,
  derived: DailyRegisterDerived = computeDailyRegister(input)
): DailyAdvice[] {
  const advice: DailyAdvice[] = [];
  const cash = Number(input.cash_total) || 0;

  if (Math.abs(derived.samitDifference) <= CUADRE_TOLERANCE_COP) {
    advice.push({
      id: "cuadre",
      severity: "ok",
      title: "Cuadre con SAMIT",
      message: "El recaudo cuadra con SAMIT.",
    });
  } else if (derived.samitDifference > 0) {
    advice.push({
      id: "falta",
      severity: "alert",
      title: "Falta dinero vs SAMIT",
      message: `Faltan ${formatCop(derived.samitDifference)} vs SAMIT. Revisa crédito, conteo o una transferencia no cargada.`,
    });
  } else {
    advice.push({
      id: "sobra",
      severity: "warning",
      title: "Sobra vs SAMIT",
      message: `Sobraron ${formatCop(Math.abs(derived.samitDifference))} vs SAMIT. Puede ser cobro de cartera o una venta no registrada.`,
    });
  }

  if (derived.endingBalance < 0) {
    advice.push({
      id: "saldo-negativo",
      severity: "alert",
      title: "Saldo a arrastrar negativo",
      message: `Mañana partes corto (${formatCop(derived.endingBalance)}). Prioriza cobros y evita gastos no esenciales.`,
    });
  } else if (
    derived.endingBalance === 0 ||
    (derived.outflows > 0 && derived.endingBalance < derived.outflows * 0.5)
  ) {
    advice.push({
      id: "saldo-bajo",
      severity: "warning",
      title: "Saldo bajo para mañana",
      message: `Mañana partes con ${formatCop(derived.endingBalance)}. Prioriza cobros y evita gastos no esenciales.`,
    });
  } else {
    advice.push({
      id: "saldo-ok",
      severity: "ok",
      title: "Saldo a arrastrar",
      message: `Mañana partes con ${formatCop(derived.endingBalance)}. Reserva para pagos si hay vencimientos.`,
    });
  }

  if (derived.outflows > derived.collected && derived.outflows > 0) {
    advice.push({
      id: "salidas",
      severity: "warning",
      title: "Salidas mayores que recaudo",
      message: "Hoy salió más de lo que entró.",
    });
  }

  if (derived.collected > 0) {
    const cashPct = Math.round((cash / derived.collected) * 100);
    const transferPct = 100 - cashPct;
    advice.push({
      id: "mix",
      severity: "info",
      title: "Mix de recaudo",
      message: `Hoy recaudaste ${cashPct}% en efectivo y ${transferPct}% por transferencia.`,
    });
  }

  return advice;
}

export function samitDifferenceLabel(difference: number): string {
  if (Math.abs(difference) <= CUADRE_TOLERANCE_COP) return "Cuadra";
  if (difference > 0) return "Falta";
  return "Sobra";
}
