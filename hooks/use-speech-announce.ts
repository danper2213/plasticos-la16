"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function pickSpanishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const preferred = ["es-CO", "es-MX", "es-US", "es-AR", "es-ES"];
  for (const lang of preferred) {
    const match = voices.find(
      (voice) => voice.lang.toLowerCase() === lang.toLowerCase(),
    );
    if (match) return match;
  }
  return voices.find((voice) => voice.lang.toLowerCase().startsWith("es")) ?? null;
}

export function useSpeechAnnounce() {
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const cancel = useCallback(() => {
    utteranceRef.current = null;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const preload = () => {
      void pickSpanishVoice();
    };
    preload();
    window.speechSynthesis.addEventListener("voiceschanged", preload);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", preload);
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      const phrase = text.trim();
      if (!phrase || typeof window === "undefined" || !window.speechSynthesis) {
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = "es-CO";
      utterance.rate = 1;
      const voice = pickSpanishVoice();
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        if (utteranceRef.current === utterance) {
          utteranceRef.current = null;
          setSpeaking(false);
        }
      };
      utterance.onerror = () => {
        if (utteranceRef.current === utterance) {
          utteranceRef.current = null;
          setSpeaking(false);
        }
      };

      utteranceRef.current = utterance;
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [],
  );

  return { speak, cancel, speaking };
}
