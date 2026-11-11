import type { Category, MaindataResponse, PeerDelta, ServerState, Torrent } from "./schemas";

/**
 * The merged state of sync/maindata. qBittorrent sends a full update on the first
 * request (rid=0) and whenever it can no longer diff against the client's rid,
 * otherwise only changed fields (src/webui/api/synccontroller.cpp, maindataAction).
 */
export interface MaindataState {
  rid: number;
  torrents: Record<string, Torrent>;
  categories: Record<string, Category>;
  tags: string[];
  trackers: Record<string, string[]>;
  serverState: ServerState;
}

export const emptyMaindata: MaindataState = {
  rid: 0,
  torrents: {},
  categories: {},
  tags: [],
  trackers: {},
  serverState: {},
};

/**
 * Applies one maindata response to the previous state. Unchanged torrents keep their
 * object identity, so rows that did not change do not re-render.
 */
export function mergeMaindata(prev: MaindataState | undefined, res: MaindataResponse): MaindataState {
  const base = !prev || res.full_update ? emptyMaindata : prev;

  let torrents = base.torrents;
  if (res.torrents || res.torrents_removed?.length) {
    torrents = { ...base.torrents };
    for (const [hash, delta] of Object.entries(res.torrents ?? {})) {
      torrents[hash] = { ...torrents[hash], ...delta, hash } as Torrent;
    }
    for (const hash of res.torrents_removed ?? []) delete torrents[hash];
  }

  let categories = base.categories;
  if (res.categories || res.categories_removed?.length) {
    categories = { ...base.categories };
    for (const [name, delta] of Object.entries(res.categories ?? {})) {
      categories[name] = { savePath: "", ...categories[name], ...delta, name } as Category;
    }
    for (const name of res.categories_removed ?? []) delete categories[name];
  }

  let tags = base.tags;
  if (res.tags || res.tags_removed?.length) {
    const set = new Set(base.tags);
    for (const tag of res.tags ?? []) set.add(tag);
    for (const tag of res.tags_removed ?? []) set.delete(tag);
    tags = [...set].sort((a, b) => a.localeCompare(b));
  }

  let trackers = base.trackers;
  if (res.trackers || res.trackers_removed?.length) {
    trackers = { ...base.trackers, ...res.trackers };
    for (const url of res.trackers_removed ?? []) delete trackers[url];
  }

  const serverState = res.server_state ? { ...base.serverState, ...res.server_state } : base.serverState;

  return { rid: res.rid, torrents, categories, tags, trackers, serverState };
}

export interface Peer {
  key: string;
  client: string;
  connection: string;
  country: string;
  country_code: string;
  dl_speed: number;
  up_speed: number;
  downloaded: number;
  uploaded: number;
  flags: string;
  flags_desc: string;
  ip: string;
  port: number;
  progress: number;
  relevance: number;
}

export interface PeersState {
  rid: number;
  showFlags: boolean;
  peers: Record<string, Peer>;
}

/** Same idea for sync/torrentPeers, whose peers are keyed by "ip:port". */
export function mergePeers(
  prev: PeersState | undefined,
  res: {
    rid: number;
    full_update?: boolean;
    show_flags?: boolean;
    peers?: Record<string, PeerDelta>;
    peers_removed?: string[];
  },
): PeersState {
  const base = !prev || res.full_update ? { rid: 0, showFlags: false, peers: {} } : prev;
  const peers = { ...base.peers };
  for (const [key, delta] of Object.entries(res.peers ?? {})) {
    peers[key] = { ...peers[key], ...delta, key } as Peer;
  }
  for (const key of res.peers_removed ?? []) delete peers[key];
  return { rid: res.rid, showFlags: res.show_flags ?? base.showFlags, peers };
}
