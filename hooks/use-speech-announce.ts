"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyNaturalSpeechSettings,
  pickBestSpanishVoice,
  softenTextForSpeech,
  utteranceLangForVoice,
} from "@/lib/speech-voice";

function pickSpanishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  return pickBestSpanishVoice(window.speechSynthesis.getVoices());
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
      const utterance = new SpeechSynthesisUtterance(softenTextForSpeech(phrase));
      const voice = pickSpanishVoice();
      if (voice) utterance.voice = voice;
      utterance.lang = utteranceLangForVoice(voice);
      applyNaturalSpeechSettings(utterance);

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
