import type { RssArticle, RssFeed, RssTree } from "@/api/schemas";

/** qBittorrent joins RSS folder and feed names with a backslash (Item::PathSeparator). */
export const RSS_SEPARATOR = "\\";

export interface FeedEntry {
  /** Path for rss/* calls ("Linux\\Ubuntu Releases"). */
  path: string;
  name: string;
  /** Folder path above the feed, "" at the top. */
  folder: string;
  feed: RssFeed;
  unread: number;
}

export interface ArticleEntry extends RssArticle {
  feedPath: string;
  feedName: string;
  /** Unix milliseconds, 0 when unknown. */
  time: number;
}

export const isFeed = (node: RssFeed | RssTree): node is RssFeed => typeof (node as RssFeed).uid === "string";

/** Feeds in tree order, folders first by name. Folders without feeds are listed in `folders`. */
export function flattenRss(tree: RssTree, prefix = ""): { feeds: FeedEntry[]; folders: string[] } {
  const feeds: FeedEntry[] = [];
  const folders: string[] = [];
  const entries = Object.entries(tree).sort(([a, x], [b, y]) =>
    isFeed(x) === isFeed(y) ? a.localeCompare(b) : isFeed(x) ? 1 : -1,
  );
  for (const [name, node] of entries) {
    const path = prefix ? `${prefix}${RSS_SEPARATOR}${name}` : name;
    if (isFeed(node)) {
      feeds.push({ path, name, folder: prefix, feed: node, unread: node.articles.filter((a) => !a.isRead).length });
    } else {
      folders.push(path);
      const sub = flattenRss(node, path);
      feeds.push(...sub.feeds);
      folders.push(...sub.folders);
    }
  }
  return { feeds, folders };
}

export function articleTime(date: string): number {
  const t = Date.parse(date);
  return Number.isNaN(t) ? 0 : t;
}

/** Articles of the given feeds, newest first. */
export function collectArticles(feeds: FeedEntry[]): ArticleEntry[] {
  return feeds
    .flatMap((f) =>
      f.feed.articles.map((a) => ({ ...a, feedPath: f.path, feedName: f.name, time: articleTime(a.date) })),
    )
    .sort((a, b) => b.time - a.time);
}

/** RSS descriptions are HTML from other sites: shown as plain text only. */
export function plainText(html: string | undefined): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** A rule suggestion from an article title: the words without numbers in brackets and file endings. */
export function suggestRule(title: string): { name: string; mustContain: string } {
  const words = title
    .replace(/\.(iso|mkv|mp4|torrent)$/i, "")
    .replace(/[()[\]]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/^\d+p$/i.test(w));
  return { name: words.slice(0, 4).join(" "), mustContain: words.join(" ").toLowerCase() };
}

/** Marks articles as read in the cached tree at once (rss/markAsRead follows). "" is everything. */
export function markReadInTree(
  tree: RssTree,
  itemPath: string,
  articleId?: string,
  prefix = "",
  inside = false,
): RssTree {
  const out: RssTree = {};
  for (const [name, child] of Object.entries(tree)) {
    const path = prefix ? `${prefix}${RSS_SEPARATOR}${name}` : name;
    const mark = inside || !itemPath || path === itemPath;
    if (isFeed(child)) {
      out[name] = mark
        ? {
            ...child,
            articles: child.articles.map((a) => (!articleId || a.id === articleId ? { ...a, isRead: true } : a)),
          }
        : child;
    } else {
      out[name] =
        mark || itemPath.startsWith(`${path}${RSS_SEPARATOR}`)
          ? markReadInTree(child, itemPath, articleId, path, mark)
          : child;
    }
  }
  return out;
}
