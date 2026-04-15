function S({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/70 ${className}`} />;
}

export default function SocialLoading() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-5 flex flex-wrap gap-3">
          <S className="h-9 w-64 rounded-lg" />
          <S className="h-9 w-36 rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <S key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      </section>
    </div>
  );
}
