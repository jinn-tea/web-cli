"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { FormActions } from "@/components/form/form-actions";
import { TextField } from "@/components/form/text-field";
import { AUTH_ROUTES } from "@/constants";
import { useTranslations } from "@/i18n";
import { useLogin } from "@/features/common/auth/services/use-auth";
import {
  loginSchema,
  type LoginInput,
} from "@/features/common/auth/validations/auth.schema";

export function LoginForm() {
  const t = useTranslations();
  const loginMutation = useLogin();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    // Validate on blur, then live once a field has errored — nagging on the
    // first keystroke of an email nobody has finished typing is hostile.
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}
      className="flex flex-col gap-4"
      noValidate
    >
      <TextField
        control={form.control}
        name="email"
        label={t("auth.fields.email")}
        type="email"
        autoComplete="email"
        inputMode="email"
        autoFocus
      />

      <div className="flex flex-col gap-1.5">
        <TextField
          control={form.control}
          name="password"
          label={t("auth.fields.password")}
          type="password"
          autoComplete="current-password"
        />
        <Link
          href={AUTH_ROUTES.forgotPassword}
          className="text-caption text-muted-foreground hover:text-foreground self-end underline-offset-4 hover:underline"
        >
          {t("auth.login.forgotPassword")}
        </Link>
      </div>

      <FormActions
        isPending={loginMutation.isPending}
        submitLabel={t("auth.login.submit")}
        className="justify-stretch [&>button]:w-full"
      />
      <p className="text-caption text-muted-foreground text-center">
        {t("auth.login.noAccount")}{" "}
        <Link
          href={AUTH_ROUTES.register}
          className="underline underline-offset-4"
        >
          {t("auth.login.signUp")}
        </Link>
      </p>
    </form>
  );
}
