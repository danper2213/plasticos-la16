function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/70 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-64 lg:border-r lg:border-border lg:bg-card">
        <div className="flex h-14 items-center border-b border-border px-4">
          <SkeletonBlock className="h-7 w-36 rounded-lg" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </div>

      <div className="min-h-screen lg:pl-64">
        <div className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:px-6">
          <div className="flex items-center justify-between gap-4">
            <SkeletonBlock className="h-8 w-44 rounded-lg" />
            <SkeletonBlock className="h-9 w-32 rounded-lg" />
          </div>
        </div>

        <main className="space-y-6 p-4 lg:p-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-5 flex flex-wrap gap-3">
              <SkeletonBlock className="h-9 w-40 rounded-lg" />
              <SkeletonBlock className="h-9 w-32 rounded-lg" />
              <SkeletonBlock className="h-9 w-28 rounded-lg" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-11 w-full rounded-xl" />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <SkeletonBlock className="mb-4 h-6 w-56 rounded-md" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
