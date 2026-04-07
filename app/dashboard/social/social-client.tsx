"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deleteSocialPost, type SocialPost, uploadSocialPost } from "./actions";

interface SocialClientProps {
  posts: SocialPost[];
}

export function SocialClient({ posts }: SocialClientProps) {
  const router = useRouter();
  const [caption, setCaption] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formElement = e.currentTarget;
    if (!file) {
      toast.error("Selecciona un archivo antes de subir.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", caption);

    setIsUploading(true);
    const result = await uploadSocialPost(formData);
    setIsUploading(false);

    if (!result.success) {
      toast.error(result.error ?? "Error al subir contenido.");
      return;
    }

    toast.success("Contenido subido correctamente.");
    setCaption("");
    setFile(null);
    setShowForm(false);
    formElement.reset();
    router.refresh();
  }

  async function handleDelete(post: SocialPost) {
    setDeletingId(post.id);
    const result = await deleteSocialPost(post.id, post.media_path);
    setDeletingId(null);

    if (!result.success) {
      toast.error(result.error ?? "No se pudo eliminar el contenido.");
      return;
    }

    toast.success("Contenido eliminado.");
    router.refresh();
  }

  return (
    <div className="space-y-8 pt-8">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
              Gestión de Novedades
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Sube imágenes o videos al bucket{" "}
              <span className="font-semibold text-zinc-200">social-content</span>.
            </p>
          </div>
          <Button
            type="button"
            className="bg-blue-600 text-white hover:bg-blue-500"
            onClick={() => setShowForm((prev) => !prev)}
          >
            <Upload className="size-4" />
            {showForm ? "Ocultar formulario" : "Subir Nuevo Contenido"}
          </Button>
        </div>

        {showForm ? (
          <form onSubmit={handleUpload} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200" htmlFor="social-file">
                Archivo (imagen o video)
              </label>
              <Input
                id="social-file"
                type="file"
                accept="image/*,video/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="border-zinc-700 bg-zinc-950 text-zinc-100 file:text-zinc-200"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200" htmlFor="social-caption">
                Caption
              </label>
              <Textarea
                id="social-caption"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Escribe un título corto para este contenido..."
                className="min-h-24 border-zinc-700 bg-zinc-950 text-zinc-100 placeholder:text-zinc-500"
                maxLength={140}
              />
            </div>

            <Button
              type="submit"
              disabled={isUploading}
              className="bg-blue-600 text-white hover:bg-blue-500"
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  Subir Nuevo Contenido
                </>
              )}
            </Button>
          </form>
        ) : null}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-zinc-100">Contenido publicado</h2>
        {posts.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-400">
            Aún no hay contenido social cargado.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.id}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50"
              >
                <div className="relative h-56 w-full bg-zinc-950">
                  {post.media_type === "video" ? (
                    <video
                      src={post.media_url}
                      className="h-full w-full object-cover"
                      muted
                      controls
                      playsInline
                    />
                  ) : (
                    <img
                      src={post.media_url}
                      alt={post.caption || "Contenido social"}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-100">
                    Thumbnail
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <p className="line-clamp-2 text-sm text-zinc-200">
                    {post.caption || "Sin caption"}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-zinc-500">
                      {new Date(post.created_at).toLocaleDateString("es-CO")}
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deletingId === post.id}
                      onClick={() => handleDelete(post)}
                    >
                      {deletingId === post.id ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Eliminando...
                        </>
                      ) : (
                        <>
                          <Trash2 className="size-4" />
                          Eliminar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
