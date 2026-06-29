"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type SearchBarTypewriterPlaceholderProps = {
  terms: readonly string[];
  prefix?: string;
  suffix?: string;
  className?: string;
  termClassName?: string;
};

export function SearchBarTypewriterPlaceholder({
  terms,
  prefix = "Buscar: ",
  suffix = "…",
  className,
  termClassName,
}: SearchBarTypewriterPlaceholderProps) {
  const filtered = terms.map((term) => term.trim()).filter(Boolean);
  const list = filtered.length > 0 ? filtered : [""];
  const reduceMotion = useReducedMotion();

  const [termIndex, setTermIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentTerm = list[termIndex % list.length] ?? list[0];

  useEffect(() => {
    if (reduceMotion || list.length <= 1) return;

    const atFullWord = charIndex === currentTerm.length && !isDeleting;
    const atEmpty = charIndex === 0 && isDeleting;

    let delay = isDeleting ? 38 : 62;
    if (atFullWord) delay = 2000;
    if (atEmpty) delay = 480;

    const timeout = window.setTimeout(() => {
      if (atFullWord) {
        setIsDeleting(true);
        return;
      }
      if (atEmpty) {
        setIsDeleting(false);
        setTermIndex((prev) => (prev + 1) % list.length);
        return;
      }
      setCharIndex((prev) => (isDeleting ? prev - 1 : prev + 1));
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [charIndex, isDeleting, currentTerm, list.length, reduceMotion, termIndex]);

  const displayed = reduceMotion ? list[0] : currentTerm.slice(0, charIndex);

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-0 truncate", className)}>
      <span className="shrink-0">{prefix}</span>
      <span className={cn("truncate font-medium", termClassName)}>{displayed}</span>
      {!reduceMotion ? (
        <span
          className="ml-px inline-block w-[2px] shrink-0 animate-pulse bg-primary/80"
          style={{ height: "1em" }}
          aria-hidden
        />
      ) : null}
      <span className="shrink-0">{suffix}</span>
    </span>
  );
}
