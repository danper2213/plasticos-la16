"use client";

import { getSearchHighlightSegments } from "@/lib/searchEngine";
import { cn } from "@/lib/utils";

type HighlightedTextProps = {
  text: string;
  query: string;
  className?: string;
  highlightClassName?: string;
};

export function HighlightedText({
  text,
  query,
  className,
  highlightClassName,
}: HighlightedTextProps) {
  const segments = getSearchHighlightSegments(text, query);

  if (segments.length === 1 && !segments[0]?.highlight) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.highlight ? (
          <mark
            key={`${index}-${segment.value}`}
            className={cn(
              "rounded-sm bg-primary/20 font-semibold text-inherit dark:bg-primary/25",
              highlightClassName,
            )}
          >
            {segment.value}
          </mark>
        ) : (
          <span key={`${index}-${segment.value}`}>{segment.value}</span>
        ),
      )}
    </span>
  );
}
