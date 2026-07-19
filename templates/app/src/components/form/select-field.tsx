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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFieldError } from "./use-field-error";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends UseControllerProps<TFieldValues, TName> {
  label: string;
  options: readonly SelectOption[];
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SelectField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  label,
  options,
  description,
  placeholder,
  disabled,
  className,
  ...controllerProps
}: SelectFieldProps<TFieldValues, TName>) {
  const { field, fieldState } = useController(controllerProps);
  const error = useFieldError(fieldState.error?.message);

  const errorId = `${field.name}-error`;
  const descriptionId = `${field.name}-description`;

  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Select
        value={field.value ?? ""}
        onValueChange={field.onChange}
        disabled={disabled ?? field.disabled}
      >
        <SelectTrigger
          id={field.name}
          aria-invalid={!!error}
          aria-describedby={
            [error ? errorId : null, description ? descriptionId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          // The trigger is a fixed-width box: without this, a long option label
          // widens it past its container instead of truncating.
          className="w-full min-w-0 overflow-hidden"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description ? (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      ) : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
}
