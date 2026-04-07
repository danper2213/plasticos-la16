"use client";

import * as React from "react";
import { toast } from "sonner";
import { subscribeNewsletter } from "@/app/(public)/newsletter-actions";

export function NewsletterForm() {
  const [email, setEmail] = React.useState("");
  const [isSubmitting, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (!value) {
      toast.error("Ingresa tu correo.");
      return;
    }

    startTransition(async () => {
      const result = await subscribeNewsletter({ email: value });
      if (!result.success) {
        toast.error(result.error ?? "No se pudo registrar el correo.");
        return;
      }
      toast.success("Suscripción registrada correctamente.");
      setEmail("");
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/70 p-1"
    >
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Tu correo"
        className="h-10 w-full bg-transparent px-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
        required
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Enviando..." : "Suscribirme"}
      </button>
    </form>
  );
}
