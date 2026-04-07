import { createClient } from "@/utils/supabase/server";

export interface PublicSocialSettings {
  whatsapp_url: string;
  instagram_url: string;
  tiktok_url: string;
  facebook_url: string;
}

/** Valores por defecto si falla la lectura de `public_settings`. */
export const DEFAULT_PUBLIC_SOCIAL_SETTINGS: PublicSocialSettings = {
  whatsapp_url: "https://wa.me/?text=Hola%20PLASTICOS%20LA%2016",
  instagram_url: "https://www.instagram.com/plasticosla16/",
  tiktok_url: "https://www.tiktok.com/",
  facebook_url: "https://www.facebook.com/",
};

interface PublicSettingsRow {
  whatsapp_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
}

export async function getPublicSocialSettings(): Promise<PublicSocialSettings> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("public_settings")
      .select("whatsapp_url, instagram_url, tiktok_url, facebook_url")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return DEFAULT_PUBLIC_SOCIAL_SETTINGS;

    const row = data as unknown as PublicSettingsRow;
    return {
      whatsapp_url: row.whatsapp_url?.trim() || DEFAULT_PUBLIC_SOCIAL_SETTINGS.whatsapp_url,
      instagram_url: row.instagram_url?.trim() || DEFAULT_PUBLIC_SOCIAL_SETTINGS.instagram_url,
      tiktok_url: row.tiktok_url?.trim() || DEFAULT_PUBLIC_SOCIAL_SETTINGS.tiktok_url,
      facebook_url: row.facebook_url?.trim() || DEFAULT_PUBLIC_SOCIAL_SETTINGS.facebook_url,
    };
  } catch {
    return DEFAULT_PUBLIC_SOCIAL_SETTINGS;
  }
}
