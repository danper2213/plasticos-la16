function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-800/80 ${className}`} />;
}

export default function PublicLoading() {
  return (
    <div className="relative min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-6">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <header className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-8 w-40 rounded-lg" />
            <div className="hidden items-center gap-3 md:flex">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </header>

        <section className="space-y-5 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
          <Skeleton className="h-10 w-56 rounded-lg" />
          <Skeleton className="h-6 w-80 max-w-full rounded-lg" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </section>
      </div>
    </div>
  );
}
