"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
// jinn-web:role-only:start
import { navItemsForRole } from "@/components/layout/nav-config";
// jinn-web:role-only:end
// jinn-web:roleless:start
// import { navItems } from "@/components/layout/nav-config";
// jinn-web:roleless:end
import { useTranslations } from "@/i18n";
// jinn-web:role-only:start
import { useCurrentRole } from "@/lib/auth";
// jinn-web:role-only:end

/**
 * ⌘K palette over the navigation table.
 *
 * It reads the SAME `NAV_ITEMS` the sidebar does, filtered by the same role
 * rules — so a screen can't appear here that the user can't reach, and adding a
 * domain wires both surfaces at once. A palette with its own hand-maintained
 * list is a palette that goes stale.
 */
export function CommandMenu() {
  const t = useTranslations();
  const router = useRouter();
  // jinn-web:role-only:start
  const role = useCurrentRole();
  // jinn-web:role-only:end
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // jinn-web:role-only:start
  const items = navItemsForRole(role);
  // jinn-web:role-only:end
  // jinn-web:roleless:start
  // const items = navItems();
  // jinn-web:roleless:end

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t("nav.commandMenu")}
      description={t("nav.commandMenu")}
    >
      <CommandInput placeholder={t("nav.commandMenu")} />
      <CommandList>
        <CommandEmpty>{t("common.states.noResults")}</CommandEmpty>
        <CommandGroup>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={`${item.href}-${item.labelKey}`}
                value={t(item.labelKey)}
                onSelect={() => {
                  setOpen(false);
                  router.push(item.href);
                }}
              >
                <Icon className="size-4" aria-hidden="true" />
                {t(item.labelKey)}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
