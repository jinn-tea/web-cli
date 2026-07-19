"use client";

import { useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Text that truncates — and stays READABLE, because a cut-off value the user
 * can't reveal is just missing data.
 *
 * Two layout rules are baked in, both of which are easy to get wrong by hand:
 *
 *  1. `min-w-0` + `overflow-hidden` on the box. A flex/grid item's automatic
 *     minimum size is its MIN-CONTENT, so one 80-character company name will
 *     silently push its track past the container's `max-w` — and an
 *     `overflow-hidden` ancestor then shears the whole layout instead of
 *     truncating this string. `truncate` alone does NOT prevent that.
 *  2. A tooltip carrying the full value, but only when the text is ACTUALLY
 *     clipped — an always-on tooltip over every cell is noise.
 *
 * Use this for any table cell or detail value that can hold user-supplied text.
 */
export interface TruncatedTextProps extends React.ComponentProps<"span"> {
  /** The full value. Kept separate from children so the tooltip is always complete. */
  text: string;
  /** Truncate after N lines instead of one (uses line-clamp). */
  lines?: number;
}

export function TruncatedText({
  text,
  lines = 1,
  className,
  ...props
}: TruncatedTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isClipped, setIsClipped] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const check = () => {
      setIsClipped(
        lines === 1
          ? element.scrollWidth > element.clientWidth
          : element.scrollHeight > element.clientHeight,
      );
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, lines]);

  const content = (
    <span
      ref={ref}
      className={cn(
        "block min-w-0 overflow-hidden",
        lines === 1 ? "truncate" : "",
        className,
      )}
      style={
        lines > 1
          ? {
              display: "-webkit-box",
              WebkitLineClamp: lines,
              WebkitBoxOrient: "vertical",
            }
          : undefined
      }
      {...props}
    >
      {text}
    </span>
  );

  if (!isClipped) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent className="max-w-xs break-words">{text}</TooltipContent>
    </Tooltip>
  );
}
