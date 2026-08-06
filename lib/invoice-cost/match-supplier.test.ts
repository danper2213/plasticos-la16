import { describe, expect, it } from "vitest";
import { matchSupplierByName } from "./match-supplier";

const suppliers = [
  { id: "1", name: "Calypso Empaques S.A.S." },
  { id: "2", name: "Plásticos del Norte" },
];

describe("matchSupplierByName", () => {
  it("match exacto/fuzzy por nombre", () => {
    expect(matchSupplierByName("CALYPSO EMPAQUES SAS", suppliers)?.id).toBe(
      "1",
    );
  });

  it("null si no hay coincidencia", () => {
    expect(matchSupplierByName("Otro proveedor XYZ", suppliers)).toBeNull();
  });
});
