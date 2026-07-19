"use client";

import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/common/auth/components/login-form";
import { useTranslations } from "@/i18n";

export default function LoginPage() {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-h2">{t("auth.login.title")}</CardTitle>
        <CardDescription>{t("auth.login.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* useSearchParams (read by useLogin for `?next=`) must sit under a
            Suspense boundary or the route opts out of static rendering. */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
