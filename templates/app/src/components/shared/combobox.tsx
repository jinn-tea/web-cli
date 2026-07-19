"use client";

import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useState } from "react";
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

/**
 * Searchable single-select — the picker for entity references (a customer, a
 * warehouse) where a plain `<Select>` of 500 options is unusable.
 *
 * Search is CONTROLLED and pushed to the caller so it can drive a debounced,
 * server-side query (see `useDebouncedValue`); filtering client-side only works
 * when the whole list already fits in memory, which for real entity pickers it
 * doesn't.
 */
export interface ComboboxOption {
  value: string;
  label: string;
  /** Secondary line — a reference number, an address. */
  hint?: string;
}

export interface ComboboxProps {
  options: readonly ComboboxOption[];
  value?: string | null;
  onChange: (value: string) => void;
  /** Controlled search term; wire to a debounced query for server search. */
  search?: string;
  onSearchChange?: (search: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  search,
  onSearchChange,
  isLoading = false,
  placeholder,
  searchPlaceholder,
  disabled,
  id,
  className,
  ...aria
}: ComboboxProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

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
            "w-full min-w-0 justify-between overflow-hidden font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
          {...aria}
        >
          <span className="truncate">
            {selected?.label ?? placeholder ?? t("common.actions.search")}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        {/* shouldFilter=false when the caller searches server-side, or cmdk
            would filter the already-filtered results a second time. */}
        <Command shouldFilter={!onSearchChange}>
          <CommandInput
            placeholder={searchPlaceholder ?? t("common.actions.search")}
            value={search}
            onValueChange={onSearchChange}
          />
          <CommandList>
            {isLoading ? (
              <div className="text-caption text-muted-foreground flex items-center justify-center gap-2 py-6">
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                {t("common.states.loading")}
              </div>
            ) : (
              <>
                <CommandEmpty>{t("common.states.noResults")}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "size-4",
                          option.value === value ? "opacity-100" : "opacity-0",
                        )}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {option.label}
                      </span>
                      {option.hint ? (
                        <span className="text-caption text-muted-foreground shrink-0">
                          {option.hint}
                        </span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
