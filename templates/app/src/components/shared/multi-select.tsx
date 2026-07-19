"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslations } from "@/i18n";
import { cn } from "@/lib/utils";
import type { ComboboxOption } from "./combobox";

/**
 * Multi-select with chips in the trigger.
 *
 * Chips cap at `maxVisible` with a `+N` overflow — without that cap, selecting
 * eight options grows the trigger and reflows the whole form.
 */
export interface MultiSelectProps {
  options: readonly ComboboxOption[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  maxVisible?: number;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  maxVisible = 2,
  disabled,
  id,
  className,
}: MultiSelectProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  const selected = options.filter((option) => value.includes(option.value));
  const visible = selected.slice(0, maxVisible);
  const overflow = selected.length - visible.length;

  const toggle = (optionValue: string) => {
    onChange(
      value.includes(optionValue)
        ? value.filter((item) => item !== optionValue)
        : [...value, optionValue],
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-auto min-h-9 w-full min-w-0 justify-between gap-1 overflow-hidden py-1.5 font-normal",
            className,
          )}
        >
          <span className="flex min-w-0 flex-wrap items-center gap-1">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">
                {placeholder ?? t("common.actions.search")}
              </span>
            ) : (
              <>
                {visible.map((option) => (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    className="max-w-[12rem] gap-1"
                  >
                    <span className="truncate">{option.label}</span>
                    {/* A nested <button> inside the trigger button would be
                        invalid HTML — this is a span with a click handler and
                        the parent button still opens the popover on keyboard. */}
                    <span
                      role="button"
                      tabIndex={-1}
                      aria-label={t("common.actions.clear")}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggle(option.value);
                      }}
                      className="hover:text-foreground -mr-0.5 cursor-pointer"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </span>
                  </Badge>
                ))}
                {overflow > 0 ? (
                  <Badge variant="secondary">+{overflow}</Badge>
                ) : null}
              </>
            )}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={t("common.actions.search")} />
          <CommandList>
            <CommandEmpty>{t("common.states.noResults")}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  // Stay open: multi-select means the user is probably picking
                  // more than one.
                  onSelect={() => toggle(option.value)}
                >
                  <Check
                    className={cn(
                      "size-4",
                      value.includes(option.value) ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
