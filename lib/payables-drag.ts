import type { DragEvent } from "react";

/** Payload para arrastrar facturas entre días del calendario. */
export const PAYABLE_DRAG_MIME = "application/x-plasticos-payable";

export type PayableDragPayload = {
  id: string;
  sourceDateKey: string;
};

export function setPayableDragData(
  e: DragEvent,
  payload: PayableDragPayload
): void {
  e.dataTransfer.setData(PAYABLE_DRAG_MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "move";
}

export function getPayableDragData(e: DragEvent): PayableDragPayload | null {
  const raw = e.dataTransfer.getData(PAYABLE_DRAG_MIME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PayableDragPayload;
    if (parsed?.id && parsed?.sourceDateKey) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}
