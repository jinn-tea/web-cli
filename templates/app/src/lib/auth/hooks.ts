"use client";

import type { Role, RoleGroup } from "@/constants";
import { roleGroupFor } from "@/constants";
import { useSessionStore } from "./session-store";
import type { AuthUser, SessionStatus } from "./types";

/**
 * Session selectors.
 *
 * Always subscribe with a SELECTOR (as these do) rather than reading the whole
 * store — a whole-store subscription re-renders on every unrelated change.
 */

export function useCurrentUser(): AuthUser | null {
  return useSessionStore((state) => state.user);
}

export function useSessionStatus(): SessionStatus {
  return useSessionStore((state) => state.status);
}

export function useIsAuthenticated(): boolean {
  return useSessionStore((state) => state.status === "authenticated");
}

/** The signed-in user's role, or null while the session resolves. */
export function useCurrentRole(): Role | null {
  return useSessionStore((state) => state.user?.role ?? null);
}

/** The backend URL group for the current role — what repositories take. */
export function useRoleGroup(): RoleGroup | null {
  const role = useCurrentRole();
  return role ? roleGroupFor(role) : null;
}

/** Guard a UI affordance: `useHasRole(["admin"])`. Never a security boundary. */
export function useHasRole(roles: readonly Role[]): boolean {
  const role = useCurrentRole();
  return role !== null && roles.includes(role);
}
