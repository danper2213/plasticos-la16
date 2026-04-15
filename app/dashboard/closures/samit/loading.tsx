function S({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/70 ${className}`} />;
}

export default function SamitLoading() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <S key={i} className="h-24 w-full rounded-xl" />
        ))}
      </section>
      <section className="rounded-2xl border border-border bg-card p-5">
        <S className="mb-4 h-6 w-52 rounded-md" />
        <S className="h-64 w-full rounded-2xl" />
      </section>
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <S key={i} className="h-12 w-full rounded-xl" />
        ))}
      </section>
    </div>
  );
}
