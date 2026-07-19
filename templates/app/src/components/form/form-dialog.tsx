"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * The shell every create/edit dialog uses.
 *
 * Note `[&>*]:min-w-0` on the content: a dialog's width is fixed by design, so
 * its children must always be free to shrink. Without it, one long unbroken
 * string (an address, a company name) sizes the flex/grid track past the
 * dialog's max-width and the layout shears instead of truncating — a bug that
 * is invisible to TypeScript and to code review, and only shows up with real
 * customer data.
 */
export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg [&>*]:min-w-0",
          className,
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {/* Radix warns when a dialog has no description; keep it explicit. */}
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
