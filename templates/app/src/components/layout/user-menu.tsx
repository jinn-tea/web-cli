"use client";

import { LogOut, Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_ROUTES, DEFAULT_GUEST_ROUTE } from "@/constants";
// jinn-web:role-only:start
import { ROLE_LABEL_KEYS } from "@/constants";
// jinn-web:role-only:end
import { useTranslations } from "@/i18n";
import { logout, useCurrentUser } from "@/lib/auth";
import { initials } from "@/lib/format";

export function UserMenu() {
  const t = useTranslations();
  const user = useCurrentUser();
  const router = useRouter();

  if (!user) return null;

  const handleSignOut = async () => {
    await logout();
    router.replace(DEFAULT_GUEST_ROUTE);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t("nav.account")}
        >
          <Avatar className="size-8">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback className="text-caption">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          {/* min-w-0 + truncate: emails are routinely longer than this menu. */}
          <div className="flex min-w-0 flex-col">
            <span className="text-label truncate">{user.name}</span>
            <span className="text-caption text-muted-foreground truncate">
              {user.email}
            </span>
            {/* jinn-web:role-only:start */}
            <span className="text-caption text-muted-foreground mt-1">
              {t(ROLE_LABEL_KEYS[user.role])}
            </span>
            {/* jinn-web:role-only:end */}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={APP_ROUTES.settings}>
            <SettingsIcon className="size-4" aria-hidden="true" />
            {t("nav.settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleSignOut()}>
          <LogOut className="size-4" aria-hidden="true" />
          {t("nav.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
