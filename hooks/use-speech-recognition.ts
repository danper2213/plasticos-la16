"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechRecognitionStatus = "idle" | "listening" | "unsupported";

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0?: { transcript?: string };
  }>;
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function collectTranscript(event: SpeechRecognitionResultEvent): {
  interim: string;
  finalText: string;
} {
  let interim = "";
  let finalText = "";
  for (let i = 0; i < event.results.length; i += 1) {
    const result = event.results[i];
    const piece = result?.[0]?.transcript ?? "";
    if (!piece) continue;
    if (result.isFinal) finalText += piece;
    else interim += piece;
  }
  return { interim, finalText };
}

type UseSpeechRecognitionOptions = {
  lang?: string;
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (message: string) => void;
};

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const { lang = "es-CO", onInterim, onFinal, onError } = options;
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalBufferRef = useRef("");
  const skipEndRef = useRef(false);

  const onInterimRef = useRef(onInterim);
  const onFinalRef = useRef(onFinal);
  const onErrorRef = useRef(onError);
  onInterimRef.current = onInterim;
  onFinalRef.current = onFinal;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!getSpeechRecognitionCtor()) {
      setStatus("unsupported");
    }
    return () => {
      skipEndRef.current = true;
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const abort = useCallback(() => {
    skipEndRef.current = true;
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    finalBufferRef.current = "";
    setStatus((prev) => (prev === "unsupported" ? prev : "idle"));
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setStatus("unsupported");
      return;
    }

    skipEndRef.current = false;
    finalBufferRef.current = "";

    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setStatus("listening");
    };

    recognition.onresult = (event) => {
      const { interim, finalText } = collectTranscript(event);
      if (finalText.trim()) finalBufferRef.current = finalText.trim();
      const live = (finalText || interim).trim();
      if (live) onInterimRef.current?.(live);
    };

    recognition.onerror = (event) => {
      const code = event.error ?? "";
      if (code === "no-speech" || code === "aborted") return;
      if (code === "not-allowed" || code === "service-not-allowed") {
        onErrorRef.current?.("No hay permiso de micrófono");
        return;
      }
      onErrorRef.current?.("No se pudo escuchar. Probá de nuevo.");
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setStatus((prev) => (prev === "unsupported" ? prev : "idle"));
      if (skipEndRef.current) {
        skipEndRef.current = false;
        return;
      }
      const text = finalBufferRef.current.trim();
      finalBufferRef.current = "";
      if (text) onFinalRef.current?.(text);
    };

    try {
      recognition.start();
    } catch {
      setStatus("idle");
      onErrorRef.current?.("No se pudo iniciar el micrófono.");
    }
  }, [lang]);

  const toggle = useCallback(() => {
    if (status === "listening") {
      stop();
      return;
    }
    if (status === "unsupported") return;
    start();
  }, [start, status, stop]);

  return {
    status,
    supported: status !== "unsupported",
    start,
    stop,
    abort,
    toggle,
  };
}
