import { describe, expect, it } from "vitest";
import {
  expandSearchTermVariants,
  normalizeText,
  searchIntelligent,
  tokenize,
  type Product,
} from "@/lib/searchEngine";

function product(name: string, id = name): Product {
  return {
    id,
    name,
    sku: "",
    category: "Empaques",
    price: 1,
  };
}

describe("normalizeText medidas de largo", () => {
  it("compacta x300m con o sin espacios", () => {
    expect(normalizeText("x300m")).toBe("x300m");
    expect(normalizeText("x 300 m")).toBe("x300m");
    expect(normalizeText("x300 m")).toBe("x300m");
    expect(normalizeText("x 300m")).toBe("x300m");
    expect(normalizeText("Film stretch x 300 m")).toBe("film stretch x300m");
  });
});

describe("tokenize medidas de largo", () => {
  it("unifica la consulta a un token compacto", () => {
    expect(tokenize("x300m")).toEqual(["x300m"]);
    expect(tokenize("x 300 m")).toEqual(["x300m"]);
    expect(tokenize("300 m")).toEqual(["300m"]);
  });
});

describe("expandSearchTermVariants", () => {
  it("expande x300m a las formas con espacios", () => {
    expect(expandSearchTermVariants("x300m")).toEqual(
      expect.arrayContaining(["x300m", "x 300 m", "x300 m", "x 300m"]),
    );
  });
});

describe("searchIntelligent x300m", () => {
  const catalog = [
    product("Film stretch x300m", "compact"),
    product("Film stretch x 300 m", "spaced"),
    product("Vaso 12 oz", "vaso"),
  ];

  it.each(["x300m", "x 300 m", "x300 m", "x 300m", "300m", "300 m"])(
    "encuentra ambas presentaciones con %s",
    (query) => {
      expect(searchIntelligent(query, catalog).map((row) => row.id).sort()).toEqual(
        ["compact", "spaced"].sort(),
      );
    },
  );

  it("sigue encontrando onzas compactas o con espacio", () => {
    expect(searchIntelligent("12oz", catalog).map((row) => row.id)).toEqual(["vaso"]);
    expect(searchIntelligent("12 oz", catalog).map((row) => row.id)).toEqual(["vaso"]);
  });
});
