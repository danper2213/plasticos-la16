import { Suspense } from "react";
import { LoginForm } from "./login-form";

function LoginFormFallback() {
  return (
    <div className="w-full max-w-md animate-pulse rounded-lg border border-border bg-card p-6">
      <div className="mb-4 h-7 w-32 rounded bg-muted" />
      <div className="mb-6 h-4 w-64 rounded bg-muted" />
      <div className="space-y-4">
        <div className="h-10 rounded bg-muted" />
        <div className="h-10 rounded bg-muted" />
        <div className="h-9 rounded bg-muted" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
