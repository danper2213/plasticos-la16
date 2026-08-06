import { normalizeText } from "@/lib/searchEngine";
import { stripPackNoise } from "@/lib/invoice-cost/strip-pack-noise";

/**
 * Aprendizaje acumulativo entre proveedores/plantillas.
 *
 * Cada confirmación del usuario refuerza:
 * - descripción de factura → producto
 * - unidades por empaque (cuando el regex falla o el proveedor usa otro formato)
 * - último costo unitario visto
 */

export interface InvoiceCostLearning {
  id?: string;
  /** null = aplica a cualquier proveedor */
  supplierId: string | null;
  /** Fingerprint estable de la descripción (sin ruido de empaque). */
  descriptionFingerprint: string;
  /** Ejemplo original (última vez confirmada). */
  sampleDescription: string;
  productId: string;
  /** Override de pack size; null = usar solo regex. */
  unidadesPorEmpaque: number | null;
  confirmCount: number;
  lastUnitCost: number | null;
  updatedAt?: string;
}

export interface LearningLookupHit {
  learning: InvoiceCostLearning;
  /** Exacto por fingerprint, o por similitud de fingerprint tokens. */
  source: "exact" | "fuzzy";
}

/** Fingerprint para indexar aprendizajes. */
export function buildDescriptionFingerprint(
  descripcion: string,
  supplierId?: string | null,
): string {
  const cleaned = normalizeText(stripPackNoise(descripcion));
  const scope = supplierId?.trim() || "*";
  return `${scope}::${cleaned}`;
}

/** Fingerprint sin proveedor (búsqueda global). */
export function buildGlobalDescriptionFingerprint(descripcion: string): string {
  return buildDescriptionFingerprint(descripcion, null);
}

/**
 * Busca un aprendizaje aplicable.
 * Orden: exacto proveedor → exacto global → fuzzy proveedor → fuzzy global.
 */
export function findLearningForDescription(
  descripcion: string,
  learnings: InvoiceCostLearning[],
  supplierId?: string | null,
): LearningLookupHit | null {
  if (learnings.length === 0) return null;

  const supplierFp = buildDescriptionFingerprint(descripcion, supplierId);
  const globalFp = buildGlobalDescriptionFingerprint(descripcion);

  const exactSupplier = learnings.find(
    (l) => l.descriptionFingerprint === supplierFp,
  );
  if (exactSupplier) return { learning: exactSupplier, source: "exact" };

  const exactGlobal = learnings.find(
    (l) => l.descriptionFingerprint === globalFp,
  );
  if (exactGlobal) return { learning: exactGlobal, source: "exact" };

  const queryNorm = normalizeText(stripPackNoise(descripcion));
  if (!queryNorm) return null;

  const scoped = supplierId
    ? learnings.filter(
        (l) => l.supplierId === supplierId || l.supplierId == null,
      )
    : learnings;

  let best: { learning: InvoiceCostLearning; score: number } | null = null;

  for (const learning of scoped) {
    const learnedNorm = learning.descriptionFingerprint.includes("::")
      ? learning.descriptionFingerprint.split("::").slice(1).join("::")
      : learning.descriptionFingerprint;

    const score = fingerprintSimilarity(queryNorm, learnedNorm);
    if (score < 0.88) continue;
    if (!best || score > best.score) {
      best = { learning, score };
    }
  }

  if (!best) return null;
  return { learning: best.learning, source: "fuzzy" };
}

export interface RecordLearningInput {
  supplierId?: string | null;
  descripcion: string;
  productId: string;
  unidadesPorEmpaque?: number | null;
  unitCost?: number | null;
}

/**
 * Fusiona una confirmación en la lista de aprendizajes (puro, inmutable).
 * Si ya existe el fingerprint, incrementa confirm_count y actualiza campos.
 */
export function upsertLearning(
  learnings: InvoiceCostLearning[],
  input: RecordLearningInput,
): InvoiceCostLearning[] {
  const supplierId = input.supplierId ?? null;
  const fingerprint = buildDescriptionFingerprint(input.descripcion, supplierId);
  const now = new Date().toISOString();

  const idx = learnings.findIndex((l) => l.descriptionFingerprint === fingerprint);

  if (idx === -1) {
    const created: InvoiceCostLearning = {
      supplierId,
      descriptionFingerprint: fingerprint,
      sampleDescription: input.descripcion,
      productId: input.productId,
      unidadesPorEmpaque:
        input.unidadesPorEmpaque != null && input.unidadesPorEmpaque > 0
          ? Math.round(input.unidadesPorEmpaque)
          : null,
      confirmCount: 1,
      lastUnitCost: input.unitCost ?? null,
      updatedAt: now,
    };
    return [...learnings, created];
  }

  const prev = learnings[idx];
  const next: InvoiceCostLearning = {
    ...prev,
    sampleDescription: input.descripcion,
    productId: input.productId,
    unidadesPorEmpaque:
      input.unidadesPorEmpaque != null && input.unidadesPorEmpaque > 0
        ? Math.round(input.unidadesPorEmpaque)
        : prev.unidadesPorEmpaque,
    confirmCount: prev.confirmCount + 1,
    lastUnitCost: input.unitCost ?? prev.lastUnitCost,
    updatedAt: now,
  };

  const copy = learnings.slice();
  copy[idx] = next;
  return copy;
}

/**
 * Si el usuario corrige unidades_por_empaque, se guarda para ese fingerprint.
 * Así plantillas raras de un proveedor dejan de depender solo del regex.
 */
export function applyLearnedUnidadesPorEmpaque(
  regexValue: number,
  learning: InvoiceCostLearning | null | undefined,
): { value: number; source: "learning" | "regex" } {
  if (
    learning?.unidadesPorEmpaque != null &&
    learning.unidadesPorEmpaque > 0
  ) {
    return { value: learning.unidadesPorEmpaque, source: "learning" };
  }
  return { value: regexValue, source: "regex" };
}

function fingerprintSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) {
    return (
      Math.min(a.length, b.length) / Math.max(a.length, b.length) * 0.15 + 0.85
    );
  }

  const ta = new Set(a.split(" ").filter(Boolean));
  const tb = new Set(b.split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;

  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const union = new Set([...ta, ...tb]).size;
  return inter / union;
}
