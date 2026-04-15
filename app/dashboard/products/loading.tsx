function S({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/70 ${className}`} />;
}

export default function ProductsLoading() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap gap-3">
          <S className="h-9 w-72 rounded-lg" />
          <S className="h-9 w-40 rounded-lg" />
          <S className="h-9 w-32 rounded-lg" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <S key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </section>
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <S key={i} className="h-12 w-full rounded-xl" />
        ))}
      </section>
    </div>
  );
}
