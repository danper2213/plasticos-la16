"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/utils/supabase/require-user";

const settingsSchema = z.object({
  whatsapp_url: z.string().trim().url("URL de WhatsApp inválida"),
  instagram_url: z.string().trim().url("URL de Instagram inválida"),
  tiktok_url: z.string().trim().url("URL de TikTok inválida"),
  facebook_url: z.string().trim().url("URL de Facebook inválida"),
});

export type SocialSettingsForm = z.infer<typeof settingsSchema>;

export async function getSocialSettings(): Promise<SocialSettingsForm> {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("public_settings")
    .select("whatsapp_url, instagram_url, tiktok_url, facebook_url")
    .eq("id", 1)
    .maybeSingle();

  return {
    whatsapp_url:
      data?.whatsapp_url?.trim() || "https://wa.me/?text=Hola%20PLASTICOS%20LA%2016",
    instagram_url:
      data?.instagram_url?.trim() || "https://www.instagram.com/plasticosla16/",
    tiktok_url: data?.tiktok_url?.trim() || "https://www.tiktok.com/",
    facebook_url: data?.facebook_url?.trim() || "https://www.facebook.com/",
  };
}

export async function updateSocialSettings(values: SocialSettingsForm) {
  const { supabase } = await requireAdmin();
  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message };
  }

  const payload = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("public_settings")
    .upsert({ id: 1, ...payload }, { onConflict: "id" });

  if (error) {
    return {
      success: false as const,
      error: `No se pudo guardar: ${error.message}`,
    };
  }

  revalidatePath("/");
  revalidatePath("/dashboard/configuracion");
  return { success: true as const };
}
