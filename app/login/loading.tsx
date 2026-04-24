function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/70 ${className}`} />;
}

export default function LoginLoading() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-background" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,hsl(var(--primary)/0.15),transparent_55%)] dark:bg-[radial-gradient(ellipse_100%_60%_at_50%_-10%,hsl(217_91%_59%/0.12),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent,hsl(var(--background))_85%)]" />

      <div className="relative z-10 w-full max-w-sm space-y-8">
        <Skeleton className="h-5 w-36 rounded-md" />

        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-14 w-36 rounded-xl" />
          <Skeleton className="h-5 w-52 rounded-md" />
          <Skeleton className="h-4 w-44 rounded-md" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/80 p-6 shadow-2xl backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/60">
          <div className="mb-6 flex gap-3 border-b border-border/60 pb-5 dark:border-zinc-800/60">
            <Skeleton className="size-11 shrink-0 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2 pt-0.5">
              <Skeleton className="h-6 w-32 rounded-md" />
              <Skeleton className="h-4 w-full max-w-[220px] rounded-md" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
