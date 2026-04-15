function S({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/70 ${className}`} />;
}

export default function PayablesLoading() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <S key={i} className="h-24 w-full rounded-xl" />
        ))}
      </section>
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap gap-3">
          <S className="h-9 w-64 rounded-lg" />
          <S className="h-9 w-36 rounded-lg" />
          <S className="h-9 w-28 rounded-lg" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <S key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  );
}
