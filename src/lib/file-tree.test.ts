import { describe, expect, it } from "vitest";
import { buildFileTree, filterTree, flattenTree, MIXED } from "./file-tree";

const files = [
  { index: 0, name: "S/movie.mkv", size: 100, progress: 0.5, priority: 1 },
  { index: 1, name: "S/Subs/de.srt", size: 10, progress: 1, priority: 6 },
  { index: 2, name: "S/Subs/fr.srt", size: 10, progress: 0, priority: 0 },
];

describe("file tree", () => {
  it("builds folders with sizes, progress and mixed priority", () => {
    const [root] = buildFileTree(files);
    expect(root?.name).toBe("S");
    expect(root?.size).toBe(120);
    expect(root?.progress).toBeCloseTo((50 + 10) / 120);
    expect(root?.priority).toBe(MIXED);
    expect(root?.indices.sort()).toEqual([0, 1, 2]);
    expect(root?.children.map((c) => c.name)).toEqual(["Subs", "movie.mkv"]);
  });
  it("flattens with collapsed folders and filters", () => {
    const tree = buildFileTree(files);
    expect(flattenTree(tree).map((n) => n.name)).toEqual(["S", "Subs", "de.srt", "fr.srt", "movie.mkv"]);
    expect(flattenTree(tree, new Set(["S/Subs"])).map((n) => n.name)).toEqual(["S", "Subs", "movie.mkv"]);
    expect(flattenTree(filterTree(tree, "fr")).map((n) => n.name)).toEqual(["S", "Subs", "fr.srt"]);
  });
});
