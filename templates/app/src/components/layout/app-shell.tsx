"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { clientEnv } from "@/config/env";
import { useTranslations } from "@/i18n";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

/**
 * The authed app frame: fixed sidebar on desktop, a Sheet on mobile.
 *
 * The main region scrolls independently of the sidebar so long tables don't
 * drag the navigation off-screen, and it carries `min-w-0` — without it a wide
 * table would stretch the grid track instead of scrolling inside its own
 * container, and the whole page would scroll sideways.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="bg-canvas flex min-h-svh">
      {/* Desktop sidebar */}
      <aside className="bg-sidebar hidden w-60 shrink-0 border-r md:flex md:flex-col">
        <div className="flex h-14 items-center border-b px-4">
          <span className="text-h4 truncate">{clientEnv.NEXT_PUBLIC_APP_NAME}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-card sticky top-0 z-20 flex h-14 items-center gap-2 border-b px-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label={t("nav.openMenu")}
              >
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-sidebar w-64 p-0">
              <SheetTitle className="flex h-14 items-center border-b px-4 text-left">
                {clientEnv.NEXT_PUBLIC_APP_NAME}
              </SheetTitle>
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />
          <LanguageSwitcher />
          <UserMenu />
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
