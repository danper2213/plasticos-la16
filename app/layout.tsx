import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "PLASTICOS LA 16",
  description: "Pagina web oficial de PLASTICOS LA 16.",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: "/logo.png",
    apple: [{ url: "/logo.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
          <Toaster
            richColors
            position="top-center"
            duration={4000}
            toastOptions={{
              className: "rounded-2xl border-2 border-primary/20 bg-zinc-950/90 text-zinc-100 shadow-2xl shadow-primary/10 backdrop-blur-xl",
              classNames: {
                title: "text-base font-bold text-center",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
