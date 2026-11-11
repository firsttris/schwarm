import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkBuild } from "./check-build";

let dir: string;
afterEach(() => rm(dir, { recursive: true, force: true }));

describe("checkBuild", () => {
  it("passes a clean build", async () => {
    dir = await mkdtemp(join(tmpdir(), "schwarm-"));
    await writeFile(join(dir, "index.html"), '<script src="./assets/a.js"></script>');
    expect(await checkBuild(dir)).toEqual([]);
  });
  it("finds QBT_TR(, symlinks and absolute paths", async () => {
    dir = await mkdtemp(join(tmpdir(), "schwarm-"));
    await mkdir(join(dir, "assets"));
    await writeFile(join(dir, "index.html"), '<script src="/assets/a.js"></script>');
    await writeFile(join(dir, "assets", "a.js"), 'x("QBT_TR(Hi)")');
    await symlink(join(dir, "assets", "a.js"), join(dir, "link.js"));
    const problems = await checkBuild(dir);
    expect(problems).toHaveLength(3);
  });
});
