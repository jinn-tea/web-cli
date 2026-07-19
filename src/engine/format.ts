import prettier from "prettier";

/**
 * Format generated and edited source with Prettier.
 *
 * ts-morph's `formatText` fixes indentation but doesn't manage trailing commas,
 * so an insert-then-remove cycle leaves a file that differs from the original
 * by a comma. Running Prettier makes both directions canonical, which is what
 * lets `remove-domain` restore a tree byte for byte.
 *
 * The PROJECT's own config is resolved where possible, so generated files match
 * the surrounding codebase rather than our defaults.
 */

export async function formatSource(
  source: string,
  filePath: string,
): Promise<string> {
  const config = await prettier.resolveConfig(filePath).catch(() => null);
  return prettier.format(source, {
    ...(config ?? {}),
    filepath: filePath,
  });
}
