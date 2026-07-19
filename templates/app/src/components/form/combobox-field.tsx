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
import { Combobox, type ComboboxOption } from "@/components/shared/combobox";
import { useFieldError } from "./use-field-error";

/**
 * Searchable entity picker as a form field.
 *
 * For server-side search, pass `search`/`onSearchChange` from a debounced query
 * in the parent — the field itself stays presentational.
 */
export interface ComboboxFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends UseControllerProps<TFieldValues, TName> {
  label: string;
  options: readonly ComboboxOption[];
  description?: string;
  placeholder?: string;
  search?: string;
  onSearchChange?: (search: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ComboboxField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  label,
  options,
  description,
  placeholder,
  search,
  onSearchChange,
  isLoading,
  disabled,
  className,
  ...controllerProps
}: ComboboxFieldProps<TFieldValues, TName>) {
  const { field, fieldState } = useController(controllerProps);
  const error = useFieldError(fieldState.error?.message);

  const errorId = `${field.name}-error`;
  const descriptionId = `${field.name}-description`;

  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Combobox
        id={field.name}
        options={options}
        value={field.value ?? null}
        onChange={field.onChange}
        search={search}
        onSearchChange={onSearchChange}
        isLoading={isLoading}
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
