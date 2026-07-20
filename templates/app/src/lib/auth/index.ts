/**
 * Auth is INFRASTRUCTURE, not a feature.
 *
 * Session state, role selectors and route guards live here — under `lib/` —
 * because every domain needs identity. If this lived in `features/common/auth`,
 * every sibling domain would import a peer feature for it, which is exactly the
 * coupling the layering rules forbid. `features/common/auth` keeps only the
 * login/register SCREENS.
 */
export { useSessionStore, getCurrentUser } from "./session-store";
export { useCurrentUser, useSessionStatus, useIsAuthenticated } from "./hooks";
// jinn-web:role-only:start
export { useCurrentRole, useRoleGroup, useHasRole } from "./hooks";
export { RequireRole } from "./guards";
// jinn-web:role-only:end
export { RequireAuth, RequireGuest } from "./guards";
export {
  login,
  logout,
  refreshSession,
  bootstrapSession,
  initAuthTransport,
} from "./session";
export { AUTH_ENDPOINTS, SESSION_ROUTES } from "./endpoints";
export { authUserSchema, backendAuthPayloadSchema } from "./types";
export type {
  AuthUser,
  SessionPayload,
  SessionStatus,
  BackendAuthPayload,
} from "./types";
