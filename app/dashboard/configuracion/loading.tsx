function S({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/70 ${className}`} />;
}

export default function ConfiguracionLoading() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <S className="mb-5 h-8 w-72 rounded-lg" />
        <div className="space-y-4">
          <S className="h-20 w-full rounded-xl" />
          <S className="h-20 w-full rounded-xl" />
          <S className="h-20 w-full rounded-xl" />
          <S className="h-10 w-40 rounded-lg" />
        </div>
      </section>
    </div>
  );
}
