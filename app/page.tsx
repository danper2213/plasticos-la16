import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

/**
 * Ruta principal: redirige según sesión.
 * - Autenticado → /dashboard
 * - No autenticado → /login
 * No se muestra nunca la página por defecto de Next.js.
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  redirect("/login");
}
