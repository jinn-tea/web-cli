"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { FormActions } from "@/components/form/form-actions";
import { TextField } from "@/components/form/text-field";
import { AUTH_ROUTES } from "@/constants";
import { useTranslations } from "@/i18n";
import { useRegister } from "@/features/common/auth/services/use-auth";
import {
  registerSchema,
  type RegisterInput,
} from "@/features/common/auth/validations/auth.schema";

export function RegisterForm() {
  const t = useTranslations();
  const registerMutation = useRegister();

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
    // Validate on blur, then live once a field has errored — complaining on
    // the first keystroke of an email nobody has finished typing is hostile.
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => registerMutation.mutate(values))}
      className="flex flex-col gap-4"
      noValidate
    >
      <TextField
        control={form.control}
        name="name"
        label={t("auth.fields.name")}
        autoComplete="name"
        autoFocus
      />
      <TextField
        control={form.control}
        name="email"
        label={t("auth.fields.email")}
        type="email"
        inputMode="email"
        autoComplete="email"
      />
      <TextField
        control={form.control}
        name="password"
        label={t("auth.fields.password")}
        type="password"
        // `new-password` tells the password manager to OFFER one rather than
        // autofilling the existing credential.
        autoComplete="new-password"
      />
      <FormActions
        isPending={registerMutation.isPending}
        submitLabel={t("auth.register.submit")}
        className="justify-stretch [&>button]:w-full"
      />
      <p className="text-caption text-muted-foreground text-center">
        {t("auth.register.hasAccount")}{" "}
        <Link href={AUTH_ROUTES.login} className="underline underline-offset-4">
          {t("auth.register.signIn")}
        </Link>
      </p>
    </form>
  );
}
