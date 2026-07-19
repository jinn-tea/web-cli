"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { FormActions } from "@/components/form/form-actions";
import { TextField } from "@/components/form/text-field";
import { AUTH_ROUTES } from "@/constants";
import { useTranslations } from "@/i18n";
import { useForgotPassword } from "@/features/common/auth/services/use-auth";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/features/common/auth/validations/auth.schema";

export function ForgotPasswordForm() {
  const t = useTranslations();
  const forgotMutation = useForgotPassword();

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  // Deliberately the same message whether or not the address exists — telling
  // the user "no such account" hands an attacker a way to enumerate them.
  if (forgotMutation.isSuccess) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-body">{t("auth.forgotPassword.sent")}</p>
        <Link
          href={AUTH_ROUTES.login}
          className="text-caption underline underline-offset-4"
        >
          {t("auth.register.signIn")}
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit((values) => forgotMutation.mutate(values))}
      className="flex flex-col gap-4"
      noValidate
    >
      <TextField
        control={form.control}
        name="email"
        label={t("auth.fields.email")}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoFocus
      />
      <FormActions
        isPending={forgotMutation.isPending}
        submitLabel={t("auth.forgotPassword.submit")}
        className="justify-stretch [&>button]:w-full"
      />
      <p className="text-caption text-muted-foreground text-center">
        <Link href={AUTH_ROUTES.login} className="underline underline-offset-4">
          {t("auth.register.signIn")}
        </Link>
      </p>
    </form>
  );
}
