import type { Metadata } from "next";

import { Inter } from "next/font/google";

import { Navbar } from "@/components/public/Navbar";

import { PublicPageBackdrop } from "@/components/public/PublicPageBackdrop";

import { PublicSplashLoader } from "@/components/public/PublicSplashLoader";

import {
  PUBLIC_HOME_DESCRIPTION,
  PUBLIC_HOME_TITLE,
  PUBLIC_SITE_NAME,
} from "@/lib/public-seo";
import { getPublicSocialSettings } from "@/utils/public-settings";



const inter = Inter({

  subsets: ["latin"],

  display: "swap",

});



export const metadata: Metadata = {
  title: {
    default: PUBLIC_HOME_TITLE,
    template: `${PUBLIC_SITE_NAME} | %s`,
  },
  description: PUBLIC_HOME_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: PUBLIC_SITE_NAME,
    title: PUBLIC_HOME_TITLE,
    description: PUBLIC_HOME_DESCRIPTION,
  },
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

