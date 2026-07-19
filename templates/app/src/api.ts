/**
 * A read-only index of the whole backend surface.
 *
 * It re-exports each feature's endpoint constants — it never restates a path —
 * so there is still exactly one source of truth per endpoint, while this file
 * answers "what does this app call?" in one place.
 *
 * Nothing imports it: repositories keep importing their own feature's
 * constants. It lives at the top level rather than in `constants/` precisely
 * because it depends on every feature, which is the one direction the layering
 * rules forbid for anything that IS imported.
 *
 * `jinn-web domain` appends to it automatically, and `jinn-web doctor`
 * fails when a feature's endpoints are missing — an index that's only mostly
 * complete stops being trusted.
 */

export * from "@/lib/auth/endpoints";
