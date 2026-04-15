function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/70 ${className}`} />;
}

export default function InventoryLoading() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <SkeletonBlock className="h-9 w-52 rounded-lg" />
          <SkeletonBlock className="h-9 w-40 rounded-lg" />
          <SkeletonBlock className="h-9 w-40 rounded-lg" />
          <SkeletonBlock className="h-9 w-32 rounded-lg" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <SkeletonBlock className="h-6 w-56 rounded-md" />
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-12 gap-3 border-b border-border bg-muted/30 px-5 py-3">
              <SkeletonBlock className="col-span-3 h-4 w-24" />
              <SkeletonBlock className="col-span-3 h-4 w-20" />
              <SkeletonBlock className="col-span-2 h-4 w-16" />
              <SkeletonBlock className="col-span-2 h-4 w-20" />
              <SkeletonBlock className="col-span-2 h-4 w-16" />
            </div>

            <div className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-12 items-center gap-3 px-5 py-4">
                  <SkeletonBlock className="col-span-3 h-4 w-11/12" />
                  <SkeletonBlock className="col-span-3 h-4 w-9/12" />
                  <SkeletonBlock className="col-span-2 h-4 w-8/12" />
                  <SkeletonBlock className="col-span-2 h-4 w-8/12" />
                  <SkeletonBlock className="col-span-2 h-8 w-20 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
