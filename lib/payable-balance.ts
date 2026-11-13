export const MONEY_EPS = 0.009;

export function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function sumPaymentAmounts(
  amounts: Array<number | null | undefined>,
): number {
  return roundMoney(
    amounts.reduce<number>((sum, value) => sum + (Number(value) || 0), 0),
  );
}

export function payableBalanceDue(
  invoiceAmount: number,
  amountPaidTotal: number,
): number {
  return roundMoney(
    Math.max(0, roundMoney(invoiceAmount) - roundMoney(amountPaidTotal)),
  );
}

export function isPayableFullyPaid(
  invoiceAmount: number,
  amountPaidTotal: number,
): boolean {
  return payableBalanceDue(invoiceAmount, amountPaidTotal) <= MONEY_EPS;
}

export type PayablePaymentStatus = "pending" | "partial" | "paid";

export function getPayablePaymentStatus(input: {
  status: string;
  amount_paid_total: number;
}): PayablePaymentStatus {
  if (input.status === "paid") return "paid";
  if (roundMoney(input.amount_paid_total) > MONEY_EPS) return "partial";
  return "pending";
}

export function payableStatusLabel(status: PayablePaymentStatus): string {
  if (status === "paid") return "Pagada";
  if (status === "partial") return "Abono parcial";
  return "Pendiente";
}
