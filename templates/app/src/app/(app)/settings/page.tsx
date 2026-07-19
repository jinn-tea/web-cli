"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { PageHeader } from "@/components/shared/page-header";
import { DEFAULT_GUEST_ROUTE, ROLE_LABEL_KEYS } from "@/constants";
import { useTranslations } from "@/i18n";
import { logout, useCurrentUser } from "@/lib/auth";

export default function SettingsPage() {
  const t = useTranslations();
  const user = useCurrentUser();
  const router = useRouter();

  const handleSignOut = async () => {
    await logout();
    router.replace(DEFAULT_GUEST_ROUTE);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.subtitle")}
      />

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-h4">{t("settings.profile")}</CardTitle>
            <CardDescription>{t("settings.profileHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-[8rem_1fr]">
              <dt className="text-label text-muted-foreground">
                {t("auth.fields.name")}
              </dt>
              {/* min-w-0 + truncate so a long name can't widen the card. */}
              <dd className="text-body min-w-0 truncate">{user?.name}</dd>

              <dt className="text-label text-muted-foreground">
                {t("auth.fields.email")}
              </dt>
              <dd className="text-body min-w-0 truncate">{user?.email}</dd>

              <dt className="text-label text-muted-foreground">
                {t("nav.account")}
              </dt>
              <dd className="text-body">
                {user ? t(ROLE_LABEL_KEYS[user.role]) : null}
              </dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-h4">
              {t("settings.preferences")}
            </CardTitle>
            <CardDescription>{t("settings.preferencesHint")}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-label">{t("common.language")}</span>
            <LanguageSwitcher />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-h4">{t("settings.danger")}</CardTitle>
            <CardDescription>{t("settings.signOutHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void handleSignOut()}>
              {t("nav.signOut")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
