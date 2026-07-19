/**
 * Backend auth endpoint paths — the only place they are written down.
 *
 * These live in `lib/auth` rather than in a feature because both the SERVER
 * (the `/api/session` route handlers) and the CLIENT (password reset, profile)
 * call them, and infrastructure must not import from `features/`.
 */
export const AUTH_ENDPOINTS = {
  login: "/auth/login",
  register: "/auth/register",
  refresh: "/auth/refresh",
  logout: "/auth/logout",
  me: "/auth/me",
  forgotPassword: "/auth/forgot-password",
  resetPassword: "/auth/reset-password",
} as const;

/** Same-origin routes the browser uses for session lifecycle (never the backend
 *  directly — that's what keeps the refresh token in an httpOnly cookie). */
export const SESSION_ROUTES = {
  session: "/api/session",
  refresh: "/api/session/refresh",
} as const;
