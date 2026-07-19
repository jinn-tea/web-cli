import { NextResponse } from "next/server";
import { AUTH_ENDPOINTS } from "@/lib/auth/endpoints";
import {
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from "@/lib/auth/cookies";
import type {
  AuthUser,
  BackendAuthPayload,
  SessionPayload,
} from "@/lib/auth/types";
import { isApiError } from "@/lib/http";
import { serverRequest } from "@/lib/http/server-client";
import { reportError } from "@/lib/reporting";

/**
 * Exchange the refresh cookie for a fresh access token.
 *
 * Called in two situations:
 *  - app start / full reload, to turn "cookie exists" into a live session
 *  - a 401 mid-session, via the transport's single-flight refresh
 *
 * It also returns the USER, so a reload needs one round trip instead of
 * refresh-then-fetch-me. Composing calls like this is exactly what a BFF is for.
 */
export async function POST(request: Request) {
  const refreshToken = await readRefreshCookie();
  if (!refreshToken) {
    return NextResponse.json({ message: "auth.sessionExpired" }, { status: 401 });
  }

  const acceptLanguage = request.headers.get("accept-language") ?? undefined;

  try {
    const payload = await serverRequest<BackendAuthPayload>(
      AUTH_ENDPOINTS.refresh,
      { method: "POST", body: { refreshToken }, acceptLanguage },
    );

    // Rotate: a refresh token that's used once and replaced limits the damage
    // if an old one ever leaks.
    await setRefreshCookie(payload.tokens.refreshToken);

    // Some backends return the user with the refresh, some don't — fetch it
    // only when needed.
    const user =
      payload.user ??
      (await serverRequest<AuthUser>(AUTH_ENDPOINTS.me, {
        accessToken: payload.tokens.token,
        acceptLanguage,
      }));

    const session: SessionPayload = {
      user,
      accessToken: payload.tokens.token,
    };
    return NextResponse.json(session);
  } catch (error) {
    // The cookie is unusable — drop it so the browser stops retrying with it.
    await clearRefreshCookie();
    reportError(error, { scope: "api.session.refresh" });
    const status = isApiError(error) ? error.statusCode : 401;
    return NextResponse.json({ message: "auth.sessionExpired" }, { status });
  }
}
