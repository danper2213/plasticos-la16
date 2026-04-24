import type { Metadata } from "next";
import { LoginPageClient } from "./login-page-client";

export const metadata: Metadata = {
  title: "Iniciar sesión | PLASTICOS LA 16",
  description: "Acceso al panel de gestión.",
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return <LoginPageClient />;
}
