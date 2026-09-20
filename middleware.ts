import { NextResponse, type NextRequest } from "next/server";
import { isAdminDashboardPath } from "@/lib/admin-dashboard-routes";
import { placeGoogleTagAtStartOfHead } from "@/lib/google-tag";
import { getMiddlewareUserRole, updateSession } from "@/utils/supabase/middleware";

const GTAG_PASSTHROUGH_HEADER = "x-gtag-passthrough";

function isHomepageHtmlNavigation(request: NextRequest): boolean {
  if (request.method !== "GET") return false;
  if (request.nextUrl.pathname !== "/") return false;
  if (request.headers.get(GTAG_PASSTHROUGH_HEADER) === "1") return false;
  if (request.headers.get("next-router-prefetch")) return false;
  const purpose = `${request.headers.get("purpose") ?? ""} ${request.headers.get("sec-purpose") ?? ""}`;
  if (/prefetch|prerender/i.test(purpose)) return false;
  const dest = (request.headers.get("sec-fetch-dest") ?? "").toLowerCase();
  if (dest && !["document", "frame", "iframe", "empty"].includes(dest)) return false;
  return true;
}

async function injectGoogleTagForHomepage(
  request: NextRequest,
  sessionResponse: NextResponse,
): Promise<NextResponse> {
  const headers = new Headers(request.headers);
  headers.set(GTAG_PASSTHROUGH_HEADER, "1");

  const raw = await fetch(request.url, {
    headers,
    redirect: "manual",
  });

  const contentType = raw.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("text/html") || !raw.body) {
    return sessionResponse;
  }

  const html = placeGoogleTagAtStartOfHead(await raw.text());
  const outHeaders = new Headers(raw.headers);
  for (const name of [
    "content-length",
    "content-encoding",
    "etag",
    "content-digest",
    "digest",
  ]) {
    outHeaders.delete(name);
  }

  const out = new NextResponse(html, {
    status: raw.status,
    statusText: raw.statusText,
    headers: outHeaders,
  });

  for (const cookie of sessionResponse.cookies.getAll()) {
    out.cookies.set(cookie);
  }

  return out;
}

export async function middleware(request: NextRequest) {
  try {
    const { response, user, supabase } = await updateSession(request);
    const pathname = request.nextUrl.pathname;

    const isKioscoPath = pathname === "/kiosco" || pathname.startsWith("/kiosco/");

    // Landing y demás rutas públicas: solo refrescar cookies, sin redirecciones
    if (pathname !== "/login" && !pathname.startsWith("/dashboard") && !isKioscoPath) {
      if (isHomepageHtmlNavigation(request)) {
        try {
          return await injectGoogleTagForHomepage(request, response);
        } catch (err) {
          console.error("middleware gtag inject:", err);
          return response;
        }
      }
      return response;
    }

    // Proteger dashboard y kiosco: sin sesión → login (con redirectTo)
    if ((pathname.startsWith("/dashboard") || isKioscoPath) && !user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Rutas admin: empleados → inicio del dashboard (no solo ocultar en sidebar)
    if (user && isAdminDashboardPath(pathname)) {
      const role = await getMiddlewareUserRole(supabase, user.id);
      if (role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // Si ya está autenticado y entra a /login, ir al dashboard
    if (pathname === "/login" && user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return response;
  } catch (err) {
    console.error("middleware:", err);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

/**
 * Incluye `/` para refrescar sesión Supabase en la landing.
 * La lógica de redirección aplica a `/login`, `/dashboard` y `/kiosco`.
 */
export const config = {
  matcher: ["/", "/login", "/dashboard", "/dashboard/:path*", "/kiosco", "/kiosco/:path*"],
};
