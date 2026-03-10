import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con service_role. SOLO usar en servidor (Server Actions, Route Handlers).
 * Nunca expongas SUPABASE_SERVICE_ROLE_KEY al cliente.
 * Bypasea RLS; usar únicamente después de verificar que el usuario actual es admin.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. El panel de usuarios requiere la clave de servicio."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
