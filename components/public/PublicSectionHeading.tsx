"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function PublicSectionBar({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "w-1 shrink-0 rounded-full bg-gradient-to-b from-blue-400 via-blue-500 to-blue-700 shadow-[0_0_18px_rgba(59,130,246,0.5)]",
        className
      )}
      aria-hidden
      {...props}
    />
  );
}

type SectionHeadingSize = "default" | "compact";

interface PublicSectionHeadingProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  size?: SectionHeadingSize;
}

export function PublicSectionHeading({
  children,
  id,
  className,
  size = "default",
}: PublicSectionHeadingProps) {
  const titleClass =
    size === "compact"
      ? "text-xl font-bold uppercase tracking-wide text-white sm:text-2xl"
      : "text-2xl font-bold uppercase tracking-tight text-white sm:text-4xl md:text-5xl";

  const barClass =
    size === "compact"
      ? "mt-1.5 h-8 sm:h-9"
      : "mt-2 h-10 sm:mt-2.5 sm:h-12 md:h-14";

  return (
    <div className={cn("flex items-start gap-3 sm:gap-4", className)}>
      <PublicSectionBar className={barClass} />
      <h2 id={id} className={cn("min-w-0 uppercase leading-tight", titleClass)}>
        {children}
      </h2>
    </div>
  );
}
