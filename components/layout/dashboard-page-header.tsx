import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface DashboardPageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon: LucideIcon;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function DashboardPageHeader({
  title,
  description,
  icon: Icon,
  badge,
  actions,
  footer,
  className,
}: DashboardPageHeaderProps) {
  const titleNode =
    typeof title === "string" ? (
      <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-zinc-50 sm:text-4xl">
        {title}
      </h1>
    ) : (
      title
    );

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.35rem] border shadow-[0_12px_40px_-18px_rgba(15,23,42,0.14)]",
        "border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-sky-50/50",
        "dark:border-zinc-800 dark:bg-gradient-to-br dark:from-zinc-950 dark:via-zinc-950 dark:to-blue-950/20 dark:shadow-[0_20px_50px_-24px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -left-20 top-0 size-56 rounded-full bg-sky-400/15 blur-3xl dark:bg-blue-500/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 -bottom-20 size-64 rounded-full bg-primary/[0.08] blur-3xl dark:bg-violet-500/10"
        aria-hidden
      />
      <div className="relative flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-4 min-w-0">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-sky-500/10 text-primary shadow-md shadow-sky-500/10 ring-1 ring-primary/15 dark:from-blue-500/30 dark:to-blue-600/10 dark:text-blue-300 dark:shadow-blue-500/10 dark:ring-blue-500/25">
            <Icon className="size-7" aria-hidden />
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2 [&_h1]:text-slate-900 [&_h1]:dark:text-zinc-50">
              {titleNode}
              {badge}
            </div>
            {description ? (
              <div className="max-w-xl text-sm leading-relaxed text-slate-600 dark:text-zinc-400 [&_strong]:font-semibold [&_strong]:text-slate-800 dark:[&_strong]:text-zinc-200">
                {description}
              </div>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">{actions}</div>
        ) : null}
      </div>
      {footer ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 bg-gradient-to-r from-slate-100/70 via-white/80 to-transparent px-5 py-3.5 sm:px-7 dark:border-border/50 dark:from-zinc-900/70 dark:via-zinc-900/40 dark:to-transparent">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
