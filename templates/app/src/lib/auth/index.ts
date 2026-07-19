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
export {
  useCurrentUser,
  useCurrentRole,
  useRoleGroup,
  useSessionStatus,
  useIsAuthenticated,
  useHasRole,
} from "./hooks";
export { RequireAuth, RequireGuest, RequireRole } from "./guards";
export {
  login,
  logout,
  refreshSession,
  bootstrapSession,
  initAuthTransport,
} from "./session";
export { AUTH_ENDPOINTS, SESSION_ROUTES } from "./endpoints";
export type {
  AuthUser,
  SessionPayload,
  SessionStatus,
  BackendAuthPayload,
} from "./types";
