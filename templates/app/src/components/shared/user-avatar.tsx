import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * A user's avatar, with a deterministic fallback.
 *
 * The fallback color is derived from the name, so the same person is always the
 * same color — a random hue per render makes lists visually unstable and makes
 * a row look like it changed when it didn't.
 *
 * Tones come from the brand ramp so avatars stay inside the design system.
 */
const TONES = [
  "bg-brand-100 text-brand-700",
  "bg-success-subtle text-success-subtle-foreground",
  "bg-warning-subtle text-warning-subtle-foreground",
  "bg-info-subtle text-info-subtle-foreground",
  "bg-neutral-subtle text-neutral-subtle-foreground",
] as const;

function toneFor(seed: string): string {
  // Cheap deterministic hash — stable across reloads and machines.
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return TONES[hash % TONES.length];
}

export interface UserAvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "size-6 text-[0.625rem]",
  md: "size-8 text-caption",
  lg: "size-12 text-label",
} as const;

export function UserAvatar({
  name,
  src,
  size = "md",
  className,
}: UserAvatarProps) {
  return (
    <Avatar className={cn(SIZES[size], className)}>
      {/* Empty alt: the name is already rendered beside the avatar in every
          usage, so announcing it twice is noise for screen readers. */}
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback className={cn("font-medium", toneFor(name))}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
