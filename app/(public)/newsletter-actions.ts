"use server";

import { z } from "zod";
import { checkRateLimit, getRequestClientIp } from "@/lib/rate-limit";
import { createClient } from "@/utils/supabase/server";

const subscribeSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
});

const EMAIL_LIMIT = 2;
const IP_LIMIT = 8;
const WINDOW_MS = 10 * 60 * 1000;

export async function subscribeNewsletter(input: { email: string }) {
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Ingresa un correo válido." };
  }

  const email = parsed.data.email.toLowerCase();
  const ip = await getRequestClientIp();

  const emailLimit = checkRateLimit(`newsletter:email:${email}`, EMAIL_LIMIT, WINDOW_MS);
  if (!emailLimit.allowed) {
    return {
      success: false as const,
      error: "Demasiados intentos con este correo. Probá de nuevo en unos minutos.",
    };
  }

  const ipLimit = checkRateLimit(`newsletter:ip:${ip}`, IP_LIMIT, WINDOW_MS);
  if (!ipLimit.allowed) {
    return {
      success: false as const,
      error: "Demasiados intentos desde tu conexión. Probá de nuevo en unos minutos.",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("newsletter_subscribers").insert({ email });

    if (error) {
      const code = (error as { code?: string }).code;
      const msg = error.message.toLowerCase();
      if (code === "23505" || msg.includes("duplicate") || msg.includes("unique")) {
        return { success: true as const };
      }
      return {
        success: false as const,
        error: "No se pudo registrar el correo. Intentá más tarde.",
      };
    }

    return { success: true as const };
  } catch {
    return {
      success: false as const,
      error: "No se pudo registrar el correo en este momento.",
    };
  }
}
