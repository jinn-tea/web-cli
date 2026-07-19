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
import { navItemsForRole } from "@/components/layout/nav-config";
import { useTranslations } from "@/i18n";
import { useCurrentRole } from "@/lib/auth";

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
  const role = useCurrentRole();
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

  const items = navItemsForRole(role);

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
