import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { pollInterval } from "@/api/queries";
import { flattenRss } from "@/lib/rss";

export const rssItemsKey = ["rss", "items"] as const;

/** rss/items with the articles; polled slowly, qBittorrent fetches the feeds on its own. */
export function useRssItems() {
  return useQuery({ queryKey: rssItemsKey, queryFn: api.rssItems, refetchInterval: pollInterval(30_000) });
}

/** Unread articles over all feeds, for the "RSS" entry in the navigation. */
export function useRssUnread(): number | undefined {
  const { data } = useRssItems();
  return data ? flattenRss(data).feeds.reduce((s, f) => s + f.unread, 0) : undefined;
}
