"use client";

import dynamic from "next/dynamic";

const PublicSplash = dynamic(
  () =>
    import("@/components/public/PublicSplash").then((mod) => ({
      default: mod.PublicSplash,
    })),
  { ssr: false, loading: () => null }
);

export function PublicSplashLoader() {
  return <PublicSplash />;
}
