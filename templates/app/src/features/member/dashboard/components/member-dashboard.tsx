"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useTranslations } from "@/i18n";
import { useCurrentUser } from "@/lib/auth";

/** The member surface of `/dashboard`. See the admin twin for the convention. */
export function MemberDashboard() {
  const t = useTranslations();
  const user = useCurrentUser();

  return (
    <>
      <PageHeader
        title={t("dashboard.welcome", { name: user?.name ?? "" })}
        description={t("dashboard.memberSubtitle")}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-h3">{t("dashboard.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title={t("dashboard.empty")}
            hint={t("dashboard.emptyHint")}
          />
        </CardContent>
      </Card>
    </>
  );
}
