import { describe, expect, it } from "vitest";
import { normalizeVoiceQuery, parseVoiceProductRequest } from "./products-voice-query";

describe("normalizeVoiceQuery", () => {
  it("pasa catorce onzas a 14 oz y quita muletillas", () => {
    expect(normalizeVoiceQuery("buscame el vaso catorce onzas por favor")).toBe(
      "vaso 14 oz",
    );
  });

  it("convierte números hablados y onza", () => {
    expect(normalizeVoiceQuery("vaso siete oz")).toBe("vaso 7 oz");
    expect(normalizeVoiceQuery("vaso de siete onzas")).toBe("vaso de 7 oz");
  });

  it("acepta tres y medio onzas", () => {
    expect(normalizeVoiceQuery("vaso tres y medio onzas")).toBe("vaso 3.5 oz");
  });

  it("deja códigos y nombres cortos", () => {
    expect(normalizeVoiceQuery("j1")).toBe("j1");
    expect(normalizeVoiceQuery("portacomida")).toBe("portacomida");
  });

  it("devuelve vacío si solo hay muletillas", () => {
    expect(normalizeVoiceQuery("buscame por favor")).toBe("");
  });
});

describe("parseVoiceProductRequest", () => {
  it("detecta precio y deja el producto", () => {
    expect(parseVoiceProductRequest("¿Cuánto sale el vaso 7 oz?")).toEqual({
      intent: "price",
      query: "vaso 7 oz",
    });
    expect(parseVoiceProductRequest("a cómo está el vaso catorce onzas")).toEqual({
      intent: "price",
      query: "vaso 14 oz",
    });
    expect(parseVoiceProductRequest("precio de bandeja 7")).toEqual({
      intent: "price",
      query: "bandeja 7",
    });
  });

  it("detecta stock y deja el producto", () => {
    expect(parseVoiceProductRequest("¿Hay stock de bandeja 7?")).toEqual({
      intent: "stock",
      query: "bandeja 7",
    });
    expect(parseVoiceProductRequest("cuánto hay de vaso 14 oz")).toEqual({
      intent: "stock",
      query: "vaso 14 oz",
    });
    expect(parseVoiceProductRequest("tenemos vaso siete onzas")).toEqual({
      intent: "stock",
      query: "vaso 7 oz",
    });
  });

  it("una búsqueda suelta sigue siendo search", () => {
    expect(parseVoiceProductRequest("vaso 7 oz")).toEqual({
      intent: "search",
      query: "vaso 7 oz",
    });
    expect(parseVoiceProductRequest("buscame el vaso catorce onzas por favor")).toEqual({
      intent: "search",
      query: "vaso 14 oz",
    });
  });
});


describe("normalizeVoiceQuery", () => {
  it("pasa catorce onzas a 14 oz y quita muletillas", () => {
    expect(normalizeVoiceQuery("buscame el vaso catorce onzas por favor")).toBe(
      "vaso 14 oz",
    );
  });

  it("convierte números hablados y onza", () => {
    expect(normalizeVoiceQuery("vaso siete oz")).toBe("vaso 7 oz");
    expect(normalizeVoiceQuery("vaso de siete onzas")).toBe("vaso de 7 oz");
  });

  it("acepta tres y medio onzas", () => {
    expect(normalizeVoiceQuery("vaso tres y medio onzas")).toBe("vaso 3.5 oz");
  });

  it("deja códigos y nombres cortos", () => {
    expect(normalizeVoiceQuery("j1")).toBe("j1");
    expect(normalizeVoiceQuery("portacomida")).toBe("portacomida");
  });

  it("devuelve vacío si solo hay muletillas", () => {
    expect(normalizeVoiceQuery("buscame por favor")).toBe("");
  });
});
