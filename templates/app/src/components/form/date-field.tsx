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
import { DatePicker } from "@/components/shared/date-picker";
import { useFieldError } from "./use-field-error";

export interface DateFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends UseControllerProps<TFieldValues, TName> {
  label: string;
  description?: string;
  placeholder?: string;
  fromDate?: Date;
  toDate?: Date;
  disabled?: boolean;
  className?: string;
}

export function DateField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  label,
  description,
  placeholder,
  fromDate,
  toDate,
  disabled,
  className,
  ...controllerProps
}: DateFieldProps<TFieldValues, TName>) {
  const { field, fieldState } = useController(controllerProps);
  const error = useFieldError(fieldState.error?.message);

  const errorId = `${field.name}-error`;
  const descriptionId = `${field.name}-description`;

  // Schemas usually store dates as ISO strings; accept either and hand the
  // picker a Date. (`field.value` is typed as the field's generic, so it needs
  // widening to `unknown` before the instanceof narrowing.)
  const rawValue: unknown = field.value;
  const selected =
    rawValue instanceof Date
      ? rawValue
      : typeof rawValue === "string" && rawValue
        ? new Date(rawValue)
        : null;

  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <DatePicker
        id={field.name}
        value={selected}
        onChange={field.onChange}
        placeholder={placeholder}
        fromDate={fromDate}
        toDate={toDate}
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
