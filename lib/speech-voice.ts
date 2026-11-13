/**
 * Elige la voz española menos robótica disponible en el navegador.
 * Prioriza neural/online (Edge/Chrome) y acentos latinoamericanos.
 */

function normLang(lang: string): string {
  return lang.replace("_", "-").toLowerCase();
}

function scoreSpanishVoice(voice: SpeechSynthesisVoice): number {
  const lang = normLang(voice.lang);
  if (!lang.startsWith("es")) return -1000;

  const name = voice.name.toLowerCase();
  let score = 0;

  if (lang.startsWith("es-co")) score += 45;
  else if (lang.startsWith("es-mx")) score += 40;
  else if (lang.startsWith("es-us")) score += 35;
  else if (
    lang.startsWith("es-ar") ||
    lang.startsWith("es-pe") ||
    lang.startsWith("es-cl") ||
    lang.startsWith("es-ve")
  ) {
    score += 28;
  } else if (lang.startsWith("es-es")) score += 12;
  else score += 8;

  // Voces neurales / en la nube (suelen sonar humanas)
  if (/neural|natural|online|premium|enhanced|wavenet|studio|generative|multilingual/i.test(name)) {
    score += 55;
  }
  if (/google/i.test(name)) score += 30;
  if (
    /sabina|dalia|elvira|paulina|paloma|catalina|xinia|esther|mónica|monica|esperanto|laura/i.test(
      name,
    )
  ) {
    score += 25;
  }

  // Desktop/compact = típico robot de Windows
  if (/desktop|compact|mobile|eloquence|espeak|microsoft server/i.test(name)) {
    score -= 45;
  }
  if (/helena/i.test(name) && !/online|neural/i.test(name)) score -= 25;

  // En Edge/Chrome, localService=false suele ser la voz en la nube
  if (!voice.localService) score += 18;
  else if (!/neural|natural|online/i.test(name)) score -= 12;

  if (voice.default) score += 3;

  return score;
}

export function pickBestSpanishVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const spanish = voices.filter((v) => normLang(v.lang).startsWith("es"));
  if (spanish.length === 0) return null;

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;
  for (const voice of spanish) {
    const score = scoreSpanishVoice(voice);
    if (score > bestScore) {
      bestScore = score;
      best = voice;
    }
  }
  return best;
}

export function utteranceLangForVoice(voice: SpeechSynthesisVoice | null): string {
  if (!voice) return "es-CO";
  const lang = voice.lang.replace("_", "-");
  if (/^es-/i.test(lang)) return lang;
  return "es-CO";
}

/** Ritmo más calmado; el rate alto se siente más “máquina”. */
export function applyNaturalSpeechSettings(utterance: SpeechSynthesisUtterance) {
  utterance.rate = 0.88;
  utterance.pitch = 0.96;
  utterance.volume = 1;
}

/** Suaviza abreviaturas y precios para que el TTS no suene tan cortado. */
export function softenTextForSpeech(text: string): string {
  return text
    .replace(/\bcm\b/gi, "centímetros")
    .replace(/\bmm\b/gi, "milímetros")
    .replace(/\bmt\b/gi, "metros")
    .replace(/\bund\b/gi, "unidad")
    .replace(/\bx\b/gi, " por ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sin separadores de miles: "2500" se lee mejor que "2.500". */
export function formatPesosForSpeech(pesos: number): string {
  const n = Math.round(pesos);
  if (!(n > 0)) return "";
  return `${n} pesos`;
}
