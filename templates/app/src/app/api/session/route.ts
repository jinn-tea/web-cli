import { NextResponse } from "next/server";
import { z } from "zod";
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
import { emailField } from "@/validations/fields";

/**
 * Session endpoint — the entire reason this app has a `/api` route at all.
 *
 * POST   sign in  → exchange credentials at the backend, park the REFRESH token
 *                   in an httpOnly cookie, return only the user + a short-lived
 *                   access token to the browser.
 * DELETE sign out → clear the cookie (and tell the backend, best-effort).
 *
 * Keep this thin: validate, call the backend, set/clear the cookie. No business
 * logic — the backend is still the source of truth and the security boundary.
 */

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "errors.validation" }, { status: 422 });
  }

  try {
    const payload = await serverRequest<BackendAuthPayload>(
      AUTH_ENDPOINTS.login,
      {
        method: "POST",
        body: parsed.data,
        acceptLanguage: request.headers.get("accept-language") ?? undefined,
      },
    );

    await setRefreshCookie(payload.tokens.refreshToken);

    // Login must identify the user; fall back to /auth/me if this backend
    // returns tokens only.
    const user =
      payload.user ??
      (await serverRequest<AuthUser>(AUTH_ENDPOINTS.me, {
        accessToken: payload.tokens.token,
        acceptLanguage: request.headers.get("accept-language") ?? undefined,
      }));

    const session: SessionPayload = {
      user,
      accessToken: payload.tokens.token,
    };
    return NextResponse.json(session);
  } catch (error) {
    reportError(error, { scope: "api.session.login" });
    const status = isApiError(error) ? error.statusCode : 500;
    const message = isApiError(error) ? error.message : "errors.generic";
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE() {
  const refreshToken = await readRefreshCookie();

  // Clear locally FIRST: the user must end up signed out even if the backend
  // call fails, otherwise a network blip traps them in a half-signed-in state.
  await clearRefreshCookie();

  if (refreshToken) {
    try {
      await serverRequest(AUTH_ENDPOINTS.logout, {
        method: "POST",
        body: { refreshToken },
      });
    } catch (error) {
      reportError(error, { scope: "api.session.logout" });
    }
  }

  return new NextResponse(null, { status: 204 });
}
