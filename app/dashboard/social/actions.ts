"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySocialUploadMime } from "@/lib/verify-upload-bytes";
import { requireAdmin } from "@/utils/supabase/require-user";
import { createAdminClient } from "@/utils/supabase/admin";

const SOCIAL_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const SOCIAL_VIDEO_MAX_BYTES = 20 * 1024 * 1024;

const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_VIDEO_MIMES = new Set(["video/mp4", "video/webm"]);

const socialCaptionSchema = z.string().trim().max(2000, "La leyenda es demasiado larga.");

const deleteSocialPostSchema = z.object({
  postId: z.string().uuid("Identificador de post no válido"),
  mediaPath: z
    .string()
    .trim()
    .min(1, "Ruta de media no válida")
    .max(500, "Ruta de media no válida"),
});

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
  const captionParsed = socialCaptionSchema.safeParse(
    typeof captionEntry === "string" ? captionEntry : "",
  );

  if (!captionParsed.success) {
    return { success: false as const, error: captionParsed.error.issues[0]?.message ?? "Leyenda no válida." };
  }

  if (!file || file.size === 0) {
    return { success: false as const, error: "Debes seleccionar un archivo." };
  }

  const declaredMime = (file.type || "").toLowerCase();
  const isImage = ALLOWED_IMAGE_MIMES.has(declaredMime);
  const isVideo = ALLOWED_VIDEO_MIMES.has(declaredMime);

  if (!isImage && !isVideo) {
    return {
      success: false as const,
      error: "Formato no permitido. Usá JPG, PNG, WebP, GIF, MP4 o WebM.",
    };
  }

  const maxBytes = isVideo ? SOCIAL_VIDEO_MAX_BYTES : SOCIAL_IMAGE_MAX_BYTES;
  if (file.size > maxBytes) {
    return {
      success: false as const,
      error: isVideo
        ? "El video no puede superar 20 MB."
        : "La imagen no puede superar 5 MB.",
    };
  }

  const mimeCheck = await verifySocialUploadMime(file, declaredMime);
  if (!mimeCheck.ok) {
    return { success: false as const, error: mimeCheck.error };
  }

  const ext =
    mimeCheck.mime === "image/png"
      ? "png"
      : mimeCheck.mime === "image/webp"
        ? "webp"
        : mimeCheck.mime === "image/gif"
          ? "gif"
          : mimeCheck.mime === "video/webm"
            ? "webm"
            : mimeCheck.mime === "video/mp4"
              ? "mp4"
              : "jpg";

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  const uniquePath = `${user.id}/${Date.now()}-${safeName || `archivo.${ext}`}`;

  const { error: uploadError } = await adminSupabase.storage
    .from("social-content")
    .upload(uniquePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: mimeCheck.mime,
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

  const caption = captionParsed.data;
  const basePost = {
    caption: caption || null,
    media_url: publicUrl,
    media_path: uniquePath,
    media_type: isVideo ? ("video" as const) : ("image" as const),
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
  const parsed = deleteSocialPostSchema.safeParse({ postId, mediaPath });
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Datos no válidos",
    };
  }

  await requireAdmin();
  const adminSupabase = createAdminClient();

  const { error: deleteDbError } = await adminSupabase
    .from("social_posts")
    .delete()
    .eq("id", parsed.data.postId);

  if (deleteDbError) {
    return {
      success: false as const,
      error: `No se pudo eliminar el registro: ${deleteDbError.message}`,
    };
  }

  const { error: deleteStorageError } = await adminSupabase.storage
    .from("social-content")
    .remove([parsed.data.mediaPath]);

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
