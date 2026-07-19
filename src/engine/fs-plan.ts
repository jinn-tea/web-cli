import fs from "fs-extra";
import path from "node:path";
import pc from "picocolors";

/**
 * Transactional filesystem layer.
 *
 * Every command builds a complete PLAN before touching disk, so `--dry-run` is
 * free and a mid-run failure can be undone. The Flutter CLI this is modelled on
 * has neither: a failed `create` leaves a half-scaffolded directory that the
 * user has to identify and delete by hand.
 *
 * Two commit strategies:
 *  - `commitFresh` (create): render into a staging dir, then rename into place
 *    atomically. Failure deletes staging; the target never half-exists.
 *  - `commit` (generators): snapshot every file that will be touched, apply,
 *    and on failure restore the snapshots and remove anything created.
 */

export type FileOp =
  | { kind: "write"; path: string; content: string }
  | { kind: "copy"; from: string; to: string }
  | { kind: "mkdir"; path: string }
  | { kind: "delete"; path: string }
  | {
      kind: "codemod";
      path: string;
      /** Shown in dry-run — say what changes, not just which file. */
      description: string;
      apply: () => void | Promise<void>;
    };

export interface PlanResult {
  applied: FileOp[];
  skipped: { op: FileOp; reason: string }[];
}

export class FilePlan {
  private readonly ops: FileOp[] = [];

  constructor(private readonly root: string) {}

  add(op: FileOp): this {
    this.ops.push(op);
    return this;
  }

  write(filePath: string, content: string): this {
    return this.add({ kind: "write", path: this.resolve(filePath), content });
  }

  copy(from: string, to: string): this {
    return this.add({ kind: "copy", from, to: this.resolve(to) });
  }

  delete(filePath: string): this {
    return this.add({ kind: "delete", path: this.resolve(filePath) });
  }

  codemod(
    filePath: string,
    description: string,
    apply: () => void | Promise<void>,
  ): this {
    return this.add({
      kind: "codemod",
      path: this.resolve(filePath),
      description,
      apply,
    });
  }

  get size(): number {
    return this.ops.length;
  }

  private resolve(filePath: string): string {
    return path.isAbsolute(filePath) ? filePath : path.join(this.root, filePath);
  }

  /** Guard: never let a plan touch anything outside the project root. */
  private assertInsideRoot(target: string): void {
    const relative = path.relative(this.root, target);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(
        `Refusing to modify "${target}" — it is outside the project root.`,
      );
    }
  }

  /** Human-readable plan for `--dry-run`. */
  describe(): string {
    if (this.ops.length === 0) return pc.dim("Nothing to do.");

    const lines = this.ops.map((op) => {
      const rel = (target: string) => path.relative(this.root, target) || ".";
      switch (op.kind) {
        case "write":
          return `${pc.green("+")} ${rel(op.path)}`;
        case "copy":
          return `${pc.green("+")} ${rel(op.to)}`;
        case "mkdir":
          return `${pc.green("+")} ${rel(op.path)}/`;
        case "delete":
          return `${pc.red("-")} ${rel(op.path)}`;
        case "codemod":
          return `${pc.yellow("~")} ${rel(op.path)} ${pc.dim(`— ${op.description}`)}`;
      }
    });

    return lines.join("\n");
  }

  /**
   * Apply with snapshot-and-rollback. Use for generators run inside an existing
   * project.
   */
  async commit(): Promise<PlanResult> {
    const snapshots = new Map<string, string | null>();
    const created: string[] = [];
    const applied: FileOp[] = [];

    const snapshot = async (target: string) => {
      if (snapshots.has(target)) return;
      snapshots.set(
        target,
        (await fs.pathExists(target)) ? await fs.readFile(target, "utf8") : null,
      );
    };

    try {
      for (const op of this.ops) {
        switch (op.kind) {
          case "write": {
            this.assertInsideRoot(op.path);
            await snapshot(op.path);
            if (!(await fs.pathExists(op.path))) created.push(op.path);
            await fs.outputFile(op.path, op.content, "utf8");
            break;
          }
          case "copy": {
            this.assertInsideRoot(op.to);
            await snapshot(op.to);
            if (!(await fs.pathExists(op.to))) created.push(op.to);
            await fs.copy(op.from, op.to, { overwrite: true });
            break;
          }
          case "mkdir": {
            this.assertInsideRoot(op.path);
            await fs.ensureDir(op.path);
            created.push(op.path);
            break;
          }
          case "delete": {
            this.assertInsideRoot(op.path);
            await snapshot(op.path);
            await fs.remove(op.path);
            break;
          }
          case "codemod": {
            this.assertInsideRoot(op.path);
            await snapshot(op.path);
            await op.apply();
            break;
          }
        }
        applied.push(op);
      }

      return { applied, skipped: [] };
    } catch (error) {
      // Put everything back exactly as it was before blaming the user.
      await rollback(snapshots, created);
      throw error;
    }
  }
}

async function rollback(
  snapshots: Map<string, string | null>,
  created: string[],
): Promise<void> {
  for (const [target, content] of snapshots) {
    if (content === null) {
      await fs.remove(target).catch(() => undefined);
    } else {
      await fs.outputFile(target, content, "utf8").catch(() => undefined);
    }
  }
  for (const target of created) {
    if (!snapshots.has(target)) {
      await fs.remove(target).catch(() => undefined);
    }
  }
}

/**
 * Create a brand-new directory atomically: build it under a staging path, then
 * rename. The target directory either exists complete, or never appears.
 */
export async function commitFresh(
  targetDir: string,
  build: (stagingDir: string) => Promise<void>,
): Promise<void> {
  const staging = `${targetDir}.codeable-staging`;
  await fs.remove(staging);
  await fs.ensureDir(staging);

  try {
    await build(staging);
    await fs.remove(targetDir);
    await fs.move(staging, targetDir);
  } catch (error) {
    await fs.remove(staging).catch(() => undefined);
    throw error;
  }
}
