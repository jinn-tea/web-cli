import { z } from "zod";
import { emailField, passwordField } from "@/validations/fields";

/**
 * Auth request schemas — the single source of truth for these shapes.
 *
 * The FORM validates with them and the SERVER route handler re-parses with the
 * same schema, so client and server can never drift. Types are inferred, never
 * hand-written beside the schema.
 *
 * Messages are i18n keys (see `validations/fields`).
 */

export const loginSchema = z.object({
  email: emailField,
  // Deliberately NOT `passwordField`: complexity rules belong on registration.
  // Enforcing them at sign-in just blocks users whose password predates the
  // rule, and tells an attacker what the policy is.
  password: z.string().min(1, "validation.required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(1, "validation.required"),
  email: emailField,
  password: passwordField,
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordField,
    confirmPassword: z.string().min(1, "validation.required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "validation.passwordMismatch",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
