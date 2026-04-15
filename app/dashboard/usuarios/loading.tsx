function S({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/70 ${className}`} />;
}

export default function UsuariosLoading() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-5 flex flex-wrap gap-3">
          <S className="h-9 w-64 rounded-lg" />
          <S className="h-9 w-36 rounded-lg" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <S key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  );
}
