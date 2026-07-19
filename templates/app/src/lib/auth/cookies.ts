import "server-only";

import { cookies } from "next/headers";
import { serverEnv } from "@/config/env";

/**
 * The refresh-token cookie — the durable half of the session, and the reason
 * an XSS payload can't walk away with a long-lived credential.
 *
 * `httpOnly` keeps it out of JavaScript entirely; `sameSite: lax` blocks
 * cross-site POSTs from using it while still surviving normal navigation.
 */
const COOKIE_NAME = serverEnv.SESSION_COOKIE_NAME;

/** 30 days — matches a typical refresh-token lifetime. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function setRefreshCookie(refreshToken: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, refreshToken, {
    httpOnly: true,
    // Not `secure` in development, where localhost is plain HTTP.
    secure: serverEnv.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readRefreshCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function clearRefreshCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export { COOKIE_NAME as SESSION_COOKIE_NAME };
