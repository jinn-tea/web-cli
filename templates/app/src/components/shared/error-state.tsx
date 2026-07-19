"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n";
import { isApiError, isNetworkError } from "@/lib/http";
import { cn } from "@/lib/utils";

/**
 * The error branch of an async surface — always with a way OUT.
 *
 * Two rules this encodes:
 *  - Show the real cause when the server gave one (`ApiError.message` arrives
 *    localized). A blanket "Something went wrong" hides the one piece of
 *    information that would let the user fix it themselves.
 *  - Always offer retry. An error with no recovery is a dead end; wire `onRetry`
 *    to the query's `refetch`.
 */
export interface ErrorStateProps {
  error?: unknown;
  onRetry?: () => void;
  /** Override the derived message when the surface has better context. */
  title?: string;
  className?: string;
}

export function ErrorState({
  error,
  onRetry,
  title,
  className,
}: ErrorStateProps) {
  const t = useTranslations();

  const message = isApiError(error)
    ? error.message
    : isNetworkError(error)
      ? t("errors.network")
      : t("common.states.errorHint");

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <div className="bg-danger-subtle text-danger-subtle-foreground mb-4 flex size-11 items-center justify-center rounded-full">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </div>
      <p className="text-h4">{title ?? t("common.states.errorTitle")}</p>
      <p className="text-body text-muted-foreground mt-1 max-w-sm">{message}</p>
      {onRetry ? (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          {t("common.actions.retry")}
        </Button>
      ) : null}
    </div>
  );
}
