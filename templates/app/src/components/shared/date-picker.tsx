"use client";

import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslations } from "@/i18n";
import { formatDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";

/**
 * Single-date picker.
 *
 * The trigger displays through `lib/datetime` so the format follows the active
 * locale like every other date in the app — a picker that renders `3/12/2026`
 * while the table beside it says `12 Mar 2026` reads as two different products.
 */
export interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Restrict selectable range, e.g. no past dates. */
  fromDate?: Date;
  toDate?: Date;
  id?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled,
  fromDate,
  toDate,
  id,
  className,
  ...aria
}: DatePickerProps) {
  const t = useTranslations();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          // min-w-0 + overflow-hidden: a long localized date must truncate
          // rather than stretch the trigger past its container.
          className={cn(
            "w-full min-w-0 justify-start overflow-hidden font-normal",
            !value && "text-muted-foreground",
            className,
          )}
          {...aria}
        >
          <CalendarIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {value
              ? formatDate(value)
              : (placeholder ?? t("common.actions.search"))}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={onChange}
          disabled={
            fromDate || toDate
              ? (date) =>
                  (fromDate ? date < fromDate : false) ||
                  (toDate ? date > toDate : false)
              : undefined
          }
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
