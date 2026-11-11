import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import pkg from "../package.json";
import { checkBuild } from "./check-build";

/**
 * Builds the release ZIP: schwarm-vX.Y.Z.zip with schwarm/public/… and schwarm/version.txt
 * (docs/spec.md, "Release"). Run after `bun run build`.
 */
const version = `v${pkg.version}`;
const out = "release";
const root = join(out, "schwarm");

const problems = await checkBuild("dist/public");
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

await rm(out, { recursive: true, force: true });
await mkdir(root, { recursive: true });
await cp("dist/public", join(root, "public"), { recursive: true, dereference: true });
await writeFile(join(root, "version.txt"), `${version}\n`);
const zip = `schwarm-${version}.zip`;
await $`zip -rqX ${zip} schwarm`.cwd(out);
console.log(`${out}/${zip}`);
