import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : null;
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : null;
const supabaseWsOrigin = supabaseOrigin?.replace(/^https:/, "wss:") ?? null;

function buildContentSecurityPolicy(): string {
  const connectSrc = [
    "'self'",
    "https://vitals.vercel-insights.com",
    "https://*.supabase.co",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://analytics.google.com",
    "https://*.analytics.google.com",
    "https://www.googletagmanager.com",
    "https://*.googletagmanager.com",
    "https://www.google.com",
    "https://stats.g.doubleclick.net",
    ...(supabaseOrigin ? [supabaseOrigin] : []),
    ...(supabaseWsOrigin ? [supabaseWsOrigin] : []),
  ].join(" ");

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    "https://images.unsplash.com",
    "https://www.google.com",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://www.googletagmanager.com",
    "https://*.googletagmanager.com",
    "https://stats.g.doubleclick.net",
    "https://*.supabase.co",
    ...(supabaseOrigin ? [supabaseOrigin] : []),
  ].join(" ");

  const mediaSrc = [
    "'self'",
    "blob:",
    "https://*.supabase.co",
    ...(supabaseOrigin ? [supabaseOrigin] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    // Tag Assistant carga el sitio en iframe; 'none' + X-Frame-Options: DENY hacen fallar "Probar instalación".
    "frame-ancestors 'self' https://tagassistant.google.com https://*.google.com https://www.googletagmanager.com",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    `media-src ${mediaSrc}`,
    "frame-src 'self' https://www.googletagmanager.com https://tagassistant.google.com https://www.google.com",
  ].join("; ");
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/logo.png" }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.google.com", pathname: "/s2/favicons/**" },
      ...(supabaseHostname
        ? [{ protocol: "https" as const, hostname: supabaseHostname, pathname: "/**" }]
        : []),
    ],
  },
  async headers() {
    return [
      {
        source: "/hero-video.mp4",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
