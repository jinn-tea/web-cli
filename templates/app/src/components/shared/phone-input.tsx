"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Phone number with a country dial code.
 *
 * The value is stored as ONE E.164-ish string (`+49 170 1234567`) rather than
 * as separate country/number fields: splitting them means every consumer has to
 * remember to recombine, and they drift apart the first time someone pastes a
 * full international number.
 *
 * Extend `DIAL_CODES` for the markets you serve — a full country list is a
 * dependency, and most products need a handful.
 */
const DIAL_CODES = [
  { code: "+49", label: "DE" },
  { code: "+31", label: "NL" },
  { code: "+48", label: "PL" },
  { code: "+44", label: "UK" },
  { code: "+1", label: "US" },
] as const;

export interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

function split(value: string): { dial: string; rest: string } {
  const match = DIAL_CODES.map((entry) => entry.code)
    // Longest first, so "+49" wins over "+4" when both are prefixes.
    .sort((a, b) => b.length - a.length)
    .find((code) => value.startsWith(code));
  return match
    ? { dial: match, rest: value.slice(match.length).trimStart() }
    : { dial: DIAL_CODES[0].code, rest: value };
}

export function PhoneInput({
  value,
  onChange,
  disabled,
  id,
  className,
  ...aria
}: PhoneInputProps) {
  const { dial, rest } = split(value);

  return (
    <div className={cn("flex gap-2", className)}>
      <Select
        value={dial}
        onValueChange={(next) => onChange(`${next} ${rest}`.trim())}
        disabled={disabled}
      >
        <SelectTrigger className="w-24 shrink-0" aria-label="Country code">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DIAL_CODES.map((entry) => (
            <SelectItem key={entry.code} value={entry.code}>
              {entry.label} {entry.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={rest}
        onChange={(event) => onChange(`${dial} ${event.target.value}`.trim())}
        disabled={disabled}
        className="min-w-0 flex-1"
        {...aria}
      />
    </div>
  );
}
