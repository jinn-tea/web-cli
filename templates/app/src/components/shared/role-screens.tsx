"use client";

import type { ReactNode } from "react";
import { useCurrentRole } from "@/lib/auth";
import type { Role } from "@/constants";
import { FullPageLoader } from "./full-page-loader";

/**
 * Declarative role dispatch: one URL, one surface per role.
 *
 * Multi-role apps constantly need "same route, different screen". Hand-writing
 * `if (role === "admin") … else if …` on every page drifts in shape from page
 * to page and silently does nothing when a new role appears.
 *
 * `screens` is a `Record<Role, ReactNode>`, so adding a role to `ROLES` makes
 * EVERY dispatch site a compile error until it's handled — the type system
 * hands you the todo list. Pass `fallback` only where a role genuinely has no
 * surface (and prefer `RequireRole` to keep it off the route entirely).
 */
export interface RoleScreensProps {
  screens: Record<Role, ReactNode>;
  /** Rendered while the session is still resolving. */
  pending?: ReactNode;
}

export function RoleScreens({ screens, pending }: RoleScreensProps) {
  const role = useCurrentRole();
  if (!role) return <>{pending ?? <FullPageLoader />}</>;
  return <>{screens[role]}</>;
}
