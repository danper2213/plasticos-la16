"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type LoginActionResult =
  | { success: true }
  | { success: false; error: string };

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
    return { success: false, error: error.message };
  }

  redirect(getSafeRedirectTo(formData.redirectTo));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
