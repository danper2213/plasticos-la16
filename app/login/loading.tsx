function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/70 ${className}`} />;
}

export default function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-8">
        <Skeleton className="h-5 w-32 rounded-md" />

        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-14 w-36 rounded-lg" />
          <Skeleton className="h-4 w-48 rounded-md" />
        </div>

        <div className="overflow-hidden rounded-[24px] border border-border bg-card p-6 shadow-2xl">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
