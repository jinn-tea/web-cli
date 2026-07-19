"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "@/i18n";
// jinn-web:role-only:start
import { useCurrentRole } from "@/lib/auth";
// jinn-web:role-only:end
import { cn } from "@/lib/utils";
// jinn-web:role-only:start
import { navItemsForRole } from "./nav-config";
// jinn-web:role-only:end
// jinn-web:roleless:start
// import { navItems } from "./nav-config";
// jinn-web:roleless:end

/**
 * Primary navigation, filtered to what this role can actually reach.
 *
 * `aria-current="page"` (not just a background color) is what tells a screen
 * reader which item is active — color alone is never the sole signal.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations();
  const pathname = usePathname();
  // jinn-web:role-only:start
  const role = useCurrentRole();
  const items = navItemsForRole(role);
  // jinn-web:role-only:end
  // jinn-web:roleless:start
  // const items = navItems();
  // jinn-web:roleless:end

  return (
    <nav aria-label={t("nav.openMenu")} className="flex flex-col gap-0.5 p-2">
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={`${item.href}-${item.labelKey}`}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "text-label flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors",
              "focus-visible:ring-sidebar-ring focus-visible:ring-2 focus-visible:outline-none",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
