import { createFileRoute } from "@tanstack/react-router";
import { TorrentsPage } from "@/components/torrents/torrents-page";
import { type StatusFilter, statusFilters } from "@/lib/torrents";

export const detailTabs = ["overview", "files", "peers", "trackers"] as const;
export type DetailTab = (typeof detailTabs)[number];

export interface TorrentsSearch {
  status?: StatusFilter;
  category?: string;
  tag?: string;
  tracker?: string;
  /** Hash of the torrent whose details are open. */
  torrent?: string;
  tab?: DetailTab;
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);

export const Route = createFileRoute("/torrents")({
  validateSearch: (search: Record<string, unknown>): TorrentsSearch => ({
    status: statusFilters.includes(search.status as StatusFilter) ? (search.status as StatusFilter) : undefined,
    category: str(search.category),
    tag: str(search.tag),
    tracker: str(search.tracker),
    torrent: str(search.torrent),
    tab: detailTabs.includes(search.tab as DetailTab) ? (search.tab as DetailTab) : undefined,
  }),
  component: TorrentsPage,
});
