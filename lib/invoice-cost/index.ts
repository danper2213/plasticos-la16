export {
  calculateInvoiceUnitCost,
  extractMetrosPorPieza,
  extractUnidadesPorEmpaque,
  isKgUm,
  isMetrajeUm,
  normalizeInvoiceUm,
  type InvoiceCostBasis,
  type InvoiceLineCostInput,
  type InvoiceLineCostResult,
} from "@/lib/invoice-unit-cost";

export { stripPackNoise } from "@/lib/invoice-cost/strip-pack-noise";

export {
  matchProductsBySimilarity,
  type InvoiceMatchProduct,
  type MatchProductsOptions,
  type ProductMatchCandidate,
} from "@/lib/invoice-cost/match-products";

export {
  applyLearnedUnidadesPorEmpaque,
  buildDescriptionFingerprint,
  buildGlobalDescriptionFingerprint,
  findLearningForDescription,
  upsertLearning,
  type InvoiceCostLearning,
  type LearningLookupHit,
  type RecordLearningInput,
} from "@/lib/invoice-cost/learning";

export {
  processInvoiceLine,
  processInvoiceLines,
  type InvoiceLineAction,
  type ProcessInvoiceLineInput,
  type ProcessedInvoiceLine,
  type RawInvoiceLine,
} from "@/lib/invoice-cost/process-invoice-line";

export {
  defaultApplyCostUpdate,
  invoiceCostDelta,
  type InvoiceCostDelta,
} from "@/lib/invoice-cost/cost-delta";

// extract-invoice / detect-invoice-file son server-only (Gemini).
// No reexportarlos desde este barrel para no romper imports de cliente.
