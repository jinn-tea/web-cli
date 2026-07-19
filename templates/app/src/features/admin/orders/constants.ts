import type { RoleGroup } from "@/constants";

/**
 * Every endpoint this domain touches — written down exactly once.
 *
 * Paths are built from a `RoleGroup`, not hardcoded per role: when two roles
 * hit the same resource under different prefixes (`/admin/orders` vs
 * `/member/orders`), ONE parameterized repository serves both. Forking a
 * repository per role is how a codebase ends up with four copies of the same
 * CRUD drifting apart.
 */
export const ordersEndpoints = (group: RoleGroup) => ({
  list: `/${group}/orders`,
  detail: (id: string) => `/${group}/orders/${id}`,
  create: `/${group}/orders`,
  update: (id: string) => `/${group}/orders/${id}`,
  remove: (id: string) => `/${group}/orders/${id}`,
});

/** Rows per page for this domain's list. */
export const ORDERS_PAGE_SIZE = 20;
