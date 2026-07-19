"use client";

import {
  useController,
  type FieldPath,
  type FieldValues,
  type UseControllerProps,
} from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useFieldError } from "./use-field-error";

export interface TextareaFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends UseControllerProps<TFieldValues, TName> {
  label: string;
  description?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
}

export function TextareaField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  label,
  description,
  placeholder,
  rows = 4,
  disabled,
  className,
  ...controllerProps
}: TextareaFieldProps<TFieldValues, TName>) {
  const { field, fieldState } = useController(controllerProps);
  const error = useFieldError(fieldState.error?.message);

  const errorId = `${field.name}-error`;
  const descriptionId = `${field.name}-description`;

  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Textarea
        {...field}
        id={field.name}
        value={field.value ?? ""}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled ?? field.disabled}
        aria-invalid={!!error}
        aria-describedby={
          [error ? errorId : null, description ? descriptionId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      {description ? (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      ) : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
}
