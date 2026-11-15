import { describe, expect, it } from "vitest";
import type { SearchPlugin } from "@/api/schemas";
import { chosenSources, sourceCategories, toggleSource } from "./search-sources";

const plugin = (name: string, categories: [string, string][]): SearchPlugin => ({
  name,
  fullName: name.toUpperCase(),
  version: "1.0",
  url: `https://${name}.example`,
  enabled: true,
  supportedCategories: [{ id: "all", name: "All" }, ...categories.map(([id, n]) => ({ id, name: n }))],
});

const a = plugin("a", [["movies", "Movies"]]);
const b = plugin("b", [
  ["software", "Software"],
  ["books", "Books"],
]);

describe("search sources", () => {
  it("keeps only plugins that are still enabled", () => {
    expect(chosenSources(["b", "gone"], [a, b])).toEqual(["b"]);
    expect(chosenSources(["gone"], [a, b])).toEqual([]);
    expect(chosenSources([], [a, b])).toEqual([]);
  });

  it("lists the categories of the chosen plugins, or of all", () => {
    expect(sourceCategories([a, b], [])).toEqual([
      ["books", "Books"],
      ["movies", "Movies"],
      ["software", "Software"],
    ]);
    expect(sourceCategories([a, b], ["a"])).toEqual([["movies", "Movies"]]);
  });

  it("toggles a plugin, and choosing every plugin means all", () => {
    expect(toggleSource([], "a", 3)).toEqual(["a"]);
    expect(toggleSource(["a"], "b", 3)).toEqual(["a", "b"]);
    expect(toggleSource(["a", "b"], "a", 3)).toEqual(["b"]);
    expect(toggleSource(["a"], "b", 2)).toEqual([]);
  });
});
