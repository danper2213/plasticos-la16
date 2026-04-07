"use server";

import { z } from "zod";
import { createAdminClient } from "@/utils/supabase/admin";

const subscribeSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
});

export async function subscribeNewsletter(input: { email: string }) {
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Ingresa un correo válido." };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("newsletter_subscribers").insert({
      email: parsed.data.email.toLowerCase(),
    });

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        return { success: true as const };
      }
      return {
        success: false as const,
        error: `No se pudo registrar el correo: ${error.message}`,
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
