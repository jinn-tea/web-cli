import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_AUTHED_ROUTE,
  DEFAULT_GUEST_ROUTE,
  DEFAULT_SESSION_COOKIE_NAME,
  PUBLIC_ROUTES,
} from "@/constants";

/**
 * Optimistic auth gate.
 *
 * ⚠️ Next 16 renamed Middleware → **Proxy**. This file must be `src/proxy.ts`
 * exporting `proxy()`; the old `middleware.ts` name still runs but is
 * deprecated and warns on every build.
 *
 * A server-side gate is possible ONLY because the session lives in a cookie:
 * with a localStorage bearer token the server sees nothing, and every protected
 * page has to render and flash before the client can redirect.
 *
 * Deliberately shallow — it checks cookie PRESENCE and nothing else:
 *  - no backend calls: this runs on every navigation and prefetch, so a fetch
 *    here would tax the whole app
 *  - no trust: a cookie can be stale or forged. Real authorization happens in
 *    the backend on every request; this only avoids showing a doomed screen.
 */
const SESSION_COOKIE =
  process.env.SESSION_COOKIE_NAME ?? DEFAULT_SESSION_COOKIE_NAME;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  // The design-system reference is dev-only (the page itself 404s in
  // production) and must be reachable without signing in.
  if (
    process.env.NODE_ENV !== "production" &&
    pathname.startsWith("/design-system")
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = DEFAULT_GUEST_ROUTE;
    // Remember where they were headed so login can send them back.
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = DEFAULT_AUTHED_ROUTE;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip static assets and API routes — matching them would run this on every
  // image and on the session endpoints themselves.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
