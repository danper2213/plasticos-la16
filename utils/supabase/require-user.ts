import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { User } from "@supabase/supabase-js";

export type AppRole = "admin" | "employee";

export interface RequiredAuth {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
}

export interface RequiredAdmin extends RequiredAuth {
  role: AppRole;
}

/**
 * Obtiene el cliente Supabase y el usuario actual. Si no hay sesión, redirige a /login.
 */
export async function requireUser(): Promise<RequiredAuth> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

/**
 * Igual que requireUser pero además exige que el usuario sea admin.
 * Redirige a /dashboard si no es admin. Usar en acciones del panel de usuarios.
 */
export async function requireAdmin(): Promise<RequiredAdmin> {
  const { supabase, user } = await requireUser();

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = (data?.role === "admin" || data?.role === "employee"
    ? data.role
    : "employee") as AppRole;

  if (role !== "admin") {
    redirect("/dashboard");
  }

  return { supabase, user, role };
}
