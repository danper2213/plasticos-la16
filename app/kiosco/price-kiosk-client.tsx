"use client";

import * as React from "react";
import Image from "next/image";
import { ScanLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BUSINESS_NAME } from "@/lib/business-location";
import { PRODUCTS_LIST_SALE_UTILITY_PERCENT } from "@/lib/products-voice-announce";
import { unitPriceFromCostAndUtilityPercent } from "@/lib/quotes/pricing";
import {
  getProductByScanCode,
  type ProductWithRelations,
} from "@/app/dashboard/products/actions";
import { KIOSK_SCREENSAVER_IDLE_MS } from "@/app/kiosco/kiosk-banners";
import { KioskScreensaver } from "@/app/kiosco/kiosk-screensaver";
import { cn } from "@/lib/utils";

/** Tras dejar de escribir (lector o teclado), busca sin Enter. */
const SCAN_DEBOUNCE_MS = 320;
/** Evita búsquedas con 1–2 caracteres sueltos. */
const MIN_CHARS_AUTO_SEARCH = 3;
/** Vuelve a la espera tras un producto encontrado. */
const SUCCESS_RESET_MS = 7000;
/** Vuelve a la espera si el código no está registrado. */
const NOT_FOUND_RESET_MS = 4000;

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function isBlockedBrowserShortcut(event: KeyboardEvent): boolean {
  const key = event.key;
  if (key === "F12") return true;

  const ctrlOrMeta = event.ctrlKey || event.metaKey;
  const lower = key.toLowerCase();
  if (ctrlOrMeta && lower === "u") return true;
  if (ctrlOrMeta && event.shiftKey && (lower === "i" || lower === "j" || lower === "c")) {
    return true;
  }
  return false;
}

function salesUnit(product: ProductWithRelations): string | null {
  const presentation = product.presentation?.trim() || null;
  const packaging = product.packaging?.trim() || null;
  if (presentation && packaging && packaging !== presentation) {
    return `${presentation} · ${packaging}`;
  }
  return presentation ?? packaging;
}

function toPositivePrice(value: unknown): number | null {
  if (value == null || value === "") return null;
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount);
}

/**
 * Precio al público del kiosco.
 * `selling_price` es la columna guardada, pero en el catálogo suele quedar en 0;
 * el precio que sí se muestra al personal es costo + 25% (misma regla de la lista).
 */
function resolveKioskSalePrice(product: ProductWithRelations): number | null {
  const stored = toPositivePrice(product.selling_price);
  if (stored != null) return stored;
  return toPositivePrice(
    unitPriceFromCostAndUtilityPercent(
      Number(product.cost) || 0,
      PRODUCTS_LIST_SALE_UTILITY_PERCENT,
    ),
  );
}

let kioskAudioCtx: AudioContext | null = null;

function getKioskAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!kioskAudioCtx) kioskAudioCtx = new AudioCtx();
  return kioskAudioCtx;
}

function unlockKioskAudio() {
  const ctx = getKioskAudioContext();
  if (ctx?.state === "suspended") void ctx.resume();
  primeSpeechSynthesis();
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  durationSec: number,
  delaySec = 0,
  volume = 0.12,
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  oscillator.connect(gain);
  gain.connect(ctx.destination);

  const start = ctx.currentTime + delaySec;
  const end = start + durationSec;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

function playScanSuccess() {
  const ctx = getKioskAudioContext();
  if (!ctx) return;
  void ctx.resume().then(() => {
    playTone(ctx, 880, 0.12, 0, 0.14);
  });
}

function playScanNotFound() {
  const ctx = getKioskAudioContext();
  if (!ctx) return;
  void ctx.resume().then(() => {
    playTone(ctx, 220, 0.16, 0, 0.16);
    playTone(ctx, 165, 0.22, 0.2, 0.16);
  });
}

let speechPrimed = false;
let speakTimeoutId: number | null = null;
let voicesChangedHandler: (() => void) | null = null;

function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  return window.speechSynthesis;
}

function pickSpanishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const norm = (voice: SpeechSynthesisVoice) => voice.lang.replace("_", "-").toLowerCase();
  return (
    voices.find((voice) => norm(voice) === "es-co" || norm(voice).startsWith("es-co")) ??
    voices.find((voice) => norm(voice) === "es-es" || norm(voice).startsWith("es-es")) ??
    voices.find((voice) => norm(voice).startsWith("es")) ??
    null
  );
}

function utteranceLangForVoice(voice: SpeechSynthesisVoice | null): "es-CO" | "es-ES" {
  if (!voice) return "es-CO";
  const lang = voice.lang.replace("_", "-");
  if (/^es-CO/i.test(lang)) return "es-CO";
  return "es-ES";
}

function cancelKioskSpeech() {
  if (speakTimeoutId != null) {
    window.clearTimeout(speakTimeoutId);
    speakTimeoutId = null;
  }
  const synth = getSpeechSynthesis();
  if (synth && voicesChangedHandler) {
    synth.removeEventListener("voiceschanged", voicesChangedHandler);
    voicesChangedHandler = null;
  }
  synth?.cancel();
}

function primeSpeechSynthesis() {
  const synth = getSpeechSynthesis();
  if (!synth || speechPrimed) return;
  speechPrimed = true;
  synth.getVoices();
  const prime = new SpeechSynthesisUtterance(" ");
  prime.volume = 0;
  prime.rate = 1;
  prime.lang = "es-CO";
  synth.speak(prime);
}

function speakKioskMessage(text: string) {
  const synth = getSpeechSynthesis();
  const phrase = text.trim();
  if (!synth || !phrase) return;

  cancelKioskSpeech();

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    speakTimeoutId = null;
    if (voicesChangedHandler) {
      synth.removeEventListener("voiceschanged", voicesChangedHandler);
      voicesChangedHandler = null;
    }

    const voices = synth.getVoices();
    const voice = pickSpanishVoice(voices);
    const utterance = new SpeechSynthesisUtterance(phrase);
    if (voice) utterance.voice = voice;
    utterance.lang = utteranceLangForVoice(voice);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    synth.speak(utterance);
  };

  if (synth.getVoices().length === 0) {
    voicesChangedHandler = start;
    synth.addEventListener("voiceschanged", start);
    speakTimeoutId = window.setTimeout(start, 300);
    return;
  }

  speakTimeoutId = window.setTimeout(start, 50);
}

function kioskResultSpeech(product: ProductWithRelations | null, missing: boolean): string | null {
  if (missing) return "Producto no encontrado";
  if (!product) return null;
  const name = product.name.trim() || "Producto";
  const price = resolveKioskSalePrice(product);
  if (price == null) return `${name}, consultar precio en caja`;
  return `${name}, ${price.toLocaleString("es-CO")} pesos`;
}

export function PriceKioskClient() {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const resultResetTimeoutRef = React.useRef<number | null>(null);
  const screensaverTimerRef = React.useRef<number | null>(null);
  const loadingRef = React.useRef(false);
  const pendingCodeRef = React.useRef<string | null>(null);
  const scanBufferRef = React.useRef("");
  const isIdleRef = React.useRef(false);
  const showingResultRef = React.useRef(false);

  const [value, setValue] = React.useState("");
  const [product, setProduct] = React.useState<ProductWithRelations | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [resultNonce, setResultNonce] = React.useState(0);
  const [isIdle, setIsIdle] = React.useState(false);

  const focusInput = React.useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const clearResultResetTimeout = React.useCallback(() => {
    if (resultResetTimeoutRef.current == null) return;
    window.clearTimeout(resultResetTimeoutRef.current);
    resultResetTimeoutRef.current = null;
  }, []);

  const clearScreensaverTimer = React.useCallback(() => {
    if (screensaverTimerRef.current == null) return;
    window.clearTimeout(screensaverTimerRef.current);
    screensaverTimerRef.current = null;
  }, []);

  const scheduleScreensaver = React.useCallback(() => {
    clearScreensaverTimer();
    if (showingResultRef.current || loadingRef.current || isIdleRef.current) return;
    screensaverTimerRef.current = window.setTimeout(() => {
      screensaverTimerRef.current = null;
      if (showingResultRef.current || loadingRef.current) return;
      scanBufferRef.current = "";
      setValue("");
      isIdleRef.current = true;
      setIsIdle(true);
    }, KIOSK_SCREENSAVER_IDLE_MS);
  }, [clearScreensaverTimer]);

  const dismissScreensaver = React.useCallback(
    (opts?: { restartTimer?: boolean }) => {
      if (isIdleRef.current) {
        isIdleRef.current = false;
        setIsIdle(false);
      }
      focusInput();
      if (opts?.restartTimer !== false) scheduleScreensaver();
    },
    [focusInput, scheduleScreensaver],
  );

  const scheduleIdleReset = React.useCallback(
    (delayMs: number) => {
      clearResultResetTimeout();
      clearScreensaverTimer();
      resultResetTimeoutRef.current = window.setTimeout(() => {
        resultResetTimeoutRef.current = null;
        cancelKioskSpeech();
        setProduct(null);
        setNotFound(false);
        setValue("");
        scanBufferRef.current = "";
        focusInput();
        isIdleRef.current = false;
        setIsIdle(false);
        scheduleScreensaver();
      }, delayMs);
    },
    [clearResultResetTimeout, clearScreensaverTimer, focusInput, scheduleScreensaver],
  );

  const beginNewScanInput = React.useCallback(() => {
    clearResultResetTimeout();
    cancelKioskSpeech();
    dismissScreensaver({ restartTimer: false });
    focusInput();
  }, [clearResultResetTimeout, dismissScreensaver, focusInput]);

  React.useEffect(() => {
    focusInput();
  }, [focusInput, product, notFound, loading, isIdle]);

  React.useEffect(() => {
    const synth = getSpeechSynthesis();
    if (!synth) return undefined;
    synth.getVoices();
    const warmVoices = () => {
      synth.getVoices();
    };
    synth.addEventListener("voiceschanged", warmVoices);
    return () => synth.removeEventListener("voiceschanged", warmVoices);
  }, []);

  const resolveScan = React.useCallback(
    async (raw: string) => {
      const code = raw.trim();
      if (!code) {
        focusInput();
        return;
      }

      if (loadingRef.current) {
        pendingCodeRef.current = code;
        return;
      }

      unlockKioskAudio();
      clearResultResetTimeout();
      cancelKioskSpeech();
      dismissScreensaver({ restartTimer: false });
      loadingRef.current = true;
      setLoading(true);
      setValue("");
      scanBufferRef.current = "";

      try {
        const row = await getProductByScanCode(code);
        setResultNonce((n) => n + 1);
        if (row) {
          setProduct(row);
          setNotFound(false);
          playScanSuccess();
          scheduleIdleReset(SUCCESS_RESET_MS);
        } else {
          setProduct(null);
          setNotFound(true);
          playScanNotFound();
          scheduleIdleReset(NOT_FOUND_RESET_MS);
        }
      } finally {
        loadingRef.current = false;
        setLoading(false);
        focusInput();
        const pending = pendingCodeRef.current;
        pendingCodeRef.current = null;
        if (pending) void resolveScan(pending);
      }
    },
    [clearResultResetTimeout, dismissScreensaver, focusInput, scheduleIdleReset],
  );

  React.useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < MIN_CHARS_AUTO_SEARCH) return undefined;
    const id = window.setTimeout(() => {
      const latest = (inputRef.current?.value ?? scanBufferRef.current).trim();
      if (latest.length < MIN_CHARS_AUTO_SEARCH) return;
      void resolveScan(latest);
    }, SCAN_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [value, resolveScan]);

  React.useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      unlockKioskAudio();
      if (isBlockedBrowserShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const fromInput = event.target === inputRef.current;
      const isPrintable =
        event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

      if (event.key === "Enter") {
        if (isIdleRef.current) dismissScreensaver({ restartTimer: false });
        if (fromInput) return;
        event.preventDefault();
        const code = scanBufferRef.current.trim();
        if (code) void resolveScan(code);
        return;
      }

      if (!isPrintable) {
        if (!showingResultRef.current && !loadingRef.current) scheduleScreensaver();
        return;
      }

      beginNewScanInput();
      if (!showingResultRef.current && !loadingRef.current) scheduleScreensaver();
      if (fromInput) return;

      event.preventDefault();
      const next = `${scanBufferRef.current}${event.key}`;
      scanBufferRef.current = next;
      setValue(next);
    };

    const onPointerActivity = () => {
      unlockKioskAudio();
      if (isIdleRef.current) {
        dismissScreensaver();
        return;
      }
      if (!showingResultRef.current && !loadingRef.current) scheduleScreensaver();
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("mousemove", onPointerActivity);
    document.addEventListener("touchstart", onPointerActivity, { passive: true });
    document.addEventListener("pointerdown", unlockKioskAudio);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("mousemove", onPointerActivity);
      document.removeEventListener("touchstart", onPointerActivity);
      document.removeEventListener("pointerdown", unlockKioskAudio);
    };
  }, [beginNewScanInput, dismissScreensaver, resolveScan, scheduleScreensaver]);

  React.useEffect(() => {
    if (product) {
      const phrase = kioskResultSpeech(product, false);
      if (phrase) speakKioskMessage(phrase);
      return;
    }
    if (notFound) {
      speakKioskMessage("Producto no encontrado");
      return;
    }
    cancelKioskSpeech();
  }, [product, notFound, resultNonce]);

  React.useEffect(() => {
    return () => {
      clearResultResetTimeout();
      clearScreensaverTimer();
      cancelKioskSpeech();
    };
  }, [clearResultResetTimeout, clearScreensaverTimer]);

  const showingResult = Boolean(product || notFound);
  showingResultRef.current = showingResult;

  React.useEffect(() => {
    if (showingResult || loading) {
      clearScreensaverTimer();
      if (isIdleRef.current) {
        isIdleRef.current = false;
        setIsIdle(false);
      }
      return undefined;
    }
    scheduleScreensaver();
    return undefined;
  }, [showingResult, loading, clearScreensaverTimer, scheduleScreensaver]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void resolveScan(value || scanBufferRef.current);
  }

  function onScanKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    void resolveScan(e.currentTarget.value || scanBufferRef.current);
  }

  const unit = product ? salesUnit(product) : null;
  const salePrice = product ? resolveKioskSalePrice(product) : null;
  const captureHidden = showingResult || isIdle;
  return (
    <div
      className="flex min-h-screen select-none items-center justify-center bg-background p-4 sm:p-8"
      onClick={() => {
        unlockKioskAudio();
        focusInput();
      }}
    >
      <KioskScreensaver active={isIdle} onDismiss={() => dismissScreensaver()} />
      <div className="flex w-full max-w-3xl flex-col items-center">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image
            src="/logo.png"
            alt={BUSINESS_NAME}
            width={200}
            height={80}
            priority
            className="h-16 w-auto object-contain sm:h-20"
          />
          <p className="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            {BUSINESS_NAME}
          </p>
        </div>

        {product ? (
          <article className="w-full overflow-hidden rounded-3xl border border-border bg-card px-6 py-10 text-center shadow-xl sm:px-12 sm:py-12">
            <h2 className="text-2xl font-bold leading-snug text-foreground">
              {product.name}
            </h2>
            {salePrice == null ? (
              <p className="mt-6 text-3xl font-black tracking-tight text-amber-400 sm:text-4xl">
                Consultar precio en caja
              </p>
            ) : (
              <p className="mt-6 text-6xl font-black tabular-nums tracking-tight text-emerald-400">
                {copFormatter.format(salePrice)}
              </p>
            )}
            {unit ? (
              <p className="mt-4 text-lg font-medium text-muted-foreground sm:text-xl">
                {unit}
              </p>
            ) : null}
            <div
              className="mt-10 h-1.5 w-full overflow-hidden rounded-full bg-muted"
              aria-hidden
            >
              <div
                key={resultNonce}
                className="kiosk-countdown-bar h-full rounded-full bg-emerald-400"
                style={{ animationDuration: `${SUCCESS_RESET_MS}ms` }}
              />
            </div>
          </article>
        ) : null}

        {notFound ? (
          <article className="w-full rounded-3xl border border-border bg-card px-6 py-12 text-center shadow-xl sm:px-12">
            <p className="text-2xl font-bold leading-snug text-foreground">
              Producto no registrado. Consulta con nuestro personal.
            </p>
          </article>
        ) : null}

        <section
          className={cn(
            "w-full",
            showingResult
              ? "relative"
              : "rounded-3xl border border-border bg-card/90 px-6 py-10 text-center shadow-xl sm:px-12 sm:py-14",
          )}
        >
          <div className={cn(showingResult && "hidden")}>
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-primary sm:size-20">
              <ScanLine className="size-9 sm:size-11" aria-hidden />
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
              Consulta de Precios
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground sm:text-2xl">
              Acerca el código de barras del producto al lector
            </p>
            {loading ? (
              <p className="mt-8 text-base font-medium text-muted-foreground sm:text-lg">
                Consultando…
              </p>
            ) : null}
          </div>
          <form
            onSubmit={onSubmit}
            className={cn(
              captureHidden
                ? "pointer-events-none fixed left-0 top-0 z-50 h-px w-px overflow-visible opacity-0"
                : "mt-8",
            )}
          >
            <label className="sr-only" htmlFor="kiosk-scan-input">
              Código de barras
            </label>
            <Input
              id="kiosk-scan-input"
              ref={inputRef}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="none"
              placeholder="Esperando escaneo..."
              value={value}
              onChange={(e) => {
                beginNewScanInput();
                scanBufferRef.current = e.target.value;
                setValue(e.target.value);
                if (!showingResultRef.current && !loadingRef.current) {
                  scheduleScreensaver();
                }
              }}
              onKeyDown={onScanKeyDown}
              onBlur={() => inputRef.current?.focus()}
              className="h-16 rounded-2xl border-dashed text-center text-xl font-medium tracking-wide placeholder:text-muted-foreground/80 sm:h-20 sm:text-2xl"
            />
          </form>
        </section>
      </div>
    </div>
  );
}
