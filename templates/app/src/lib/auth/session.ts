"use client";

import {
  ApiError,
  setOnSessionExpired,
  setTokenRefresher,
  tokenStore,
} from "@/lib/http";
import { useLocaleStore } from "@/i18n/locale-store";
import { isLocale } from "@/i18n/locales";
import { reportError } from "@/lib/reporting";
import { SESSION_ROUTES } from "./endpoints";
import { useSessionStore } from "./session-store";
import type { SessionPayload } from "./types";

/**
 * Session lifecycle — the browser half of the BFF auth model.
 *
 * The browser NEVER sees the refresh token. It talks to same-origin
 * `/api/session*` route handlers, which hold the refresh token in an httpOnly
 * cookie and hand back a short-lived access token that lives only in memory.
 *
 * (These are the one sanctioned `fetch` calls outside `lib/http` — they target
 * our own origin, not the backend, and exist precisely so the transport never
 * has to know about cookies.)
 */

async function sessionFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    // Send/receive the session cookie.
    credentials: "same-origin",
  });

  const payload = (await res.json().catch(() => null)) as
    (T & { message?: string }) | null;

  if (!res.ok) {
    throw new ApiError(res.status, payload?.message ?? "Request failed");
  }
  return payload as T;
}

/** Apply a session to the app: token in memory, user in the store, locale synced. */
function applySession({ user, accessToken }: SessionPayload): void {
  tokenStore.set(accessToken);
  useSessionStore.getState().setSession(user);

  // Adopt the user's saved language so the UI matches their profile.
  if (user.language && isLocale(user.language)) {
    useLocaleStore.getState().setLocale(user.language);
  }
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<SessionPayload> {
  const session = await sessionFetch<SessionPayload>(SESSION_ROUTES.session, {
    method: "POST",
    body: JSON.stringify(input),
  });
  applySession(session);
  return session;
}

export async function logout(): Promise<void> {
  try {
    await sessionFetch(SESSION_ROUTES.session, { method: "DELETE" });
  } catch (error) {
    // A failed server logout must not trap the user in a signed-in UI.
    reportError(error, { scope: "auth.logout" });
  } finally {
    tokenStore.clear();
    useSessionStore.getState().clearSession();
  }
}

/** Exchange the refresh cookie for a fresh access token (+ the current user). */
export async function refreshSession(): Promise<SessionPayload> {
  const session = await sessionFetch<SessionPayload>(SESSION_ROUTES.refresh, {
    method: "POST",
  });
  applySession(session);
  return session;
}

/**
 * Restore the session on app start / full reload.
 *
 * There is no token in memory at this point — only the cookie — so this single
 * call is what turns "cookie exists" into "signed-in app".
 */
export async function bootstrapSession(): Promise<void> {
  try {
    await refreshSession();
  } catch {
    // No/expired cookie is the normal signed-out path, not an error.
    useSessionStore.getState().setUnauthenticated();
  }
}

/**
 * Wire the transport's refresh hook. Called ONCE at app start.
 *
 * The transport owns the single-flight + replay mechanics; this supplies only
 * the "how", which keeps endpoint knowledge out of `lib/http`.
 */
export function initAuthTransport(): void {
  setTokenRefresher(async () => {
    const { accessToken } = await refreshSession();
    return accessToken;
  });

  setOnSessionExpired(() => {
    tokenStore.clear();
    useSessionStore.getState().clearSession();
  });
}
