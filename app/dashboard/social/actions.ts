"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/supabase/require-user";
import { createAdminClient } from "@/utils/supabase/admin";

export interface SocialPost {
  id: string;
  caption: string;
  media_url: string;
  media_path: string;
  media_type: "image" | "video";
  created_at: string;
}

interface SocialPostRow {
  id: string;
  caption: string | null;
  media_url: string;
  media_path: string;
  media_type: "image" | "video";
  created_at: string;
}

export async function getSocialPosts(): Promise<SocialPost[]> {
  const { supabase } = await requireAdmin();
  try {
    const { data, error } = await supabase
      .from("social_posts")
      .select("id, caption, media_url, media_path, media_type, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return [];
    }

    return ((data ?? []) as unknown as SocialPostRow[]).map((row) => ({
      id: row.id,
      caption: row.caption ?? "",
      media_url: row.media_url,
      media_path: row.media_path,
      media_type: row.media_type,
      created_at: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function uploadSocialPost(formData: FormData) {
  const { user } = await requireAdmin();
  const adminSupabase = createAdminClient();

  const fileEntry = formData.get("file");
  const captionEntry = formData.get("caption");

  const file = fileEntry instanceof File ? fileEntry : null;
  const caption = typeof captionEntry === "string" ? captionEntry.trim() : "";

  if (!file) {
    return { success: false as const, error: "Debes seleccionar un archivo." };
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    return {
      success: false as const,
      error: "Solo se permiten imágenes o videos.",
    };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  const uniquePath = `${user.id}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await adminSupabase.storage
    .from("social-content")
    .upload(uniquePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    return {
      success: false as const,
      error: `No se pudo subir el archivo: ${uploadError.message}`,
    };
  }

  const {
    data: { publicUrl },
  } = adminSupabase.storage.from("social-content").getPublicUrl(uniquePath);

  const basePost = {
    caption: caption || null,
    media_url: publicUrl,
    media_path: uniquePath,
    media_type: isVideo ? "video" : "image",
  };

  let { error: insertError } = await adminSupabase.from("social_posts").insert({
    ...basePost,
    created_by: user.id,
  });

  if (insertError?.message?.includes("created_by")) {
    const fallbackInsert = await adminSupabase.from("social_posts").insert(basePost);
    insertError = fallbackInsert.error;
  }

  if (insertError) {
    await adminSupabase.storage.from("social-content").remove([uniquePath]);
    return {
      success: false as const,
      error: `No se pudo guardar el post: ${insertError.message}`,
    };
  }

  revalidatePath("/dashboard/social");
  revalidatePath("/");
  return { success: true as const };
}

export async function deleteSocialPost(postId: string, mediaPath: string) {
  await requireAdmin();
  const adminSupabase = createAdminClient();

  const { error: deleteDbError } = await adminSupabase
    .from("social_posts")
    .delete()
    .eq("id", postId);

  if (deleteDbError) {
    return {
      success: false as const,
      error: `No se pudo eliminar el registro: ${deleteDbError.message}`,
    };
  }

  const { error: deleteStorageError } = await adminSupabase.storage
    .from("social-content")
    .remove([mediaPath]);

  if (deleteStorageError) {
    return {
      success: false as const,
      error: `Se eliminó el registro, pero no el archivo: ${deleteStorageError.message}`,
    };
  }

  revalidatePath("/dashboard/social");
  revalidatePath("/");
  return { success: true as const };
}
