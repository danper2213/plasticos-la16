import type { Metadata } from "next";

import { Inter } from "next/font/google";

import { Navbar } from "@/components/public/Navbar";

import { PublicPageBackdrop } from "@/components/public/PublicPageBackdrop";

import { PublicSplashLoader } from "@/components/public/PublicSplashLoader";

import { getPublicSocialSettings } from "@/utils/public-settings";



const inter = Inter({

  subsets: ["latin"],

  display: "swap",

});



export const metadata: Metadata = {

  title: "PLASTICOS LA 16 | Inicio",

  description:

    "Plásticos y soluciones para tu negocio. Catálogo, mayoristas y contacto directo.",

};



export default async function PublicLayout({

  children,

}: Readonly<{

  children: React.ReactNode;

}>) {

  const socialSettings = await getPublicSocialSettings();



  return (

    <div

      className={`${inter.className} relative min-h-screen scroll-smooth bg-zinc-950 text-zinc-100 antialiased selection:bg-blue-600/30 selection:text-white`}

    >

      <PublicPageBackdrop />

      <div className="relative z-10">

        <Navbar socialSettings={socialSettings} />

        {children}

      </div>

      <PublicSplashLoader />

    </div>

  );

}

