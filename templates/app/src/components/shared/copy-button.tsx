"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n";
import { reportError } from "@/lib/reporting";
import { cn } from "@/lib/utils";

/**
 * Copy-to-clipboard with inline confirmation.
 *
 * The checkmark is deliberate: a toast for something this small is heavy, but
 * silence makes the user click again wondering if it worked. Feedback within
 * one frame, reverting after a moment.
 */
export interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyButton({ value, label, className }: CopyButtonProps) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch (error) {
      // Clipboard access can be denied (insecure context, permissions).
      reportError(error, { scope: "clipboard" });
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => void handleCopy()}
      aria-label={label ?? t("common.actions.copy")}
      className={cn("size-7", className)}
    >
      {copied ? (
        <Check className="text-success size-3.5" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
      {/* Announce the result for users who can't see the icon swap. */}
      <span className="sr-only" aria-live="polite">
        {copied ? t("common.actions.copied") : ""}
      </span>
    </Button>
  );
}
