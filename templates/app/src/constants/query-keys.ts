import type { RoleGroup } from "./roles";

/**
 * Centralized React Query cache keys.
 *
 * Always import from here — an inline `queryKey: ["orders"]` typo silently
 * breaks cache sharing and invalidation, and nothing fails loudly.
 *
 * Keys for data that DIFFERS BY ROLE take the role group as their first
 * segment, so an admin's rows can never be served from a member's cache (and
 * vice versa) after a role switch.
 *
 * Shape convention per resource:
 *   all              → invalidate everything for the resource
 *   list(group, p)   → a filtered/paginated list
 *   detail(group, id)→ one entity
 */

export const QUERY_KEYS = {
  session: {
    all: ["session"] as const,
    currentUser: () => [...QUERY_KEYS.session.all, "current-user"] as const,
  },
  // codeable-web:query-keys — the `domain` generator appends new factories here.
} as const;

/** Params any paginated list accepts; extend per domain as needed. */
export interface ListParams {
  page?: number;
  q?: string;
  sort?: string;
  [key: string]: unknown;
}

/**
 * Helper the `domain` generator uses so every resource gets an identical,
 * role-scoped key shape without repeating the boilerplate.
 */
export function resourceKeys<const T extends string>(resource: T) {
  const all = [resource] as const;
  return {
    all,
    list: (group: RoleGroup, params?: ListParams) =>
      [...all, group, "list", params ?? {}] as const,
    detail: (group: RoleGroup, id: string) =>
      [...all, group, "detail", id] as const,
  };
}
