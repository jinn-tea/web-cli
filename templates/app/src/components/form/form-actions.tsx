"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * The submit/cancel row every form ends with.
 *
 * It enforces the two rules forms most often break: the submit button is
 * DISABLED while the mutation is pending (so a double-click can't create two
 * records), and it shows a spinner so the wait is visibly acknowledged rather
 * than looking like a dead click.
 */
export interface FormActionsProps {
  isPending?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  /** Disable submit for reasons other than pending (e.g. pristine form). */
  disabled?: boolean;
  destructive?: boolean;
  className?: string;
}

export function FormActions({
  isPending = false,
  submitLabel,
  cancelLabel,
  onCancel,
  disabled = false,
  destructive = false,
  className,
}: FormActionsProps) {
  const t = useTranslations();

  return (
    <div className={cn("flex items-center justify-end gap-2 pt-2", className)}>
      {onCancel ? (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          {cancelLabel ?? t("common.actions.cancel")}
        </Button>
      ) : null}
      <Button
        type="submit"
        disabled={isPending || disabled}
        variant={destructive ? "destructive" : "default"}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : null}
        {submitLabel ?? t("common.actions.save")}
      </Button>
    </div>
  );
}
