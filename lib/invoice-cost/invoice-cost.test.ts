import { describe, expect, it } from "vitest";
import {
  buildDescriptionFingerprint,
  findLearningForDescription,
  matchProductsBySimilarity,
  processInvoiceLine,
  stripPackNoise,
  upsertLearning,
  type InvoiceCostLearning,
  type InvoiceMatchProduct,
} from "@/lib/invoice-cost";

const PRODUCTS: InvoiceMatchProduct[] = [
  {
    id: "p1",
    name: "Contenedor Espumado 16 oz Blanco",
    presentation: "Con tapa espumada",
    packaging: "Cj x400",
    cost: 580,
    supplier_id: "sup-a",
  },
  {
    id: "p2",
    name: "Vaso Transparente 12 oz",
    presentation: "PET",
    packaging: "Cj x1000",
    cost: 120,
    supplier_id: "sup-b",
  },
  {
    id: "p3",
    name: "Contenedor Espumado 8 oz",
    presentation: "Blanco",
    packaging: "Cj x500",
    cost: 400,
    supplier_id: "sup-a",
  },
];

describe("stripPackNoise", () => {
  it("elimina Pq/CJ de la descripción", () => {
    const raw =
      "Contenedor Espumado 16 oz Blanco con Tapa Espumada - Pq x 20 un/CJ x 400 un";
    expect(stripPackNoise(raw)).toBe(
      "Contenedor Espumado 16 oz Blanco con Tapa Espumada",
    );
  });
});

describe("matchProductsBySimilarity", () => {
  it("prioriza el producto con nombre más parecido", () => {
    const hits = matchProductsBySimilarity(
      "Contenedor Espumado 16 oz Blanco con Tapa Espumada - Pq x 20 un/CJ x 400 un",
      PRODUCTS,
    );

    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].product.id).toBe("p1");
    expect(hits[0].score).toBeGreaterThan(0.45);
  });

  it("bonifica proveedor preferido", () => {
    const hits = matchProductsBySimilarity(
      "Contenedor Espumado 16 oz Blanco",
      PRODUCTS,
      { preferSupplierId: "sup-a" },
    );
    expect(hits[0].product.supplier_id).toBe("sup-a");
  });
});

describe("learning", () => {
  it("crea y reutiliza fingerprint por proveedor", () => {
    const desc =
      "Contenedor Espumado 16 oz Blanco con Tapa Espumada - CJ x 400 un";

    let learnings: InvoiceCostLearning[] = [];
    learnings = upsertLearning(learnings, {
      supplierId: "sup-a",
      descripcion: desc,
      productId: "p1",
      unidadesPorEmpaque: 400,
      unitCost: 606.6,
    });

    expect(learnings).toHaveLength(1);
    expect(learnings[0].confirmCount).toBe(1);
    expect(learnings[0].descriptionFingerprint).toBe(
      buildDescriptionFingerprint(desc, "sup-a"),
    );

    learnings = upsertLearning(learnings, {
      supplierId: "sup-a",
      descripcion: desc,
      productId: "p1",
      unitCost: 610,
    });
    expect(learnings).toHaveLength(1);
    expect(learnings[0].confirmCount).toBe(2);
    expect(learnings[0].lastUnitCost).toBe(610);

    const hit = findLearningForDescription(desc, learnings, "sup-a");
    expect(hit?.source).toBe("exact");
    expect(hit?.learning.productId).toBe("p1");
  });
});

describe("processInvoiceLine", () => {
  const line = {
    descripcion:
      "Contenedor Espumado 16 oz Blanco con Tapa Espumada - Pq x 20 un/CJ x 400 un",
    um: "CJ",
    cantidad: 20,
    valorTotalNeto: 4_078_000,
  };

  it("calcula costo y propone update si es mayor al de BD", () => {
    const result = processInvoiceLine({
      line,
      products: PRODUCTS,
      supplierId: "sup-a",
    });

    expect(result.cost.unidadesPorEmpaque).toBe(400);
    expect(result.cost.costoUnitario).toBe(606.6);
    expect(result.suggestedProduct?.id).toBe("p1");
    expect(result.currentCost).toBe(580);
    expect(result.shouldUpdate).toBe(true);
    expect(result.action).toBe("propose_update");
  });

  it("omite update si el costo factura no es superior", () => {
    const expensive = PRODUCTS.map((p) =>
      p.id === "p1" ? { ...p, cost: 900 } : p,
    );

    const result = processInvoiceLine({
      line,
      products: expensive,
      supplierId: "sup-a",
    });

    expect(result.shouldUpdate).toBe(false);
    expect(result.action).toBe("skip_not_higher");
  });

  it("usa aprendizaje: producto y pack size aprendidos", () => {
    const weirdLine = {
      descripcion: "CONT ESP 16OZ BCO TAPA (formato raro proveedor)",
      um: "CJ",
      cantidad: 20,
      valorTotalNeto: 4_078_000,
    };

    let learnings: InvoiceCostLearning[] = [];
    learnings = upsertLearning(learnings, {
      supplierId: "sup-a",
      descripcion: weirdLine.descripcion,
      productId: "p1",
      unidadesPorEmpaque: 400,
    });

    const result = processInvoiceLine({
      line: weirdLine,
      products: PRODUCTS,
      learnings,
      supplierId: "sup-a",
    });

    expect(result.matchConfidence).toBe("learned");
    expect(result.suggestedProduct?.id).toBe("p1");
    expect(result.cost.unidadesPorEmpaque).toBe(400);
    expect(result.cost.unidadesPorEmpaqueSource).toBe("learning");
    expect(result.cost.costoUnitario).toBe(606.6);
    expect(result.shouldUpdate).toBe(true);
  });
});
