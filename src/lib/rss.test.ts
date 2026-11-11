import { describe, expect, it } from "vitest";
import type { RssTree } from "@/api/schemas";
import { collectArticles, flattenRss, markReadInTree, suggestRule } from "./rss";

const feed = (uid: string, articles: { id: string; date: string; isRead?: boolean }[]) => ({
  uid,
  url: `https://x/${uid}`,
  title: uid,
  isLoading: false,
  hasError: false,
  articles: articles.map((a) => ({ title: a.id, isRead: false, ...a })),
});

const tree = {
  Zeta: feed("z", [{ id: "1", date: "2026-11-10T10:00:00Z" }]),
  Linux: {
    Ubuntu: feed("u", [
      { id: "2", date: "2026-11-11T10:00:00Z" },
      { id: "3", date: "2026-11-09T10:00:00Z", isRead: true },
    ]),
    Leer: {},
  },
} as unknown as RssTree;

describe("rss", () => {
  it("flattens folders before feeds, with paths and unread counts", () => {
    const { feeds, folders } = flattenRss(tree);
    expect(feeds.map((f) => f.path)).toEqual(["Linux\\Ubuntu", "Zeta"]);
    expect(feeds[0]?.unread).toBe(1);
    expect(folders).toEqual(["Linux", "Linux\\Leer"]);
  });
  it("collects articles newest first", () => {
    const articles = collectArticles(flattenRss(tree).feeds);
    expect(articles.map((a) => a.id)).toEqual(["2", "1", "3"]);
    expect(articles[0]?.feedPath).toBe("Linux\\Ubuntu");
  });
  it("suggests a rule from a title", () => {
    expect(suggestRule("Ubuntu 26.04.1 LTS Desktop (amd64)")).toEqual({
      name: "Ubuntu 26.04.1 LTS Desktop",
      mustContain: "ubuntu 26.04.1 lts desktop amd64",
    });
  });
});

describe("markReadInTree", () => {
  it("marks one article, one feed, a folder or everything", () => {
    const unread = (t: RssTree) => flattenRss(t).feeds.reduce((s, f) => s + f.unread, 0);
    expect(unread(tree)).toBe(2);
    expect(unread(markReadInTree(tree, "Linux\\Ubuntu", "2"))).toBe(1);
    expect(unread(markReadInTree(tree, "Linux"))).toBe(1);
    expect(unread(markReadInTree(tree, "Zeta"))).toBe(1);
    expect(unread(markReadInTree(tree, ""))).toBe(0);
  });
});
