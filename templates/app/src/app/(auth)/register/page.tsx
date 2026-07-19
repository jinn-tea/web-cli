"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/features/common/auth/components/register-form";
import { useTranslations } from "@/i18n";

export default function RegisterPage() {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-h2">{t("auth.register.title")}</CardTitle>
        <CardDescription>{t("auth.register.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
