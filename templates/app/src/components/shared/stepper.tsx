import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Progress indicator for multi-step flows.
 *
 * Shows where the user is AND how much is left — the main reason people abandon
 * a wizard is not knowing whether it's three steps or thirty. Completed steps
 * get a checkmark rather than only a color change, so state is readable without
 * relying on color perception.
 */
export interface Step {
  label: string;
}

export interface StepperProps {
  steps: readonly Step[];
  /** Zero-based index of the active step. */
  current: number;
  className?: string;
}

export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <ol
      className={cn("flex items-center gap-2", className)}
      aria-label={`Step ${current + 1} of ${steps.length}`}
    >
      {steps.map((step, index) => {
        const isDone = index < current;
        const isCurrent = index === current;

        return (
          <li
            key={step.label}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <span
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "text-caption flex size-6 shrink-0 items-center justify-center rounded-full border font-medium tabular-nums",
                isDone &&
                  "bg-primary text-primary-foreground border-transparent",
                isCurrent && "border-primary text-primary",
                !isDone && !isCurrent && "text-muted-foreground",
              )}
            >
              {isDone ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>

            <span
              className={cn(
                "text-label hidden truncate sm:block",
                isCurrent ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>

            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "h-px min-w-4 flex-1",
                  isDone ? "bg-primary" : "bg-border",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
