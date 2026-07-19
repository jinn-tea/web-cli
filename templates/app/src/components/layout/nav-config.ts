import {
  LayoutDashboard,
  Settings,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { APP_ROUTES } from "@/constants";
// jinn-web:role-only:start
import type { Role } from "@/constants";
// jinn-web:role-only:end
import type { MessageKey } from "@/i18n";

// jinn-web:role-only:start
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
// jinn-web:role-only:end
// jinn-web:roleless:start
// /**
//  * The navigation table — one declarative source for the sidebar, the command
//  * menu, and breadcrumbs.
//  *
//  * This app has no roles, so every item is shown to everyone signed in.
//  * `jinn-web role <name>` adds role filtering here if that changes.
//  */
// jinn-web:roleless:end
export interface NavItem {
  href: string;
  labelKey: MessageKey;
  icon: LucideIcon;
  // jinn-web:role-only:start
  roles: "all" | readonly Role[];
  // jinn-web:role-only:end
}

/** `jinn-web domain` appends new items to this array. */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: APP_ROUTES.dashboard,
    labelKey: "nav.dashboard",
    icon: LayoutDashboard,
    // jinn-web:role-only:start
    roles: "all",
    // jinn-web:role-only:end
  },
  {
    href: APP_ROUTES.orders,
    labelKey: "orders.title",
    icon: ShoppingCart,
    // jinn-web:role-only:start
    roles: ["admin"],
    // jinn-web:role-only:end
  },
  {
    href: APP_ROUTES.settings,
    labelKey: "nav.settings",
    icon: Settings,
    // jinn-web:role-only:start
    roles: "all",
    // jinn-web:role-only:end
  },
];

// jinn-web:role-only:start
export function navItemsForRole(role: Role | null): readonly NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter(
    (item) => item.roles === "all" || item.roles.includes(role),
  );
}
// jinn-web:role-only:end
// jinn-web:roleless:start
// /** Every nav item — this app has no roles to filter by. */
// export function navItems(): readonly NavItem[] {
//   return NAV_ITEMS;
// }
// jinn-web:roleless:end
