import { cn } from "@/lib/utils";

/**
 * A heading inside a page — one level down from `PageHeader`.
 *
 * Renders `<h2>` so the document outline stays correct: a page has one `<h1>`
 * (the PageHeader) and sections nest beneath it. Skipping levels for visual
 * reasons is what makes screen-reader navigation useless.
 */
export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-h3 truncate">{title}</h2>
        {description ? (
          <p className="text-caption text-muted-foreground mt-0.5">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
