import { lstat, readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

/**
 * Checks the build for what qBittorrent's alternative WebUI requires
 * (src/webui/webapplication.cpp at release-5.3.0):
 * - no "QBT_TR(" in text files: qBittorrent runs HTML, JS and CSS through its translator,
 *   which would replace such strings;
 * - no symlinks: qBittorrent refuses to serve them;
 * - index.html with relative asset paths only (the folder is served under any path).
 */
export async function checkBuild(dir: string): Promise<string[]> {
  const problems: string[] = [];
  const walk = async (folder: string): Promise<string[]> => {
    const out: string[] = [];
    for (const entry of await readdir(folder)) {
      const path = join(folder, entry);
      const info = await lstat(path);
      if (info.isSymbolicLink()) problems.push(`symlink: ${relative(dir, path)}`);
      else if (info.isDirectory()) out.push(...(await walk(path)));
      else out.push(path);
    }
    return out;
  };
  const files = await walk(dir);
  if (!files.some((f) => relative(dir, f) === "index.html")) problems.push("index.html is missing");
  for (const file of files) {
    if (!/\.(html|js|css|json|svg|txt|webmanifest|map)$/.test(file)) continue;
    const text = await readFile(file, "utf8");
    if (text.includes("QBT_TR(")) problems.push(`QBT_TR( in ${relative(dir, file)}`);
    if (file.endsWith(".html") && /(src|href)="\/(?!\/)/.test(text)) {
      problems.push(`absolute asset path in ${relative(dir, file)}`);
    }
  }
  return problems;
}

if (import.meta.main) {
  const dir = process.argv[2] ?? "dist/public";
  const problems = await checkBuild(dir);
  if (problems.length) {
    console.error(`Build check failed for ${dir}:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`Build check passed for ${dir}`);
}
