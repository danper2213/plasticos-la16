"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DashboardStickySearchProps = {
  visible: boolean;
  children: ReactNode;
};

export function DashboardStickySearch({ visible, children }: DashboardStickySearchProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 top-14 z-20 border-b border-border/70 bg-background/95 px-4 py-2.5 shadow-md backdrop-blur-md transition-all duration-300 motion-reduce:transition-none lg:px-6",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-full opacity-0",
      )}
      aria-hidden={!visible}
    >
      {children}
    </div>
  );
}
