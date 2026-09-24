import {
  alignUnitPriceToLineTotal,
  calculateInvoiceUnitCost,
  costFromCatalogUnitPrice,
  extractCatalogPackUnits,
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
import {
  resolveInvoiceIvaInclusion,
  type InvoiceIvaInclusion,
} from "@/lib/invoice-cost/resolve-invoice-iva";

export interface RawInvoiceLine {
  descripcion: string;
  um: string;
  cantidad: number;
  /** VR TOTAL de la línea, tal como aparece (con o sin IVA). */
  valorTotalNeto: number;
  valorIva?: number;
  codigoProveedor?: string | null;
  /** Precio unitario de la línea, antes de IVA. */
  precioUnitario?: number | null;
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
  invoiceIvaInclusion?: InvoiceIvaInclusion;
}

export type InvoiceLineAction =
  | "propose_update"
  | "skip_not_higher"
  | "review_match"
  | "no_match";

export interface ProcessedInvoiceLine {
  line: RawInvoiceLine;
  cost: InvoiceLineCostResult & {
    unidadesPorEmpaqueSource:
      | "learning"
      | "regex"
      | "fallback"
      | "metraje"
      | "catalog";
    /** Precio unitario × 1,19 / unidades del empaque en el catálogo. */
    pricedFromUnitPrice: boolean;
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
 * Pipeline: aprendizaje → metraje desde descripción → costo → match → alza
 * propuesta. Las bajas de costo no se auto-aplican (`skip_not_higher`);
 * la UI puede optar por aplicarlas.
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
    invoiceIvaInclusion: input.invoiceIvaInclusion,
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

  // El aprendizaje ya confirmado manda sobre el "X 500" de la descripción.
  // El metraje (MTR/KG/120ML) no se reemplaza por unidades de empaque.
  const canApplyLearnedFactor =
    learnedFactor.source === "learning" &&
    learningHit?.learning.unidadesPorEmpaque != null &&
    !isMetrajeUm(line.um) &&
    !isKgUm(line.um) &&
    costBase.costBasis !== "metraje";

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
    pricedFromUnitPrice: false,
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

  applyCatalogUnitPrice(cost, line, suggestedProduct);

  const currentCost = suggestedProduct?.cost ?? null;
  const shouldUpdate =
    suggestedProduct != null &&
    currentCost != null &&
    cost.costoUnitario > currentCost;

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
    invoiceIvaInclusion?: InvoiceIvaInclusion;
    headerTotalWithIva?: number | null;
    headerTotalNeto?: number | null;
    headerIvaAmount?: number | null;
    extractorIvaHint?: boolean | null;
  } = {},
): ProcessedInvoiceLine[] {
  const invoiceIvaInclusion =
    options.invoiceIvaInclusion ??
    resolveInvoiceIvaInclusion({
      headerTotalWithIva: options.headerTotalWithIva,
      headerTotalNeto: options.headerTotalNeto,
      headerIvaAmount: options.headerIvaAmount,
      lineTotals: lines.map((line) => line.valorTotalNeto),
      lineIvas: lines.map((line) => line.valorIva),
      extractorHint: options.extractorIvaHint,
    }).inclusion;

  return lines.map((line) =>
    processInvoiceLine({
      line,
      products,
      learnings: options.learnings,
      supplierId: options.supplierId,
      invoiceIvaInclusion,
    }),
  );
}

function applyCatalogUnitPrice(
  cost: ProcessedInvoiceLine["cost"],
  line: RawInvoiceLine,
  product: InvoiceMatchProduct | null,
): void {
  if (cost.costBasis === "metraje" || isMetrajeUm(line.um) || isKgUm(line.um)) {
    return;
  }
  const fromLearning = cost.unidadesPorEmpaqueSource === "learning";
  const units = fromLearning
    ? cost.unidadesPorEmpaque
    : extractCatalogPackUnits(product?.packaging);
  if (units == null || units <= 0) return;

  const rawPrice = line.precioUnitario;
  const precio =
    rawPrice != null && Number.isFinite(rawPrice) && rawPrice > 0
      ? alignUnitPriceToLineTotal(rawPrice, line.cantidad, line.valorTotalNeto)
      : null;
  const priceMatchesLine =
    precio != null &&
    line.cantidad > 0 &&
    line.valorTotalNeto > 0 &&
    (amountsClose(precio * line.cantidad, line.valorTotalNeto) ||
      amountsClose(precio * line.cantidad * 1.19, line.valorTotalNeto));

  if (precio != null && priceMatchesLine) {
    const priced = costFromCatalogUnitPrice(precio, units);
    line.precioUnitario = precio;
    cost.unidadesPorEmpaque = units;
    cost.totalUnidades = units;
    cost.costoUnitario = priced.costoUnitario;
    cost.valorTotalConIva = priced.valorConIva;
    cost.unitLabel = "un";
    cost.costBasis = "unidad";
    cost.unidadesPorEmpaqueSource = fromLearning ? "learning" : "catalog";
    cost.pricedFromUnitPrice = true;
    return;
  }

  if (fromLearning) return;

  const totalUnidades = line.cantidad * units;
  cost.unidadesPorEmpaque = units;
  cost.totalUnidades = totalUnidades;
  cost.costoUnitario =
    totalUnidades > 0
      ? Math.round((cost.valorTotalConIva / totalUnidades) * 100) / 100
      : 0;
  cost.unitLabel = "un";
  cost.costBasis = "unidad";
  cost.unidadesPorEmpaqueSource = "catalog";
  cost.pricedFromUnitPrice = false;
}

function amountsClose(a: number, b: number): boolean {
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) <= Math.max(1, scale * 0.02);
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
