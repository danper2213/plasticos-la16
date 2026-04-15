function S({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/70 ${className}`} />;
}

export default function CotizacionesLoading() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap gap-3">
          <S className="h-9 w-72 rounded-lg" />
          <S className="h-9 w-32 rounded-lg" />
          <S className="h-9 w-32 rounded-lg" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <S className="h-80 rounded-2xl lg:col-span-2" />
          <S className="h-80 rounded-2xl" />
        </div>
      </section>
    </div>
  );
}
