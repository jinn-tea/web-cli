"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ForgotPasswordForm } from "@/features/common/auth/components/forgot-password-form";
import { useTranslations } from "@/i18n";

export default function ForgotPasswordPage() {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-h2">
          {t("auth.forgotPassword.title")}
        </CardTitle>
        <CardDescription>{t("auth.forgotPassword.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
