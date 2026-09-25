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
  /** Efectivo + transferencias. */
  collected: number;
  /** Ventas SAMIT menos gastos y pagos de facturas. */
  expectedCollected: number;
  /**
   * Lo que debía entrar menos lo recaudado.
   * Positivo: falta. Negativo: sobra.
   */
  samitDifference: number;
  outflows: number;
  endingBalance: number;
}

/** Tolerancia en COP para considerar que el recaudo cuadra. */
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
  const expectedCollected = samit - outflows;
  const samitDifference = expectedCollected - collected;
  const endingBalance = previous + cash + transfers - expenses - payments;

  return { collected, expectedCollected, samitDifference, outflows, endingBalance };
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
      title: "Cuadre de caja",
      message: "Efectivo y transferencias coinciden con las ventas menos gastos y pagos.",
    });
  } else if (derived.samitDifference > 0) {
    advice.push({
      id: "falta",
      severity: "alert",
      title: "Falta en caja",
      message: `Faltan ${formatCop(derived.samitDifference)}. Efectivo y transferencias deberían ser las ventas menos gastos y pagos.`,
    });
  } else {
    advice.push({
      id: "sobra",
      severity: "warning",
      title: "Sobra en caja",
      message: `Sobran ${formatCop(Math.abs(derived.samitDifference))}. Entró más de lo que queda al restar gastos y pagos a las ventas.`,
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

export type CuadreTone = "ok" | "short" | "over";

export function cuadreTone(difference: number): CuadreTone {
  if (Math.abs(difference) <= CUADRE_TOLERANCE_COP) return "ok";
  if (difference > 0) return "short";
  return "over";
}

export function samitDifferenceLabel(difference: number): string {
  const tone = cuadreTone(difference);
  if (tone === "ok") return "Cuadra";
  if (tone === "short") return "Falta";
  return "Sobra";
}
