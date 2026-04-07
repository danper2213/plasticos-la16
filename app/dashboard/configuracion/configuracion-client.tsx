"use client";

import * as React from "react";
import { ExternalLink, Facebook, Instagram, MessageCircle, Music2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateSocialSettings, type SocialSettingsForm } from "./actions";

interface ConfiguracionClientProps {
  initialValues: SocialSettingsForm;
}

export function ConfiguracionClient({ initialValues }: ConfiguracionClientProps) {
  const [values, setValues] = React.useState<SocialSettingsForm>(initialValues);
  const [isSaving, startTransition] = React.useTransition();

  function updateField<K extends keyof SocialSettingsForm>(
    key: K,
    value: SocialSettingsForm[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateSocialSettings(values);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo guardar la configuración.");
        return;
      }
      toast.success("Redes sociales actualizadas.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 pt-8">
      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-900/30 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <Settings2 className="size-3.5" />
              Página Web
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
              Configuración de Redes
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Administra WhatsApp y redes visibles en Navbar y Footer.
            </p>
          </div>
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-200">
            <MessageCircle className="size-4 text-blue-400" />
            WhatsApp URL
          </label>
          <Input
            value={values.whatsapp_url}
            onChange={(e) => updateField("whatsapp_url", e.target.value)}
            className="border-zinc-700 bg-zinc-950 text-zinc-100"
            placeholder="https://wa.me/..."
          />
        </div>
        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-200">
            <Instagram className="size-4 text-blue-400" />
            Instagram URL
          </label>
          <Input
            value={values.instagram_url}
            onChange={(e) => updateField("instagram_url", e.target.value)}
            className="border-zinc-700 bg-zinc-950 text-zinc-100"
            placeholder="https://www.instagram.com/..."
          />
        </div>
        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-200">
            <Music2 className="size-4 text-blue-400" />
            TikTok URL
          </label>
          <Input
            value={values.tiktok_url}
            onChange={(e) => updateField("tiktok_url", e.target.value)}
            className="border-zinc-700 bg-zinc-950 text-zinc-100"
            placeholder="https://www.tiktok.com/@..."
          />
        </div>
        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-200">
            <Facebook className="size-4 text-blue-400" />
            Facebook URL
          </label>
          <Input
            value={values.facebook_url}
            onChange={(e) => updateField("facebook_url", e.target.value)}
            className="border-zinc-700 bg-zinc-950 text-zinc-100"
            placeholder="https://www.facebook.com/..."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
        <p className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Vista rápida
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <a
            href={values.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-200 transition hover:border-blue-500"
          >
            Instagram
            <ExternalLink className="size-4 text-zinc-500" />
          </a>
          <a
            href={values.tiktok_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-200 transition hover:border-blue-500"
          >
            TikTok
            <ExternalLink className="size-4 text-zinc-500" />
          </a>
          <a
            href={values.whatsapp_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-200 transition hover:border-blue-500"
          >
            WhatsApp
            <ExternalLink className="size-4 text-zinc-500" />
          </a>
          <a
            href={values.facebook_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-200 transition hover:border-blue-500"
          >
            Facebook
            <ExternalLink className="size-4 text-zinc-500" />
          </a>
        </div>
      </section>
    </form>
  );
}
