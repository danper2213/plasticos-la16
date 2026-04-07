import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    const { response, user } = await updateSession(request);
    const pathname = request.nextUrl.pathname;

    // Landing y demás rutas públicas: solo refrescar cookies, sin redirecciones
    if (pathname !== "/login" && !pathname.startsWith("/dashboard")) {
      return response;
    }

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
 * Incluye `/` para refrescar sesión Supabase en la landing.
 * La lógica de redirección solo aplica a `/login` y `/dashboard` (el prefetch de `/dashboard`
 * ya no afecta a `/` porque cada petición a `/` resuelve solo con `updateSession`).
 */
export const config = {
  matcher: ["/", "/login", "/dashboard", "/dashboard/:path*"],
};
