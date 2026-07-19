"use client";

import {
  useController,
  type FieldPath,
  type FieldValues,
  type UseControllerProps,
} from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { useFieldError } from "./use-field-error";

/**
 * A checkbox with its label to the right — the one field where the label
 * follows the control rather than preceding it.
 *
 * The whole label is clickable (`htmlFor`), which matters: a 16px checkbox is
 * well under the 44px comfortable target size on touch.
 */
export interface CheckboxFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends UseControllerProps<TFieldValues, TName> {
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function CheckboxField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  label,
  description,
  disabled,
  className,
  ...controllerProps
}: CheckboxFieldProps<TFieldValues, TName>) {
  const { field, fieldState } = useController(controllerProps);
  const error = useFieldError(fieldState.error?.message);
  const errorId = `${field.name}-error`;

  return (
    <Field data-invalid={!!error} className={className}>
      <div className="flex items-start gap-2.5">
        <Checkbox
          id={field.name}
          checked={Boolean(field.value)}
          onCheckedChange={field.onChange}
          onBlur={field.onBlur}
          disabled={disabled ?? field.disabled}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5"
        />
        <div className="grid gap-1">
          <Label htmlFor={field.name} className="font-normal">
            {label}
          </Label>
          {description ? (
            <FieldDescription>{description}</FieldDescription>
          ) : null}
        </div>
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
}
