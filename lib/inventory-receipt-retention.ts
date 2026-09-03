/** Comprobantes visibles por página en Inventario. */
export const INVENTORY_BATCH_PAGE_SIZE = 5;

/** Días que se conserva un comprobante antes de eliminarlo (el stock no se revierte). */
export const INVENTORY_RECEIPT_RETENTION_DAYS = 30;

export function inventoryReceiptCutoffIso(now: Date = new Date()): string {
  return new Date(
    now.getTime() - INVENTORY_RECEIPT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}
