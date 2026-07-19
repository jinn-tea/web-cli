import prettier from "prettier";

/**
 * Format generated and edited source with Prettier.
 *
 * ts-morph's `formatText` fixes indentation but doesn't manage trailing commas,
 * so an insert-then-remove cycle leaves a file differing from the original by a
 * comma. Running Prettier makes both directions canonical, which is what lets
 * `remove-domain` restore a tree byte for byte.
 *
 * The PROJECT's own config is used where it can be loaded, so generated files
 * match the surrounding codebase.
 *
 * Formatting must NEVER fail a generation. The usual way it tries to: a
 * project's `.prettierrc` names a plugin (`prettier-plugin-tailwindcss`) that
 * can't be resolved from the CLI's module tree — or from anywhere at all, when
 * the project's dependencies aren't installed yet. So this degrades in steps:
 * project config → config without plugins → unformatted. A slightly
 * differently-wrapped file is cosmetic and the project's own `npm run format`
 * fixes it; a crashed generator is not.
 */

export async function formatSource(
  source: string,
  filePath: string,
): Promise<string> {
  const config = await prettier.resolveConfig(filePath).catch(() => null);

  try {
    return await prettier.format(source, {
      ...(config ?? {}),
      filepath: filePath,
    });
  } catch {
    try {
      const { plugins: _plugins, ...withoutPlugins } = config ?? {};
      return await prettier.format(source, {
        ...withoutPlugins,
        filepath: filePath,
      });
    } catch {
      // Genuinely unformattable. Hand back the original rather than masking a
      // real syntax problem by rewriting it.
      return source;
    }
  }
}
