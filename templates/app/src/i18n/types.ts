import type en from "./messages/en";

/**
 * The shape every locale catalog must satisfy. Non-source catalogs declare
 * `satisfies Messages`, so adding a key to `en.ts` is a compile error in every
 * other language until it's translated.
 */
export type Messages = typeof en;

/**
 * Every valid translation key, as a dot-path into the catalog
 * (`"auth.login.title"`). Loose strings are rejected at the call site, so a
 * typo'd key is a build failure rather than a blank spot in the UI.
 */
export type MessageKey = DotPaths<Messages>;

type DotPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${DotPaths<T[K]>}`;
}[keyof T & string];

/** Values interpolated into a message's `{placeholder}` slots. */
export type MessageVars = Record<string, string | number>;
