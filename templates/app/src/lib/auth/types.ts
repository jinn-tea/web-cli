// jinn-web:role-only:start
import type { Role } from "@/constants";
// jinn-web:role-only:end

/** The signed-in user, as the app needs them. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  // jinn-web:role-only:start
  role: Role;
  // jinn-web:role-only:end
  avatarUrl?: string | null;
  /** Preferred language, synced with the locale store on sign-in. */
  language?: string | null;
}

/** What `/api/session` returns to the browser. Note: NO refresh token — that
 *  stays in the httpOnly cookie and never reaches JavaScript. */
export interface SessionPayload {
  user: AuthUser;
  accessToken: string;
}

/**
 * Raw shape the backend returns from login/refresh (adjust to your API).
 *
 * `user` is optional because many backends return it on login but not on
 * refresh — the refresh route falls back to `/auth/me` when it's absent.
 */
export interface BackendAuthPayload {
  user?: AuthUser;
  tokens: {
    token: string;
    refreshToken: string;
  };
}

export type SessionStatus =
  | "loading" // still resolving on first paint
  | "authenticated"
  | "unauthenticated";
