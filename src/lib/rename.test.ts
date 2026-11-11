import { describe, expect, it } from "vitest";
import { computeRenames, defaultRenameOptions, type RenameOptions, renameProblems } from "./rename";

const targets = [
  { path: "Show", isDir: true },
  { path: "Show/show.s01e01.mkv", isDir: false },
  { path: "Show/show.s01e02.mkv", isDir: false },
  { path: "Show/notes.TXT", isDir: false },
];
const run = (o: Partial<RenameOptions>) => computeRenames(targets, { ...defaultRenameOptions, ...o });

describe("computeRenames", () => {
  it("replaces plain text, case-insensitively, files only by default", () => {
    const r = run({ search: "SHOW", replace: "Serie" });
    expect(r.ok && r.renames.map((x) => x.newPath)).toEqual(["Show/Serie.s01e01.mkv", "Show/Serie.s01e02.mkv"]);
  });

  it("first occurrence or all occurrences", () => {
    const one = computeRenames([{ path: "a.a.a", isDir: false }], {
      ...defaultRenameOptions,
      search: "a",
      replace: "b",
    });
    const all = computeRenames([{ path: "a.a.a", isDir: false }], {
      ...defaultRenameOptions,
      search: "a",
      replace: "b",
      matchAll: true,
    });
    expect(one.ok && one.renames[0]?.to).toBe("b.a.a");
    expect(all.ok && all.renames[0]?.to).toBe("b.b.b");
  });

  it("regex groups and a running number", () => {
    const r = run({ search: "s(\\d+)e(?<ep>\\d+)", replace: "S$1E$ep-$dd", regex: true, enumerateFrom: 1 });
    expect(r.ok && r.renames.map((x) => x.to)).toEqual(["show.S01E01-01.mkv", "show.S01E02-02.mkv"]);
  });

  it("only the extension, only the name, and folders", () => {
    const ext = run({ search: "txt", replace: "md", appliesTo: "extension" });
    expect(ext.ok && ext.renames.map((x) => x.to)).toEqual(["notes.md"]);
    const name = run({ search: "mkv", replace: "x", appliesTo: "name" });
    expect(name.ok && name.renames).toEqual([]);
    const folders = run({ search: "Show", replace: "Serie", includeFiles: false, includeFolders: true });
    expect(folders.ok && folders.renames.map((x) => x.newPath)).toEqual(["Serie"]);
  });

  it("reports a broken regex", () => {
    expect(run({ search: "(", regex: true }).ok).toBe(false);
  });

  it("finds duplicates and slashes", () => {
    const r = run({ search: "e0\\d", replace: "x", regex: true });
    if (!r.ok) throw new Error();
    const problems = renameProblems(
      r.renames,
      targets.map((t) => t.path),
    );
    expect([...problems.values()]).toEqual(["duplicate"]);
    const slash = run({ search: "notes", replace: "a/b" });
    if (!slash.ok) throw new Error();
    expect([...renameProblems(slash.renames, []).values()]).toEqual(["slash"]);
  });
});
