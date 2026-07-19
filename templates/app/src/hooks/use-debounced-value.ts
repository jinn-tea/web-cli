"use client";

import { useEffect, useState } from "react";
import { SEARCH_DEBOUNCE_MS } from "@/constants";

/**
 * Debounce a rapidly-changing value (a search box) before it reaches a query
 * key. Use this rather than hand-rolled `setTimeout`s in components: those leak
 * on unmount and end up with a different delay in every feature.
 */
export function useDebouncedValue<T>(
  value: T,
  delay: number = SEARCH_DEBOUNCE_MS,
): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
