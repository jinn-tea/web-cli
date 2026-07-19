"use client";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

/**
 * One-time-code input.
 *
 * `autoComplete="one-time-code"` is the important part: it lets iOS and Android
 * offer the code straight from the SMS, which turns a six-field retyping
 * exercise into a single tap. Without it this is a worse experience than a
 * plain text box.
 */
export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  /** Fires when the last digit lands — usually submits the form. */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  onComplete,
  disabled,
  className,
  ...aria
}: OtpInputProps) {
  const half = Math.floor(length / 2);

  return (
    <InputOTP
      maxLength={length}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      disabled={disabled}
      autoComplete="one-time-code"
      containerClassName={cn("justify-center", className)}
      {...aria}
    >
      <InputOTPGroup>
        {Array.from({ length: half }).map((_, index) => (
          <InputOTPSlot key={index} index={index} />
        ))}
      </InputOTPGroup>
      {/* A visual break every few digits — long unbroken runs are hard to
          verify against the code in a message. */}
      <InputOTPSeparator />
      <InputOTPGroup>
        {Array.from({ length: length - half }).map((_, index) => (
          <InputOTPSlot key={half + index} index={half + index} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
