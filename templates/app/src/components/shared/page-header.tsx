import { cn } from "@/lib/utils";

/**
 * The header every screen starts with — the web analog of a native app bar.
 *
 * Keep to ONE primary action per screen. Two equal-weight buttons side by side
 * make the user choose before they've read anything; secondary actions belong
 * in `secondaryAction` (outline/ghost) or a row-level menu.
 */
export interface PageHeaderProps {
  title: string;
  description?: string;
  /** The single primary action (a `<Button>`). */
  action?: React.ReactNode;
  /** Lower-weight actions — export, filters, settings. */
  secondaryAction?: React.ReactNode;
  /** Breadcrumbs or a back link, rendered above the title. */
  breadcrumb?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  secondaryAction,
  breadcrumb,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4", className)}>
      {breadcrumb}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* min-w-0 so a long title truncates instead of pushing the actions off-screen */}
        <div className="min-w-0">
          <h1 className="text-h1 truncate">{title}</h1>
          {description ? (
            <p className="text-body text-muted-foreground mt-1">
              {description}
            </p>
          ) : null}
        </div>
        {action || secondaryAction ? (
          <div className="flex shrink-0 items-center gap-2">
            {secondaryAction}
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
}
