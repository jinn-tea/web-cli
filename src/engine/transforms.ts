import { BRAND_STEPS, rampToCss, type BrandRamp } from "./brand.js";

/**
 * Targeted edits to files copied verbatim from the template.
 *
 * The template is a REAL runnable app, which is what keeps it honest — it can
 * be `npm run dev`'d and swept. That means a handful of files can't be `.eta`
 * (they'd stop being valid source), so the variability lives here instead.
 *
 * Every transform is: locate a known, delimited block → replace it → return the
 * new source. They're pure string functions so they're directly unit-testable,
 * and each THROWS when its anchor is missing rather than silently producing a
 * project with the template's defaults baked in.
 */

/** Find the balanced `{ … }` region for `key: {` starting at `fromIndex`. */
function findObjectBlock(
  source: string,
  key: string,
): { start: number; end: number } | null {
  const opener = new RegExp(`^([ \\t]*)${key}:\\s*\\{`, "m");
  const match = opener.exec(source);
  if (!match) return null;

  const start = match.index;
  let depth = 0;
  let index = source.indexOf("{", start);

  for (; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        // Swallow a trailing comma so removal doesn't leave `,,`.
        let end = index + 1;
        if (source[end] === ",") end += 1;
        return { start, end };
      }
    }
  }
  return null;
}

/** Replace the `roles: { … }` namespace in the source message catalog. */
export function rewriteRolesNamespace(
  source: string,
  roles: readonly string[],
  labelFor: (role: string) => string,
): string {
  const block = findObjectBlock(source, "roles");
  if (!block) {
    throw new Error(
      "Could not find the `roles:` namespace in the message catalog. " +
        "The template changed shape — update transforms.rewriteRolesNamespace.",
    );
  }

  const entries = roles
    .map((role) => `    ${role}: "${labelFor(role)}",`)
    .join("\n");
  const replacement = `  roles: {\n${entries}\n  },`;

  return source.slice(0, block.start) + replacement + source.slice(block.end);
}

/** Remove a whole namespace (used to drop the reference domain's strings). */
export function removeNamespace(source: string, key: string): string {
  const block = findObjectBlock(source, key);
  if (!block) return source;
  // Also consume the newline the block sat on, so no blank gap is left.
  let end = block.end;
  if (source[end] === "\n") end += 1;
  return source.slice(0, block.start) + source.slice(end);
}

/**
 * Collapse the template's per-role dashboard subtitles (`adminSubtitle`,
 * `memberSubtitle`) into the single `subtitle` key the generated role dashboards
 * use.
 */
export function normalizeDashboardKeys(source: string): string {
  const block = findObjectBlock(source, "dashboard");
  if (!block) {
    throw new Error(
      "Could not find the `dashboard:` namespace in the message catalog.",
    );
  }

  const original = source.slice(block.start, block.end);
  const rewritten = original
    // Keep the first *Subtitle line, renamed; drop any others.
    .replace(/^\s*\w+Subtitle:\s*"[^"]*",\n/m, '    subtitle: "Your work at a glance.",\n')
    .replace(/^\s*\w+Subtitle:\s*"[^"]*",\n/gm, "");

  return source.slice(0, block.start) + rewritten + source.slice(block.end);
}

/** Swap the brand ramp declarations in `globals.css`. */
export function replaceBrandRamp(css: string, ramp: BrandRamp): string {
  const first = `--brand-${BRAND_STEPS[0]}:`;
  const last = `--brand-${BRAND_STEPS[BRAND_STEPS.length - 1]}:`;

  const start = css.indexOf(first);
  const lastStart = css.indexOf(last);
  if (start === -1 || lastStart === -1) {
    throw new Error(
      "Could not find the brand ramp block in globals.css. " +
        "The template changed shape — update transforms.replaceBrandRamp.",
    );
  }

  const end = css.indexOf("\n", lastStart);
  return css.slice(0, start) + rampToCss(ramp).trimStart() + css.slice(end);
}

/**
 * Remove a nav item (and its route constant) that belongs to a domain the
 * generated project doesn't inherit.
 *
 * Needed because excluding a domain's FILES isn't enough — its wiring lives in
 * shared registries, and a nav entry pointing at a route with no page (and a
 * label key with no translation) is a compile error, not a cosmetic leftover.
 */
export function removeNavItem(source: string, href: string): string {
  const pattern = new RegExp(
    `\\n\\s*\\{\\s*\\n(?:[^{}]*\\n)*?\\s*href:\\s*APP_ROUTES\\.${href},[\\s\\S]*?\\n\\s*\\},`,
    "m",
  );
  return source.replace(pattern, "");
}

/** Remove an entry from a `const X = { … } as const` route/key registry. */
export function removeRegistryEntry(source: string, key: string): string {
  const pattern = new RegExp(`^\\s*${key}:\\s*[^,\\n]+,\\n`, "m");
  return source.replace(pattern, "");
}

/** Drop a now-unused named import (e.g. an icon only the removed item used). */
export function removeNamedImport(source: string, name: string): string {
  return source.replace(
    new RegExp(`^\\s*${name},\\n`, "m"),
    "",
  );
}

/** Set the package name and drop template-only fields. */
export function rewritePackageJson(
  raw: string,
  options: { name: string; description: string },
): string {
  const pkg = JSON.parse(raw) as Record<string, unknown>;
  pkg.name = options.name;
  pkg.version = "0.1.0";
  pkg.private = true;
  pkg.description = options.description;
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

/**
 * Rewrite the CLAUDE.md heading and the role list so the architecture guide
 * describes THIS project rather than the template.
 */
export function rewriteClaudeMd(
  source: string,
  options: { appName: string; roles: readonly string[]; locales: readonly string[] },
): string {
  const roleList = options.roles.map((role) => `\`${role}\``).join(" · ");
  const localeList = options.locales.map((locale) => `\`${locale}\``).join(", ");

  return source
    .replace(
      /^# Architecture Guide$/m,
      `# ${options.appName} — Architecture Guide`,
    )
    .replace(
      /^Next\.js \*\*16\*\* \(App Router\) app built on/m,
      `Next.js **16** (App Router) app for **${options.appName}**, built on`,
    )
    .replace(
      /^2\. \*\*Role-first, then domain\.\*\* `src\/features\/<role>\/<domain>\/`\./m,
      `2. **Role-first, then domain.** \`src/features/<role>/<domain>/\` — roles here: ${roleList} (plus \`common\`). Locales: ${localeList}.`,
    );
}

/** Seed a non-source catalog from the source one, marking every string. */
export function seedLocaleCatalog(
  sourceCatalog: string,
  locale: string,
): string {
  const marked = sourceCatalog.replace(
    /: "((?:[^"\\]|\\.)*)"/g,
    (_match, text: string) => `: "TODO(${locale}): ${text}"`,
  );

  const identifier = identifierFor(locale);

  return (
    marked
      .replace(/^const en = \{$/m, `const ${identifier} = {`)
      .replace(
        /^export default en;$/m,
        // `satisfies Messages` is what makes a missing key a build error rather
        // than a silently-English string at runtime.
        `export default ${identifier} satisfies Messages;`,
      )
      // Alias import, not "../types" — the guardrails ban relative parent
      // imports, and generated code has to obey the same rules as hand-written.
      .replace(
        /^\/\*\*$/m,
        `import type { Messages } from "@/i18n/types";\n\n/**`,
      )
  );
}

/** `pt-BR` → `ptBR`, usable as a JS identifier. */
export function identifierFor(locale: string): string {
  return locale.replace(/-([a-z])/gi, (_m, char: string) => char.toUpperCase());
}
