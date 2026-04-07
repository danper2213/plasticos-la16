import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    const { response, user } = await updateSession(request);
    const pathname = request.nextUrl.pathname;

    // Proteger dashboard: sin sesión → login (con redirectTo)
    if (pathname.startsWith("/dashboard") && !user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Si ya está autenticado y entra a /login, ir al dashboard
    if (pathname === "/login" && user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return response;
  } catch (err) {
    console.error("middleware:", err);
    return NextResponse.next();
  }
}

/**
 * Solo rutas que necesitan sesión Supabase o protección.
 * Evita ejecutar middleware en `/` (landing): el prefetch de `/dashboard` devolvía 302 al login
 * y en producción podía interferir con la carga de la página pública.
 */
export const config = {
  matcher: ["/login", "/dashboard", "/dashboard/:path*"],
};
