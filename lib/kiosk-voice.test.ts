import { describe, expect, it } from "vitest";
import {
  buildKioskDisambiguationPrompt,
  buildKioskPriceSpeech,
  resolveKioskVoiceChoice,
} from "./kiosk-voice";

const a = {
  id: "1",
  name: "Strech 15 cm",
  supplier_name: "Calypso",
  presentation: "Rollo",
  packaging: "Unidad",
};
const b = {
  id: "2",
  name: "Strech 15 cm",
  supplier_name: "Lastra",
  presentation: "Rollo",
  packaging: "Unidad",
};

describe("buildKioskDisambiguationPrompt", () => {
  it("lista opciones con proveedor", () => {
    const phrase = buildKioskDisambiguationPrompt([a, b]);
    expect(phrase).toContain("2 productos parecidos");
    expect(phrase).toContain("Opción 1");
    expect(phrase).toContain("Calypso");
    expect(phrase).toContain("Opción 2");
    expect(phrase).toContain("Lastra");
    expect(phrase).toContain("¿Cuál te sirve?");
  });
});

describe("resolveKioskVoiceChoice", () => {
  it("elige por número", () => {
    expect(resolveKioskVoiceChoice("opción dos", [a, b])?.id).toBe("2");
    expect(resolveKioskVoiceChoice("1", [a, b])?.id).toBe("1");
    expect(resolveKioskVoiceChoice("el primero", [a, b])?.id).toBe("1");
  });

  it("elige por proveedor", () => {
    expect(resolveKioskVoiceChoice("el de lastra", [a, b])?.id).toBe("2");
    expect(resolveKioskVoiceChoice("calypso", [a, b])?.id).toBe("1");
  });

  it("null si no entiende", () => {
    expect(resolveKioskVoiceChoice("no sé", [a, b])).toBeNull();
  });
});

describe("buildKioskPriceSpeech", () => {
  it("anuncia precio de forma natural", () => {
    expect(buildKioskPriceSpeech("Strech 15 cm", 2500)).toBe(
      "El precio de Strech 15 centímetros es de 2500 pesos.",
    );
  });
});
