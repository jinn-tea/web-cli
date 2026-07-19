import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * The ONE way to render a status in this app.
 *
 * Never hand-build a status pill — a bespoke `rounded-full bg-green-100` in one
 * screen and a slightly different one in the next is how an app starts looking
 * unfinished. Map your domain's status union to a tone in a `Record` (see
 * `lib/badges.ts`) and pass it here.
 *
 * Tone meanings — pick by what the state MEANS, not by the color you want:
 *   success  → healthy / approved / done well
 *   warning  → needs attention, awaiting someone
 *   danger   → failed / rejected / blocked
 *   info     → in progress, actively moving
 *   neutral  → inert: draft, archived, cancelled
 *
 * The dot is not decoration: it keeps the badge readable when color alone
 * can't be perceived (WCAG — color is never the sole signal).
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-caption font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        success:
          "bg-success-subtle text-success-subtle-foreground border-success-border",
        warning:
          "bg-warning-subtle text-warning-subtle-foreground border-warning-border",
        danger:
          "bg-danger-subtle text-danger-subtle-foreground border-danger-border",
        info: "bg-info-subtle text-info-subtle-foreground border-info-border",
        neutral:
          "bg-neutral-subtle text-neutral-subtle-foreground border-neutral-border",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

const dotVariants = cva("size-1.5 shrink-0 rounded-full", {
  variants: {
    tone: {
      success: "bg-success",
      warning: "bg-warning",
      danger: "bg-danger",
      info: "bg-info",
      neutral: "bg-neutral-subtle-foreground",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export type StatusTone = NonNullable<
  VariantProps<typeof badgeVariants>["tone"]
>;

export interface StatusBadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  /** Hide the dot only where the label alone is unmistakable. */
  showDot?: boolean;
}

export function StatusBadge({
  tone,
  showDot = true,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {showDot ? (
        <span className={dotVariants({ tone })} aria-hidden="true" />
      ) : null}
      {children}
    </span>
  );
}
