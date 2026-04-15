function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/70 ${className}`} />;
}

export default function AppLoading() {
  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
