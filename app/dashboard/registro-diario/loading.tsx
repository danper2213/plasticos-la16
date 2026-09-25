function S({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/70 ${className}`} />;
}

export default function RegistroDiarioLoading() {
  return (
    <div className="space-y-6">
      <S className="h-28 w-full rounded-[1.35rem]" />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <S key={i} className="h-28 w-full rounded-xl" />
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-5">
        <S className="h-[520px] rounded-2xl xl:col-span-3" />
        <S className="h-64 rounded-2xl xl:col-span-2" />
      </section>
      <S className="h-80 rounded-2xl" />
    </div>
  );
}
