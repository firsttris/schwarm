/**
 * Renaming several files of a torrent with a pattern, as the stock WebUI does it
 * (www/private/scripts/rename-files.js): search text or regular expression, replacement with
 * $1… and named groups, $d…$dddddddd for a running number, applied to the name, the extension
 * or both, for files and/or folders.
 */

export type AppliesTo = "both" | "name" | "extension";

export interface RenameOptions {
  search: string;
  replace: string;
  regex: boolean;
  matchAll: boolean;
  caseSensitive: boolean;
  appliesTo: AppliesTo;
  includeFiles: boolean;
  includeFolders: boolean;
  /** First number for $d. */
  enumerateFrom: number;
}

export const defaultRenameOptions: RenameOptions = {
  search: "",
  replace: "",
  regex: false,
  matchAll: false,
  caseSensitive: false,
  appliesTo: "both",
  includeFiles: true,
  includeFolders: false,
  enumerateFrom: 0,
};

export interface RenameTarget {
  /** Full path inside the torrent ("Sintel/Untertitel/de.srt"). */
  path: string;
  isDir: boolean;
}

export interface Rename extends RenameTarget {
  from: string;
  to: string;
  newPath: string;
}

export type RenameResult = { ok: true; renames: Rename[] } | { ok: false; error: string };

const escapeRegex = (text: string) => text.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");

function splitName(name: string, isDir: boolean): [string, string] {
  const dot = name.lastIndexOf(".");
  if (isDir || dot <= 0) return [name, ""];
  return [name.slice(0, dot), name.slice(dot)];
}

function expand(replacement: string, match: RegExpExecArray, n: number): string {
  return replacement.replace(/\\\$|\$(\d+|[A-Za-z_]\w*)?/g, (token, name: string | undefined) => {
    if (token === "\\$") return "$";
    if (name === undefined) return "";
    if (/^\d+$/.test(name)) return match[Number(name)] ?? "";
    if (match.groups && name in match.groups) return match.groups[name] ?? "";
    if (/^d{1,8}$/.test(name)) return String(n).padStart(name.length, "0");
    return token;
  });
}

/** Computes the new names; targets in tree order (folders before their contents). */
export function computeRenames(targets: RenameTarget[], options: RenameOptions): RenameResult {
  if (!options.search) return { ok: true, renames: [] };
  const flags = `${options.matchAll ? "g" : ""}${options.caseSensitive ? "" : "i"}`;
  let pattern: RegExp;
  try {
    pattern = new RegExp(options.regex ? options.search : escapeRegex(options.search), flags);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  const renames: Rename[] = [];
  let n = options.enumerateFrom;
  for (const target of targets) {
    if (target.isDir ? !options.includeFolders : !options.includeFiles) continue;
    const slash = target.path.lastIndexOf("/");
    const parent = slash >= 0 ? target.path.slice(0, slash + 1) : "";
    const name = target.path.slice(slash + 1);
    const [base, ext] = splitName(name, target.isDir);
    const [subject, offset] =
      options.appliesTo === "name" ? [base, 0] : options.appliesTo === "extension" ? [ext, base.length] : [name, 0];

    const matches: RegExpExecArray[] = [];
    pattern.lastIndex = 0;
    if (pattern.global) {
      for (let m = pattern.exec(subject); m; m = pattern.exec(subject)) {
        matches.push(m);
        if (m[0] === "") pattern.lastIndex++;
      }
    } else {
      const m = pattern.exec(subject);
      if (m) matches.push(m);
    }
    if (!matches.length) continue;

    let to = name;
    for (const match of [...matches].reverse()) {
      const start = match.index + offset;
      to = to.slice(0, start) + expand(options.replace, match, n) + to.slice(start + match[0].length);
    }
    n++;
    if (to !== name) renames.push({ ...target, from: name, to, newPath: parent + to });
  }
  return { ok: true, renames };
}

/** Problems that qBittorrent would refuse: empty names, slashes, two items with the same new path. */
export function renameProblems(renames: Rename[], existing: string[]): Map<string, string> {
  const problems = new Map<string, string>();
  const taken = new Set(existing);
  for (const r of renames) taken.delete(r.path);
  for (const r of renames) {
    if (!r.to.trim()) problems.set(r.path, "empty");
    else if (r.to.includes("/") || r.to.includes("\\")) problems.set(r.path, "slash");
    else if (taken.has(r.newPath)) problems.set(r.path, "duplicate");
    taken.add(r.newPath);
  }
  return problems;
}
