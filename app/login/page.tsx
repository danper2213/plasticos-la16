import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión | PLASTICOS LA 16",
  description: "Acceso al panel de gestión.",
  robots: { index: false, follow: true },
};

function LoginFormFallback() {
  return (
    <div className="w-full max-w-md animate-pulse overflow-hidden rounded-[24px] border border-border bg-card shadow-2xl dark:border-zinc-800">
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-muted" />
          <div className="space-y-2">
            <div className="h-6 w-36 rounded bg-muted" />
            <div className="h-4 w-56 rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="space-y-5 p-6">
        <div className="h-10 rounded-lg bg-muted" />
        <div className="h-10 rounded-lg bg-muted" />
        <div className="h-10 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <Link
          href="/"
          className="self-start text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <span className="inline-flex items-center gap-1.5">
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            Volver al inicio
          </span>
        </Link>

        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo.png"
            alt="Logo PLASTICOS LA 16"
            width={140}
            height={56}
            priority
            className="h-auto w-[140px] object-contain drop-shadow-sm"
          />
          <div>
            <p className="text-xl font-bold tracking-tight text-foreground">
              PLASTICOS <span className="text-primary">LA 16</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sistema de gestión y control
            </p>
          </div>
        </div>

        <div className="w-full">
          <Suspense fallback={<LoginFormFallback />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
