import {
  calculateInvoiceUnitCost,
  isKgUm,
  isMetrajeUm,
  type InvoiceLineCostResult,
} from "@/lib/invoice-unit-cost";
import {
  applyLearnedUnidadesPorEmpaque,
  findLearningForDescription,
  type InvoiceCostLearning,
} from "@/lib/invoice-cost/learning";
import {
  matchProductsBySimilarity,
  type InvoiceMatchProduct,
  type ProductMatchCandidate,
} from "@/lib/invoice-cost/match-products";

export interface RawInvoiceLine {
  descripcion: string;
  um: string;
  cantidad: number;
  valorTotalNeto: number;
  valorIva?: number;
  codigoProveedor?: string | null;
  /** Metros por rollo (ej. 120ML → 120). */
  metrosPorUnidad?: number | null;
  /** Rollos cuando UM es KG. */
  numeroRollos?: number | null;
  /** Metros totales de la línea. */
  metrajeTotal?: number | null;
}

export interface ProcessInvoiceLineInput {
  line: RawInvoiceLine;
  products: InvoiceMatchProduct[];
  learnings?: InvoiceCostLearning[];
  supplierId?: string | null;
}

export type InvoiceLineAction =
  | "propose_update"
  | "skip_not_higher"
  | "review_match"
  | "no_match";

export interface ProcessedInvoiceLine {
  line: RawInvoiceLine;
  cost: InvoiceLineCostResult & {
    unidadesPorEmpaqueSource: "learning" | "regex" | "fallback" | "metraje";
  };
  learningHit: {
    productId: string;
    source: "exact" | "fuzzy";
    confirmCount: number;
  } | null;
  candidates: ProductMatchCandidate[];
  suggestedProduct: InvoiceMatchProduct | null;
  matchConfidence: "high" | "medium" | "low" | "learned" | "none";
  currentCost: number | null;
  shouldUpdate: boolean;
  action: InvoiceLineAction;
}

/**
 * Pipeline: aprendizaje → metraje desde descripción → costo → match → alza.
 */
export function processInvoiceLine(
  input: ProcessInvoiceLineInput,
): ProcessedInvoiceLine {
  const { line, products, supplierId = null } = input;
  const learnings = input.learnings ?? [];

  const learningHit = findLearningForDescription(
    line.descripcion,
    learnings,
    supplierId,
  );

  const costBase = calculateInvoiceUnitCost({
    descripcion: line.descripcion,
    um: line.um,
    cantidad: line.cantidad,
    valorTotalNeto: line.valorTotalNeto,
    valorIva: line.valorIva,
    metrosPorUnidad: line.metrosPorUnidad,
    numeroRollos: line.numeroRollos,
    metrajeTotal: line.metrajeTotal,
  });

  const learnedFactor = applyLearnedUnidadesPorEmpaque(
    costBase.unidadesPorEmpaque,
    learningHit?.learning,
  );

  let factor = costBase.unidadesPorEmpaque;
  let totalUnidades = costBase.totalUnidades;
  let costoUnitario = costBase.costoUnitario;
  let costBasis = costBase.costBasis;
  let unitLabel = costBase.unitLabel;
  let numeroRollos = costBase.numeroRollos;
  let unidadesPorEmpaqueSource: ProcessedInvoiceLine["cost"]["unidadesPorEmpaqueSource"] =
    costBasis === "metraje"
      ? "metraje"
      : costBase.packPatternFound
        ? "regex"
        : "fallback";

  // Aprendizaje: metros/rollo (KG) o unidades/empaque (CJ…). No pisar UM=MTR.
  const canApplyLearnedFactor =
    learnedFactor.source === "learning" &&
    learningHit?.learning.unidadesPorEmpaque != null &&
    !isMetrajeUm(line.um);

  if (canApplyLearnedFactor) {
    factor = learnedFactor.value;
    if (isKgUm(line.um) || costBasis === "metraje") {
      const rolls =
        numeroRollos && numeroRollos > 0
          ? numeroRollos
          : isKgUm(line.um)
            ? 1
            : line.cantidad;
      totalUnidades = rolls * factor;
      numeroRollos = rolls;
      costBasis = "metraje";
      unitLabel = "m";
    } else {
      totalUnidades = line.cantidad * factor;
    }
    costoUnitario =
      totalUnidades > 0
        ? Math.round((costBase.valorTotalConIva / totalUnidades) * 100) / 100
        : 0;
    unidadesPorEmpaqueSource = "learning";
  }

  const cost: ProcessedInvoiceLine["cost"] = {
    ...costBase,
    unidadesPorEmpaque: factor,
    totalUnidades,
    costoUnitario,
    costBasis,
    unitLabel,
    numeroRollos,
    packPatternFound:
      costBase.packPatternFound || learnedFactor.source === "learning",
    unidadesPorEmpaqueSource,
  };

  let suggestedProduct: InvoiceMatchProduct | null = null;
  let matchConfidence: ProcessedInvoiceLine["matchConfidence"] = "none";
  let learningMeta: ProcessedInvoiceLine["learningHit"] = null;

  if (learningHit) {
    const learnedProduct =
      products.find((p) => p.id === learningHit.learning.productId) ?? null;
    if (learnedProduct) {
      suggestedProduct = learnedProduct;
      matchConfidence = "learned";
      learningMeta = {
        productId: learnedProduct.id,
        source: learningHit.source,
        confirmCount: learningHit.learning.confirmCount,
      };
    }
  }

  const candidates = matchProductsBySimilarity(line.descripcion, products, {
    preferSupplierId: supplierId,
    limit: 5,
  });

  if (!suggestedProduct) {
    const top = candidates[0] ?? null;
    if (top) {
      suggestedProduct = top.product;
      matchConfidence = top.confidence;
    }
  }

  const currentCost = suggestedProduct?.cost ?? null;
  const shouldUpdate =
    suggestedProduct != null &&
    currentCost != null &&
    costoUnitario > currentCost;

  const action = resolveAction({
    suggestedProduct,
    matchConfidence,
    shouldUpdate,
  });

  return {
    line,
    cost,
    learningHit: learningMeta,
    candidates,
    suggestedProduct,
    matchConfidence,
    currentCost,
    shouldUpdate,
    action,
  };
}

export function processInvoiceLines(
  lines: RawInvoiceLine[],
  products: InvoiceMatchProduct[],
  options: {
    learnings?: InvoiceCostLearning[];
    supplierId?: string | null;
  } = {},
): ProcessedInvoiceLine[] {
  return lines.map((line) =>
    processInvoiceLine({
      line,
      products,
      learnings: options.learnings,
      supplierId: options.supplierId,
    }),
  );
}

function resolveAction(args: {
  suggestedProduct: InvoiceMatchProduct | null;
  matchConfidence: ProcessedInvoiceLine["matchConfidence"];
  shouldUpdate: boolean;
}): InvoiceLineAction {
  if (!args.suggestedProduct) return "no_match";
  if (args.matchConfidence === "low") return "review_match";
  if (!args.shouldUpdate) return "skip_not_higher";
  if (args.matchConfidence === "high" || args.matchConfidence === "learned") {
    return "propose_update";
  }
  return "review_match";
}
