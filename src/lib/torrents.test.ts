import { describe, expect, it } from "vitest";
import type { Torrent } from "@/api/schemas";
import {
  categoryTree,
  matchesCategory,
  matchesStatus,
  matchesTag,
  statusKind,
  textMatcher,
  UNCATEGORIZED,
} from "./torrents";

const t = (over: Partial<Torrent>): Torrent =>
  ({
    hash: "h",
    name: "n",
    state: "downloading",
    dlspeed: 0,
    upspeed: 0,
    category: "",
    tags: "",
    save_path: "/d",
    infohash_v1: "abc",
    infohash_v2: "",
    ...over,
  }) as Torrent;

describe("status", () => {
  it("maps states to plain words", () => {
    expect(statusKind("stalledUP")).toBe("seeding");
    expect(statusKind("stoppedDL")).toBe("stopped");
    expect(statusKind("missingFiles")).toBe("missing");
    expect(statusKind("somethingNew")).toBe("error");
  });

  it("filters like the stock WebUI, but downloading leaves out stopped torrents", () => {
    expect(matchesStatus(t({ state: "stalledDL" }), "downloading")).toBe(true);
    expect(matchesStatus(t({ state: "stoppedDL" }), "downloading")).toBe(false);
    expect(matchesStatus(t({ state: "stoppedDL" }), "stopped")).toBe(true);
    expect(matchesStatus(t({ state: "queuedUP" }), "seeding")).toBe(true);
    expect(matchesStatus(t({ state: "stoppedUP" }), "completed")).toBe(true);
    expect(matchesStatus(t({ state: "error" }), "errored")).toBe(true);
    expect(matchesStatus(t({ upspeed: 1 }), "active")).toBe(true);
    expect(matchesStatus(t({}), "inactive")).toBe(true);
  });
});

describe("category and tag", () => {
  it("includes subcategories", () => {
    expect(matchesCategory(t({ category: "Filme/4K" }), "Filme")).toBe(true);
    expect(matchesCategory(t({ category: "Filmeabend" }), "Filme")).toBe(false);
    expect(matchesCategory(t({ category: "" }), UNCATEGORIZED)).toBe(true);
  });
  it("splits tags", () => {
    expect(matchesTag(t({ tags: "4K, behalten" }), "behalten")).toBe(true);
    expect(matchesTag(t({ tags: "4K" }), "4")).toBe(false);
  });
  it("builds the category tree", () => {
    expect(categoryTree(["Filme/4K", "Linux", "Filme"])).toEqual([
      { name: "Filme", label: "Filme", depth: 0 },
      { name: "Filme/4K", label: "4K", depth: 1 },
      { name: "Linux", label: "Linux", depth: 0 },
    ]);
  });
});

describe("text filter", () => {
  it("needs every term", () => {
    const match = textMatcher({ text: "ubuntu iso", field: "name", regex: false });
    expect(match(t({ name: "ubuntu-26.04-desktop.iso" }))).toBe(true);
    expect(match(t({ name: "ubuntu-26.04.img" }))).toBe(false);
  });
  it("supports regex, path and hash; a broken regex matches nothing", () => {
    expect(textMatcher({ text: "^/d$", field: "path", regex: true })(t({}))).toBe(true);
    expect(textMatcher({ text: "ABC", field: "hash", regex: false })(t({}))).toBe(true);
    expect(textMatcher({ text: "(", field: "name", regex: true })(t({}))).toBe(false);
  });
});
