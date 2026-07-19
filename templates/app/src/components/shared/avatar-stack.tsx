import { UserAvatar } from "./user-avatar";
import { cn } from "@/lib/utils";

/**
 * Overlapping avatars with a `+N` overflow — for "who's on this" summaries in
 * table cells and cards, where a full list would blow the row height.
 */
export interface AvatarStackProps {
  people: { id: string; name: string; avatarUrl?: string | null }[];
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

export function AvatarStack({
  people,
  max = 4,
  size = "sm",
  className,
}: AvatarStackProps) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <div className={cn("flex items-center -space-x-1.5", className)}>
      {shown.map((person) => (
        <UserAvatar
          key={person.id}
          name={person.name}
          src={person.avatarUrl}
          size={size}
          // Ring in the surface color so overlapping avatars stay separable.
          className="ring-card ring-2"
        />
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            "bg-muted text-muted-foreground ring-card flex items-center justify-center rounded-full ring-2",
            size === "sm" ? "size-6 text-[0.625rem]" : "text-caption size-8",
          )}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
