"use client";

import * as React from "react";
import Image from "next/image";
import { Instagram, Music2 } from "lucide-react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LANDING_PAGE_GUTTER,
  LANDING_SECTION_PANEL,
  LANDING_SECTION_PANEL_PAD,
} from "@/components/public/landing-section-styles";
import { PublicSectionHeading } from "@/components/public/PublicSectionHeading";
import { ScrollFadeSection } from "@/components/public/ScrollFadeSection";
import { cn } from "@/lib/utils";

export type SocialPost = {
  id: string;
  caption: string;
  media_url: string;
  media_type: "image" | "video";
  created_at: string;
};

type SocialCardPost = SocialPost & {
  span: string;
};

const GRID_SPANS = [
  "md:col-span-2",
  "md:col-span-1",
  "md:col-span-1",
  "md:col-span-2",
  "md:col-span-1",
  "md:col-span-1",
] as const;

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
      staggerChildren: 0.12,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
};

function PlatformIcon({ mediaType }: { mediaType: SocialPost["media_type"] }) {
  if (mediaType === "image") {
    return <Instagram className="size-4 text-white" aria-hidden />;
  }
  return <Music2 className="size-4 text-white" aria-hidden />;
}

interface SocialFeedProps {
  posts: SocialPost[];
}

export function SocialFeed({ posts }: SocialFeedProps) {
  const [lightbox, setLightbox] = React.useState<SocialPost | null>(null);

  const mappedPosts = React.useMemo<SocialCardPost[]>(
    () =>
      posts.map((post, index) => ({
        ...post,
        caption: post.caption?.trim() || "Sin caption",
        span: GRID_SPANS[index % GRID_SPANS.length],
      })),
    [posts]
  );

  return (
    <ScrollFadeSection className="relative overflow-hidden bg-transparent py-16 sm:py-20">
      <div className={LANDING_PAGE_GUTTER}>
        <div className={cn(LANDING_SECTION_PANEL, LANDING_SECTION_PANEL_PAD)}>
        <div className="mb-8 sm:mb-10">
          <PublicSectionHeading>
            Novedades en Plásticos La 16
          </PublicSectionHeading>
          <p className="mt-3 text-base text-zinc-400 sm:text-lg">
            Lo último que ha llegado al local
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial={false}
          animate="show"
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          {mappedPosts.map((post) => (
            <motion.article
              key={post.id}
              variants={cardVariants}
              className={`group relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 ${post.span}`}
            >
              <div className="relative h-64 w-full sm:h-72">
                {post.media_type === "video" ? (
                  <div
                    className="relative h-full w-full"
                    onMouseEnter={(e) => {
                      const v = e.currentTarget.querySelector("video");
                      if (v instanceof HTMLVideoElement) void v.play().catch(() => undefined);
                    }}
                    onMouseLeave={(e) => {
                      const v = e.currentTarget.querySelector("video");
                      if (v instanceof HTMLVideoElement) {
                        v.pause();
                        v.currentTime = 0;
                      }
                    }}
                  >
                    <video
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      src={post.media_url}
                      loop
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <button
                      type="button"
                      onClick={() => setLightbox(post)}
                      className="absolute inset-0 z-[2] cursor-zoom-in bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                      aria-label="Ver video a tamaño completo"
                    />
                  </div>
                ) : (
                  <>
                    <Image
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      src={post.media_url}
                      alt={post.caption}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <button
                      type="button"
                      onClick={() => setLightbox(post)}
                      className="absolute inset-0 z-[2] cursor-zoom-in bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                      aria-label="Ver imagen completa"
                    />
                  </>
                )}

                <div className="pointer-events-none absolute left-3 top-3 z-[3] inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
                  <PlatformIcon mediaType={post.media_type} />
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-100">
                    {post.media_type === "image" ? "instagram" : "video"}
                  </span>
                </div>
                <p className="pointer-events-none absolute bottom-3 right-3 z-[3] rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-200 backdrop-blur-sm">
                  Tocá para ampliar
                </p>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4 pb-4 pt-10 opacity-0 transition duration-300 group-hover:opacity-100">
                <p className="text-sm font-medium text-zinc-100">{post.caption}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>

        {mappedPosts.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-400">
            Pronto verás nuestras novedades aquí
          </div>
        ) : null}

        <Dialog
          open={lightbox !== null}
          onOpenChange={(open) => {
            if (!open) setLightbox(null);
          }}
        >
          <DialogContent
            showCloseButton
            className="max-h-[min(92vh,900px)] w-[min(96vw,1100px)] max-w-[min(96vw,1100px)] translate-x-[-50%] translate-y-[-50%] gap-3 border-zinc-800 bg-zinc-950 p-4 sm:p-5"
            overlayClassName="bg-black/90 backdrop-blur-md"
          >
            {lightbox ? (
              <>
                <DialogHeader className="space-y-1 text-left">
                  <DialogTitle className="text-base font-semibold leading-snug text-zinc-100">
                    {lightbox.caption?.trim() || "Novedad"}
                  </DialogTitle>
                  <p className="text-xs text-zinc-500">
                    {lightbox.media_type === "image"
                      ? "Imagen completa"
                      : "Reproducí el video con los controles"}
                  </p>
                </DialogHeader>
                <div className="flex max-h-[min(78vh,820px)] w-full items-center justify-center overflow-auto rounded-xl bg-black/40 p-2">
                  {lightbox.media_type === "video" ? (
                    <video
                      key={lightbox.id}
                      className="max-h-[min(76vh,800px)] w-full max-w-full object-contain"
                      src={lightbox.media_url}
                      controls
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- URL dinámica de storage; object-contain en lightbox
                    <img
                      src={lightbox.media_url}
                      alt={lightbox.caption || "Novedad"}
                      className="max-h-[min(76vh,800px)] w-auto max-w-full object-contain"
                    />
                  )}
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </ScrollFadeSection>
  );
}
