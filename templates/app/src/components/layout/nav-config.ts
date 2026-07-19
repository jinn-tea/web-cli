import {
  LayoutDashboard,
  Settings,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { APP_ROUTES, type Role } from "@/constants";
import type { MessageKey } from "@/i18n";

/**
 * The navigation table — one declarative source for the sidebar, the command
 * menu, and breadcrumbs.
 *
 * Role visibility is DATA, not a pile of `{role === "admin" && <NavItem/>}`
 * conditionals scattered through the sidebar: `roles: "all"` or an explicit
 * list, filtered once by `navItemsForRole`. The same `href` may appear twice
 * with disjoint roles when two roles need differently-labelled entry points to
 * the same screen.
 *
 * ⚠️ Visibility is UX only. Hiding a link does not protect the route — the
 * backend authorizes every request, and `RequireRole` guards the screen.
 */
export interface NavItem {
  href: string;
  labelKey: MessageKey;
  icon: LucideIcon;
  roles: "all" | readonly Role[];
}

/** `codeable-web domain` appends new items to this array. */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: APP_ROUTES.dashboard,
    labelKey: "nav.dashboard",
    icon: LayoutDashboard,
    roles: "all",
  },
  {
    href: APP_ROUTES.orders,
    labelKey: "orders.title",
    icon: ShoppingCart,
    roles: ["admin"],
  },
  {
    href: APP_ROUTES.settings,
    labelKey: "nav.settings",
    icon: Settings,
    roles: "all",
  },
];

export function navItemsForRole(role: Role | null): readonly NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter(
    (item) => item.roles === "all" || item.roles.includes(role),
  );
}
