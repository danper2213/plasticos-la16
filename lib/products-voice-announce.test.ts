import { describe, expect, it } from "vitest";
import { buildProductsVoiceAnnouncement } from "./products-voice-announce";
import type { VoiceAnnounceProduct } from "./products-voice-announce";

const vaso: VoiceAnnounceProduct = {
  name: "Vaso 14 oz",
  cost: 1000,
  stock_quantity: 10,
  packaging: "Paca x20",
  presentation: "Unidad",
};

const bandeja: VoiceAnnounceProduct = {
  name: "Bandeja #7",
  cost: 800,
  stock_quantity: 3,
  packaging: "Paca x50",
  presentation: null,
};

const tapa: VoiceAnnounceProduct = {
  name: "Tapa 9, 10, 12",
  cost: 500,
  stock_quantity: 0,
  packaging: null,
  presentation: null,
};

describe("buildProductsVoiceAnnouncement", () => {
  it("anuncia vacío con la consulta", () => {
    expect(
      buildProductsVoiceAnnouncement({
        query: "vaso 14 oz",
        totalCount: 0,
        products: [],
      }),
    ).toBe("No encontré productos para vaso 14 oz.");
  });

  it("anuncia un producto con precio de venta y stock", () => {
    const phrase = buildProductsVoiceAnnouncement({
      query: "vaso 14 oz",
      totalCount: 1,
      products: [vaso],
    });
    expect(phrase).toContain("Encontré Vaso 14 oz.");
    expect(phrase).toContain("Precio de venta");
    expect(phrase).toContain("pesos");
    expect(phrase).toContain("Stock");
  });

  it("lista hasta 3 productos", () => {
    const phrase = buildProductsVoiceAnnouncement({
      query: "vaso",
      totalCount: 3,
      products: [vaso, bandeja, tapa],
    });
    expect(phrase).toContain("Encontré 3 productos.");
    expect(phrase).toContain("El primero es Vaso 14 oz");
    expect(phrase).toContain("También Bandeja #7");
    expect(phrase).toContain("También Tapa 9, 10, 12");
  });

  it("con muchos resultados solo dice el conteo y el primero", () => {
    const phrase = buildProductsVoiceAnnouncement({
      query: "vaso",
      totalCount: 12,
      products: [vaso, bandeja, tapa],
    });
    expect(phrase).toBe(
      "Encontré 12 productos. El primero es Vaso 14 oz, a 1.250 pesos.",
    );
    expect(phrase).not.toContain("También");
  });

  it("responde precio del primero y el conteo si hay varios", () => {
    expect(
      buildProductsVoiceAnnouncement({
        query: "vaso 14 oz",
        totalCount: 1,
        products: [vaso],
        intent: "price",
      }),
    ).toBe("Vaso 14 oz sale a 1.250 pesos.");
    expect(
      buildProductsVoiceAnnouncement({
        query: "vaso",
        totalCount: 8,
        products: [vaso, bandeja],
        intent: "price",
      }),
    ).toBe("Vaso 14 oz sale a 1.250 pesos. Encontré 8 productos.");
  });

  it("responde stock, incluido sin saldo o en cero", () => {
    expect(
      buildProductsVoiceAnnouncement({
        query: "bandeja 7",
        totalCount: 1,
        products: [bandeja],
        intent: "stock",
      }),
    ).toMatch(/^Bandeja #7 tiene /);
    expect(
      buildProductsVoiceAnnouncement({
        query: "tapa",
        totalCount: 1,
        products: [tapa],
        intent: "stock",
      }),
    ).toBe("Tapa 9, 10, 12 no tiene stock.");
    expect(
      buildProductsVoiceAnnouncement({
        query: "vaso",
        totalCount: 1,
        products: [{ ...vaso, stock_quantity: null }],
        intent: "stock",
      }),
    ).toBe("Vaso 14 oz sin saldo cargado.");
  });
});
