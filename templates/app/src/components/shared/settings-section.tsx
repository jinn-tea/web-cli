import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/**
 * Settings surfaces: a titled card of label/control rows.
 *
 * Keeping this shared is what stops every settings screen from inventing its
 * own spacing and divider treatment.
 */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-h4">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col">{children}</CardContent>
    </Card>
  );
}

export function SettingsRow({
  label,
  description,
  control,
  /** Draw a divider above — set on every row after the first. */
  divided = false,
}: {
  label: string;
  description?: string;
  control: React.ReactNode;
  divided?: boolean;
}) {
  return (
    <>
      {divided ? <Separator className="my-3" /> : null}
      <div className="flex items-center justify-between gap-4">
        {/* min-w-0 so a long description wraps instead of pushing the control
            out of the card. */}
        <div className="min-w-0">
          <p className="text-label">{label}</p>
          {description ? (
            <p className="text-caption text-muted-foreground mt-0.5">
              {description}
            </p>
          ) : null}
        </div>
        <div className={cn("shrink-0")}>{control}</div>
      </div>
    </>
  );
}
