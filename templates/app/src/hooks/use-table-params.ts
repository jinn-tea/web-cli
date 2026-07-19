"use client";

import {
  parseAsInteger,
  parseAsString,
  useQueryStates,
  type UseQueryStatesKeysMap,
} from "nuqs";
import { useDebouncedValue } from "./use-debounced-value";

/**
 * List-screen state (page, search, sort) lives in the URL — not in `useState`.
 *
 * That single decision buys: shareable links to a filtered view, a working back
 * button, state that survives a refresh, and a query key that is trivially
 * derived from the URL. Retrofitting it later is painful, so every list screen
 * starts here.
 *
 * `q` is debounced before it reaches the query key, so typing doesn't fire a
 * request per keystroke — but the URL updates immediately, so the address bar
 * always reflects what the user typed.
 */

const tableParsers = {
  page: parseAsInteger.withDefault(1),
  q: parseAsString.withDefault(""),
  sort: parseAsString.withDefault(""),
} satisfies UseQueryStatesKeysMap;

export interface TableParams {
  page: number;
  q: string;
  sort: string;
}

export interface UseTableParamsResult {
  /** Live values — bind these to inputs so typing feels instant. */
  params: TableParams;
  /** Debounced `q`, plus page/sort — feed THIS into the query key. */
  queryParams: TableParams;
  setPage: (page: number) => void;
  /** Changing the search resets to page 1; staying on page 7 of old results is a bug. */
  setQuery: (q: string) => void;
  setSort: (sort: string) => void;
  reset: () => void;
  isFiltered: boolean;
}

export function useTableParams(): UseTableParamsResult {
  const [params, setParams] = useQueryStates(tableParsers, {
    history: "replace",
    shallow: true,
  });

  const debouncedQuery = useDebouncedValue(params.q);

  return {
    params,
    queryParams: { ...params, q: debouncedQuery },
    setPage: (page) => void setParams({ page }),
    setQuery: (q) => void setParams({ q, page: 1 }),
    setSort: (sort) => void setParams({ sort, page: 1 }),
    reset: () => void setParams({ page: 1, q: "", sort: "" }),
    isFiltered: params.q !== "" || params.sort !== "",
  };
}
