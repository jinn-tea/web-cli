import type { MessageKey } from "@/i18n/types";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * THE SINGLE SOURCE OF TRUTH FOR ROLES.
 *
 * Never hardcode a role string anywhere else — import from here.
 *
 * Every map below is a `Record<Role, …>`, which makes them **exhaustive by the
 * type system**: adding a role to `ROLES` turns every incomplete map into a
 * compile error, so `tsc` hands you the list of decisions to make instead of
 * letting a role silently fall through a `switch`. That is exactly what
 * `codeable-web role <name>` relies on.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const ROLES = ["admin", "member"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/**
 * Backend URL groups. Many backends scope endpoints by a coarser grouping than
 * the role itself (`/admin/*`, `/member/*`), and several roles can share one
 * group — that mapping lives here, and repositories take a `RoleGroup` so one
 * parameterized repository serves every role instead of N copy-pasted forks.
 *
 * When your backend does NOT group endpoints, keep this an identity map.
 */
export const ROLE_GROUPS = ["admin", "member"] as const;

export type RoleGroup = (typeof ROLE_GROUPS)[number];

export const ROLE_TO_GROUP: Record<Role, RoleGroup> = {
  admin: "admin",
  member: "member",
};

export function roleGroupFor(role: Role): RoleGroup {
  return ROLE_TO_GROUP[role];
}

/** i18n keys for role display names — never render a raw role string. */
export const ROLE_LABEL_KEYS: Record<Role, MessageKey> = {
  admin: "roles.admin",
  member: "roles.member",
};

/** Roles allowed to invite other users. Extend the same way for any capability. */
export const INVITE_CAPABLE_ROLES = [
  "admin",
] as const satisfies readonly Role[];

export function canInvite(role: Role): boolean {
  return (INVITE_CAPABLE_ROLES as readonly Role[]).includes(role);
}
