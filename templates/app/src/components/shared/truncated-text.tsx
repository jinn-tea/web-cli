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
 * Three things are baked in, all of them easy to get wrong by hand:
 *
 *  1. `min-w-0` + `overflow-hidden` on the box. A flex/grid item's automatic
 *     minimum size is its MIN-CONTENT, so one 80-character company name will
 *     silently push its track past the container's `max-w` — and an
 *     `overflow-hidden` ancestor then shears the whole layout instead of
 *     truncating this string. `truncate` alone does NOT prevent that.
 *  2. A tooltip carrying the full value, shown only when the text is ACTUALLY
 *     clipped — an always-on tooltip over every cell is noise.
 *  3. A re-measure after webfonts load. On first paint the fallback font is
 *     usually narrower, so a string that will overflow still measures as
 *     fitting. A ResizeObserver won't catch it either: swapping the font
 *     changes the TEXT width, not the element's own box, so it never fires.
 *
 * ⚠️ The tree below is deliberately CONSTANT — the trigger always renders, and
 * only the tooltip content is conditional. An earlier version returned a bare
 * span when unclipped and a wrapped one when clipped; flipping that boolean
 * re-parented the span, which detached the node the ResizeObserver was watching,
 * fired it at 0×0, and flipped the state straight back to false. The tooltip
 * then never appeared. Keep the structure stable.
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
      // A detached node reports 0×0; measuring it would wrongly say "fits".
      if (!element.isConnected) return;
      setIsClipped(
        lines === 1
          ? element.scrollWidth > element.clientWidth
          : element.scrollHeight > element.clientHeight,
      );
    };

    check();

    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) check();
    });

    // Container resizes (window, sidebar collapse) DO change the element box.
    const observer = new ResizeObserver(check);
    observer.observe(element);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [text, lines]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          ref={ref}
          // Exposed so the sweep can assert truncation behavior directly
          // instead of inferring it from geometry.
          data-clipped={isClipped}
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
      </TooltipTrigger>
      {isClipped ? (
        <TooltipContent className="max-w-xs break-words">{text}</TooltipContent>
      ) : null}
    </Tooltip>
  );
}
