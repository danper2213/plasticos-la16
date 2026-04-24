"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type LoginActionResult =
  | { success: true }
  | { success: false; error: string };

/** Mensajes de Supabase Auth → español (UI del login). */
function translateAuthError(message: string): string {
  const m = message.trim().toLowerCase();
  if (
    m.includes("invalid login credentials") ||
    m.includes("invalid email or password") ||
    m.includes("invalid credentials")
  ) {
    return "Correo o contraseña incorrectos.";
  }
  if (m.includes("email not confirmed")) {
    return "Debe confirmar su correo electrónico antes de iniciar sesión.";
  }
  if (m.includes("too many requests") || m.includes("rate limit")) {
    return "Demasiados intentos. Espere unos minutos e inténtelo de nuevo.";
  }
  if (m.includes("user not found")) {
    return "No existe una cuenta con ese correo.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Error de conexión. Compruebe su red e inténtelo de nuevo.";
  }
  return "No se pudo iniciar sesión. Verifique sus datos e inténtelo de nuevo.";
}

/**
 * Solo permite rutas relativas de la app. Evita open redirect (ej. redirectTo=https://evil.com).
 */
function getSafeRedirectTo(candidate: string | null | undefined): string {
  const fallback = "/dashboard";
  if (candidate == null || typeof candidate !== "string") return fallback;
  const trimmed = candidate.trim();
  if (
    trimmed === "" ||
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\")
  ) {
    return fallback;
  }
  return trimmed;
}

export async function signIn(formData: {
  email: string;
  password: string;
  redirectTo?: string;
}): Promise<LoginActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (error) {
    return { success: false, error: translateAuthError(error.message) };
  }

  redirect(getSafeRedirectTo(formData.redirectTo));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
