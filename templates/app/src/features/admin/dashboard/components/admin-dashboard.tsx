"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useTranslations } from "@/i18n";
import { useCurrentUser } from "@/lib/auth";

/**
 * The admin surface of `/dashboard`.
 *
 * Role-specific screens live in their role's folder — a domain moves to
 * `features/common/` only once a SECOND role genuinely shares it. Generate more
 * with `jinn-web domain <name> --role admin`.
 */
export function AdminDashboard() {
  const t = useTranslations();
  const user = useCurrentUser();

  return (
    <>
      <PageHeader
        title={t("dashboard.welcome", { name: user?.name ?? "" })}
        description={t("dashboard.adminSubtitle")}
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
