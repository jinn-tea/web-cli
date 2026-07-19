import {
  Node,
  Project,
  SyntaxKind,
  type ObjectLiteralExpression,
  type ArrayLiteralExpression,
  type SourceFile,
} from "ts-morph";

/**
 * AST edits to existing project files.
 *
 * The Flutter CLI this is modelled on does the equivalent with `replaceAll` on
 * hardcoded anchor strings, which breaks the moment someone reformats the file
 * or Prettier moves a brace. These operate on the syntax tree instead, so they
 * only care about STRUCTURE.
 *
 * Every helper is:
 *  - **idempotent** — applying twice is applying once; returns `false` when
 *    there was nothing to do, so generators can report "already wired"
 *  - **reversible** — each has a `remove*` twin, which is what makes
 *    `remove-domain` a true inverse
 *  - **loud on failure** — a missing target throws with the file and symbol
 *    named, rather than silently producing a half-wired project
 *
 * The generated app is deliberately designed to make this easy: every wiring
 * point is a plain exported `as const` object or array, which is trivial and
 * safe to append to.
 */

/**
 * Formatting applied after every edit.
 *
 * Not cosmetic — it's what makes `remove-domain` a true inverse. ts-morph
 * inserts a node with its own indentation and, when that node is later removed,
 * leaves the FOLLOWING sibling carrying it (a 2-space property silently becomes
 * 4-space). Normalising after each edit means apply→remove returns the original
 * text byte for byte, which the round-trip tests assert.
 *
 * Matches the template's Prettier defaults, so generated diffs stay minimal.
 */
const FORMAT = {
  indentSize: 2,
  convertTabsToSpaces: true,
} as const;

/** Re-indent a file after structural edits. Called by every helper below. */
export function normalize(file: SourceFile): void {
  file.formatText(FORMAT);
}

export function createProject(): Project {
  return new Project({
    // The generated app's own tsconfig governs its syntax; we only need parsing.
    useInMemoryFileSystem: false,
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { allowJs: false },
  });
}

export function openFile(project: Project, filePath: string): SourceFile {
  return project.addSourceFileAtPath(filePath);
}

/** Locate `const <name> = { … }` (however it's typed or exported). */
function findObjectLiteral(
  file: SourceFile,
  name: string,
): ObjectLiteralExpression {
  const declaration = file.getVariableDeclaration(name);
  const initializer = declaration?.getInitializer();

  // `X = { … } as const` wraps the literal in an assertion.
  const literal = Node.isAsExpression(initializer)
    ? initializer.getExpression()
    : initializer;

  if (!literal || !Node.isObjectLiteralExpression(literal)) {
    throw new Error(
      `Could not find an object literal named "${name}" in ${file.getBaseName()}. ` +
        `Has it been restructured? Add the entry by hand, or restore the shape.`,
    );
  }
  return literal;
}

/** Locate `const <name> = [ … ]`. */
function findArrayLiteral(
  file: SourceFile,
  name: string,
): ArrayLiteralExpression {
  const declaration = file.getVariableDeclaration(name);
  const initializer = declaration?.getInitializer();

  const literal = Node.isAsExpression(initializer)
    ? initializer.getExpression()
    : initializer;

  if (!literal || !Node.isArrayLiteralExpression(literal)) {
    throw new Error(
      `Could not find an array literal named "${name}" in ${file.getBaseName()}.`,
    );
  }
  return literal;
}

/** Property names present on an object literal, in source order. */
function propertyNames(literal: ObjectLiteralExpression): string[] {
  return literal
    .getProperties()
    .flatMap((property) =>
      Node.isPropertyAssignment(property) ||
      Node.isShorthandPropertyAssignment(property)
        ? [property.getName().replace(/^["']|["']$/g, "")]
        : [],
    );
}

/**
 * Add `key: initializer` to an object literal, keeping properties alphabetical
 * so repeated generation produces a stable, review-friendly diff.
 *
 * Returns false when the key already exists.
 */
export function addObjectProperty(
  file: SourceFile,
  objectName: string,
  key: string,
  initializer: string,
): boolean {
  const literal = findObjectLiteral(file, objectName);
  const existing = propertyNames(literal);
  if (existing.includes(key)) return false;

  // Insert before the first property that sorts after the new key; otherwise
  // append. This keeps the anchor comment at the bottom undisturbed.
  const insertIndex = existing.findIndex((name) => name > key);
  const propertyIndex =
    insertIndex === -1 ? literal.getProperties().length : insertIndex;

  literal.insertPropertyAssignment(propertyIndex, { name: key, initializer });
  normalize(file);
  return true;
}

export function removeObjectProperty(
  file: SourceFile,
  objectName: string,
  key: string,
): boolean {
  const literal = findObjectLiteral(file, objectName);
  const property = literal.getProperty(key);
  if (!property) return false;
  property.remove();
  normalize(file);
  return true;
}

/** Append an element to an array literal. Returns false if `match` finds one. */
export function addArrayElement(
  file: SourceFile,
  arrayName: string,
  elementText: string,
  match: (existingText: string) => boolean,
): boolean {
  const literal = findArrayLiteral(file, arrayName);
  if (literal.getElements().some((element) => match(element.getText()))) {
    return false;
  }
  literal.addElement(elementText);
  normalize(file);
  return true;
}

export function removeArrayElement(
  file: SourceFile,
  arrayName: string,
  match: (existingText: string) => boolean,
): boolean {
  const literal = findArrayLiteral(file, arrayName);
  const element = literal
    .getElements()
    .find((candidate) => match(candidate.getText()));
  if (!element) return false;
  literal.removeElement(element);
  normalize(file);
  return true;
}

/** Add a named import, merging into an existing declaration for that module. */
export function addNamedImport(
  file: SourceFile,
  moduleSpecifier: string,
  name: string,
): boolean {
  const existing = file.getImportDeclaration(
    (declaration) => declaration.getModuleSpecifierValue() === moduleSpecifier,
  );

  if (!existing) {
    file.addImportDeclaration({ moduleSpecifier, namedImports: [name] });
    normalize(file);
    return true;
  }

  const names = existing.getNamedImports().map((named) => named.getName());
  if (names.includes(name)) return false;

  // INSERT in place rather than removing and re-adding the whole list.
  // Re-adding rebuilds each import from its name alone, which silently drops
  // the `type` modifier — `type LucideIcon` would come back as a value import,
  // changing runtime behaviour and breaking `verbatimModuleSyntax`.
  const insertIndex = names.findIndex((existingName) => existingName > name);
  existing.insertNamedImport(
    insertIndex === -1 ? names.length : insertIndex,
    name,
  );
  normalize(file);
  return true;
}

/**
 * Remove a named import, dropping the whole declaration when it was the last
 * one — an empty `import {} from "x"` is a lint error.
 */
export function removeNamedImport(
  file: SourceFile,
  moduleSpecifier: string,
  name: string,
): boolean {
  const declaration = file.getImportDeclaration(
    (candidate) => candidate.getModuleSpecifierValue() === moduleSpecifier,
  );
  if (!declaration) return false;

  const named = declaration
    .getNamedImports()
    .find((candidate) => candidate.getName() === name);
  if (!named) return false;

  named.remove();

  if (
    declaration.getNamedImports().length === 0 &&
    !declaration.getDefaultImport() &&
    !declaration.getNamespaceImport()
  ) {
    declaration.remove();
  }
  normalize(file);
  return true;
}

/** Add `export * from "…"` if it isn't already there (the endpoint index). */
export function addExportStar(
  file: SourceFile,
  moduleSpecifier: string,
): boolean {
  const exists = file
    .getExportDeclarations()
    .some(
      (declaration) =>
        declaration.getModuleSpecifierValue() === moduleSpecifier,
    );
  if (exists) return false;
  file.addExportDeclaration({ moduleSpecifier });
  normalize(file);
  return true;
}

export function removeExportStar(
  file: SourceFile,
  moduleSpecifier: string,
): boolean {
  const declaration = file
    .getExportDeclarations()
    .find(
      (candidate) => candidate.getModuleSpecifierValue() === moduleSpecifier,
    );
  if (!declaration) return false;
  declaration.remove();
  normalize(file);
  return true;
}

/**
 * Add a nested namespace to a message catalog (`const en = { … }`).
 *
 * Catalogs are plain nested objects, so this is the same object-property edit —
 * it exists separately because the entry point is the default-exported
 * `const <locale>` whose name varies per file.
 */
export function addCatalogNamespace(
  file: SourceFile,
  key: string,
  objectText: string,
): boolean {
  const declaration = file
    .getVariableDeclarations()
    .find((candidate) => candidate.isExported() || candidate.getName().length <= 5);

  const catalogName =
    declaration?.getName() ??
    file.getVariableDeclarations()[0]?.getName() ??
    "";

  if (!catalogName) {
    throw new Error(`Could not find the catalog object in ${file.getBaseName()}.`);
  }
  return addObjectProperty(file, catalogName, key, objectText);
}

export function removeCatalogNamespace(
  file: SourceFile,
  key: string,
): boolean {
  const catalogName = file.getVariableDeclarations()[0]?.getName();
  if (!catalogName) return false;
  return removeObjectProperty(file, catalogName, key);
}

/** Persist every modified file. */
export async function save(project: Project): Promise<void> {
  await project.save();
}

/** Utility for tests: apply an edit to a string and return the result. */
export function withVirtualFile(
  fileName: string,
  source: string,
  edit: (file: SourceFile) => void,
): string {
  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile(fileName, source);
  edit(file);
  return file.getFullText();
}
