import type { MaindataState } from "@/api/maindata";
import type { Torrent } from "@/api/schemas";
import { trackerHost } from "./format";

/**
 * What a torrent is doing, in plain words. One group per word shown in the list
 * (an icon plus the word, no coloured pill). States: serialize_torrent.cpp.
 */
export type StatusKind =
  | "downloading"
  | "metadata"
  | "stalled"
  | "queued"
  | "checking"
  | "seeding"
  | "stopped"
  | "moving"
  | "error"
  | "missing";

export function statusKind(state: string): StatusKind {
  switch (state) {
    case "downloading":
    case "forcedDL":
      return "downloading";
    case "metaDL":
    case "forcedMetaDL":
      return "metadata";
    case "stalledDL":
      return "stalled";
    case "queuedDL":
    case "queuedUP":
      return "queued";
    case "checkingDL":
    case "checkingUP":
    case "checkingResumeData":
      return "checking";
    case "uploading":
    case "forcedUP":
    case "stalledUP":
      return "seeding";
    case "stoppedDL":
    case "stoppedUP":
      return "stopped";
    case "moving":
      return "moving";
    case "missingFiles":
      return "missing";
    default:
      return "error";
  }
}

export const isStopped = (t: Pick<Torrent, "state">) => t.state.startsWith("stopped");
export const isErrored = (t: Pick<Torrent, "state">) =>
  t.state === "error" || t.state === "unknown" || t.state === "missingFiles";

/**
 * Status filters of the stock WebUI (applyFilter in www/private/scripts/dynamicTable.js).
 * One deliberate difference: "downloading" leaves out stopped and errored torrents, so the
 * five filters in the sidebar do not overlap ("3 laden, 4 seeden, 2 gestoppt, 1 mit Fehler").
 */
export const statusFilters = [
  "all",
  "downloading",
  "seeding",
  "stopped",
  "errored",
  "completed",
  "running",
  "active",
  "inactive",
  "stalled",
  "stalled_uploading",
  "stalled_downloading",
  "checking",
  "moving",
] as const;
export type StatusFilter = (typeof statusFilters)[number];
export const mainStatusFilters: StatusFilter[] = ["all", "downloading", "seeding", "stopped", "errored"];

export function matchesStatus(t: Torrent, filter: StatusFilter): boolean {
  const s = t.state;
  switch (filter) {
    case "all":
      return true;
    case "downloading":
      return (s === "downloading" || s.includes("DL")) && s !== "stoppedDL";
    case "seeding":
      return ["uploading", "forcedUP", "stalledUP", "queuedUP", "checkingUP"].includes(s);
    case "completed":
      return s === "uploading" || s.includes("UP");
    case "stopped":
      return s.includes("stopped");
    case "running":
      return !s.includes("stopped");
    case "stalled":
      return s === "stalledUP" || s === "stalledDL";
    case "stalled_uploading":
      return s === "stalledUP";
    case "stalled_downloading":
      return s === "stalledDL";
    case "active":
      return t.upspeed > 0 || t.dlspeed > 0;
    case "inactive":
      return !(t.upspeed > 0 || t.dlspeed > 0);
    case "checking":
      return s === "checkingUP" || s === "checkingDL" || s === "checkingResumeData";
    case "moving":
      return s === "moving";
    case "errored":
      return isErrored(t);
  }
}

export const UNCATEGORIZED = "\u0000none";
export const UNTAGGED = "\u0000none";
export const TRACKERLESS = "\u0000none";
export const TRACKER_ERROR = "\u0000error";
export const TRACKER_WARNING = "\u0000warning";

export function torrentTags(t: Pick<Torrent, "tags">): string[] {
  return t.tags
    ? t.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];
}

/** A category filter includes its subcategories ("Filme" matches "Filme/4K"), as in the stock WebUI. */
export function matchesCategory(t: Torrent, category: string): boolean {
  if (category === UNCATEGORIZED) return t.category === "";
  return `${t.category}/`.startsWith(`${category}/`);
}

export function matchesTag(t: Torrent, tag: string): boolean {
  const tags = torrentTags(t);
  return tag === UNTAGGED ? tags.length === 0 : tags.includes(tag);
}

/** Tracker hosts → torrent hashes, from maindata's "trackers" (url → hashes). */
export function trackerHosts(trackers: MaindataState["trackers"]): Map<string, Set<string>> {
  const hosts = new Map<string, Set<string>>();
  for (const [url, hashes] of Object.entries(trackers)) {
    const host = trackerHost(url);
    let set = hosts.get(host);
    if (!set) {
      set = new Set();
      hosts.set(host, set);
    }
    for (const hash of hashes) set.add(hash);
  }
  return hosts;
}

export function matchesTracker(t: Torrent, tracker: string, hosts: Map<string, Set<string>>): boolean {
  if (tracker === TRACKERLESS) return t.trackers_count === 0;
  if (tracker === TRACKER_ERROR) return t.has_tracker_error;
  if (tracker === TRACKER_WARNING) return t.has_tracker_warning;
  return hosts.get(tracker)?.has(t.hash) ?? false;
}

export interface TextFilter {
  text: string;
  /** Where to look: the name (default), the save path or the info hashes. */
  field: "name" | "path" | "hash";
  regex: boolean;
}

/**
 * The text filter of the stock WebUI: every space-separated term must occur
 * (case-insensitive), or one regular expression. An invalid regex matches nothing.
 */
export function textMatcher(filter: TextFilter): (t: Torrent) => boolean {
  const text = filter.text.trim();
  if (!text) return () => true;
  const value = (t: Torrent) =>
    filter.field === "path"
      ? t.save_path
      : filter.field === "hash"
        ? `${t.infohash_v1} ${t.infohash_v2} ${t.hash}`
        : t.name;
  if (filter.regex) {
    let re: RegExp;
    try {
      re = new RegExp(text, "i");
    } catch {
      return () => false;
    }
    return (t) => re.test(value(t));
  }
  const terms = text.toLowerCase().split(/\s+/);
  return (t) => {
    const v = value(t).toLowerCase();
    return terms.every((term) => v.includes(term));
  };
}

export interface TorrentQuery {
  status: StatusFilter;
  category?: string;
  tag?: string;
  tracker?: string;
}

export function filterTorrents(data: MaindataState, query: TorrentQuery): Torrent[] {
  const hosts = query.tracker ? trackerHosts(data.trackers) : new Map();
  return Object.values(data.torrents).filter(
    (t) =>
      matchesStatus(t, query.status) &&
      (query.category === undefined || matchesCategory(t, query.category)) &&
      (query.tag === undefined || matchesTag(t, query.tag)) &&
      (query.tracker === undefined || matchesTracker(t, query.tracker, hosts)),
  );
}

export function countBy<T>(items: T[], predicate: (item: T) => boolean): number {
  let n = 0;
  for (const item of items) if (predicate(item)) n++;
  return n;
}

/** Categories as a tree, sorted, with depth for indenting ("Filme", "Filme/4K"). */
export function categoryTree(names: string[]): { name: string; label: string; depth: number }[] {
  return [...names]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const parts = name.split("/");
      return { name, label: parts[parts.length - 1] ?? name, depth: parts.length - 1 };
    });
}
