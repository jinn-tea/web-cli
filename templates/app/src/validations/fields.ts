import { z } from "zod";
import { FIELD_LIMITS } from "@/constants";

/**
 * Reusable Zod field primitives — the `FieldValidators` equivalent.
 *
 * Every schema in the app composes these instead of re-writing regexes, so
 * validation rules and their messages stay identical everywhere.
 *
 * IMPORTANT: messages are **i18n keys**, not English sentences. `FormMessage`
 * resolves them through the catalog, so validation errors are translated like
 * any other string (a non-key string passes through unchanged, which is how
 * server-supplied messages still render).
 */

export const emailField = z
  .string()
  .min(1, "validation.required")
  .max(FIELD_LIMITS.email, "validation.maxLength")
  .email("validation.email")
  // Normalize so "  Ada@Example.COM " and "ada@example.com" are one account.
  .transform((value) => value.trim().toLowerCase());

export const passwordField = z
  .string()
  .min(FIELD_LIMITS.passwordMin, "validation.passwordWeak")
  .max(FIELD_LIMITS.passwordMax, "validation.maxLength")
  .regex(/[A-Za-z]/, "validation.passwordWeak")
  .regex(/[0-9]/, "validation.passwordWeak");

export const nameField = z
  .string()
  .min(1, "validation.required")
  .max(FIELD_LIMITS.name, "validation.maxLength")
  .transform((value) => value.trim());

export const phoneField = z
  .string()
  .min(1, "validation.required")
  .max(FIELD_LIMITS.phone, "validation.maxLength")
  // Deliberately permissive: E.164-ish, formatting characters allowed.
  .regex(/^\+?[\d\s()-]{6,}$/, "validation.phone");

export const urlField = z
  .string()
  .min(1, "validation.required")
  .url("validation.url");

export const descriptionField = z
  .string()
  .max(FIELD_LIMITS.description, "validation.maxLength")
  .transform((value) => value.trim());

/** An optional text field: empty string and `undefined` both mean "not set". */
export function optionalText(schema: z.ZodTypeAny = z.string()) {
  return z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );
}

/** Confirm-password refinement for any schema with `password`/`confirmPassword`. */
export function withPasswordConfirmation<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
) {
  return schema.refine(
    (data) =>
      (data as { password?: string; confirmPassword?: string }).password ===
      (data as { confirmPassword?: string }).confirmPassword,
    {
      message: "validation.passwordMismatch",
      path: ["confirmPassword"],
    },
  );
}
