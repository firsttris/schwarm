import { matchRule } from "../src/lib/rss-match";
import { fixtureCategories, fixtureTags, type MockTorrent, makeFixtures, units } from "./fixtures";
import { makePreferences } from "./preferences-fixture";
import { type MockFeed, type MockFolder, makeRssRules, makeRssTree } from "./rss-fixtures";
import { type MockPlugin, type MockResult, makePlugins, searchCorpus } from "./search-fixtures";

/**
 * A small stand-in for qBittorrent's WebUI API v2, for development and the E2E tests.
 * It follows the behaviour of qBittorrent 5.3.0 where the UI depends on it:
 * - without a session every API call but auth/login answers 403 (webapplication.cpp,
 *   processAPIRequest); a wrong login answers 401 (authcontroller.cpp);
 * - sync/maindata sends a full update for rid=0 or an unknown rid, otherwise only the
 *   fields that changed since that rid, plus *_removed lists (synccontroller.cpp);
 * - POST parameters as form data, lists joined with "|" (torrentscontroller.cpp).
 */

export interface MockOptions {
  /** Require a login (admin / adminadmin). */
  auth?: boolean;
  /** Stop the simulated transfer, for repeatable tests and screenshots. */
  frozen?: boolean;
  /** "Now" in unix seconds, for repeatable dates. */
  now?: number;
  /** Behave like a qBittorrent without Python: search/start answers 409. */
  noPython?: boolean;
}

type Json = Record<string, unknown>;

const MAX_ETA = 8640000;
const SID = "mock-session";

export function createMockApi(initial: MockOptions = {}) {
  let options: Required<MockOptions>;
  let torrents: MockTorrent[];
  let categories: Record<string, { name: string; savePath: string }>;
  let tags: string[];
  let snapshots: Map<number, Json>;
  let lastRid: number;
  let peerSnapshots: Map<string, Json>;
  let sessions: Set<string>;
  let addCounter: number;
  let altSpeed: boolean;
  let sessionPaused: boolean;
  let prefs: ReturnType<typeof makePreferences>;
  /** Fields qBittorrent does not let the API change (appcontroller.cpp, setPreferencesAction). */
  const readOnlyPrefs = new Set(["add_trackers_url_list", "current_interface_name", "web_ui_api_key"]);
  let metadataRequests: Map<string, number>;
  let plugins: MockPlugin[];
  let searches: Map<number, { pattern: string; results: MockResult[]; polls: number; stopped: boolean }>;
  let searchCounter: number;
  let rssTree: MockFolder;
  let rssRules: Record<string, Record<string, unknown>>;

  function reset(next: MockOptions = {}) {
    options = {
      auth: next.auth ?? initial.auth ?? false,
      frozen: next.frozen ?? initial.frozen ?? false,
      now: next.now ?? initial.now ?? Math.floor(Date.now() / 1000),
      noPython: next.noPython ?? initial.noPython ?? false,
    };
    torrents = makeFixtures();
    categories = structuredClone(fixtureCategories);
    tags = [...fixtureTags];
    snapshots = new Map();
    lastRid = 0;
    peerSnapshots = new Map();
    sessions = new Set();
    addCounter = 0;
    altSpeed = false;
    sessionPaused = false;
    prefs = makePreferences();
    metadataRequests = new Map();
    plugins = makePlugins();
    searches = new Map();
    searchCounter = 0;
    rssTree = makeRssTree();
    rssRules = makeRssRules(options.now);
  }
  reset();

  const now = () => (options.frozen ? options.now : Math.floor(Date.now() / 1000));

  function find(hash: string | null): MockTorrent | undefined {
    return torrents.find((t) => t.hash === hash);
  }

  function selected(hashes: string | null): MockTorrent[] {
    if (!hashes) return [];
    if (hashes === "all") return torrents;
    const set = new Set(hashes.split("|"));
    return torrents.filter((t) => set.has(t.hash));
  }

  function queue(): MockTorrent[] {
    return torrents.filter((t) => t.progress < 1);
  }

  /** Moves the given torrents in the queue, keeping finished torrents where they are. */
  function moveInQueue(list: MockTorrent[], where: string) {
    const order = queue();
    const set = new Set(list);
    let next = [...order];
    if (where === "top") next = [...order.filter((t) => set.has(t)), ...order.filter((t) => !set.has(t))];
    else if (where === "bottom") next = [...order.filter((t) => !set.has(t)), ...order.filter((t) => set.has(t))];
    else if (where === "up") {
      for (let i = 1; i < next.length; i++) {
        if (set.has(next[i]!) && !set.has(next[i - 1]!)) [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
      }
    } else {
      for (let i = next.length - 2; i >= 0; i--) {
        if (set.has(next[i]!) && !set.has(next[i + 1]!)) [next[i + 1], next[i]] = [next[i]!, next[i + 1]!];
      }
    }
    let k = 0;
    torrents = torrents.map((t) => (t.progress < 1 ? next[k++]! : t));
  }

  function wanted(t: MockTorrent): number {
    return t.files.reduce((sum, f) => sum + (f.priority > 0 ? f.size : 0), 0);
  }

  function serialize(t: MockTorrent): Json {
    const size = wanted(t) || t.size;
    const completed = Math.round(size * t.progress);
    const left = size - completed;
    const downloaded = completed;
    const isStopped = t.state.startsWith("stopped");
    const isDl = t.state.includes("DL") || t.state === "downloading";
    const eta = isDl && t.dlspeed > 0 ? Math.round(left / t.dlspeed) : MAX_ETA;
    const addedOn = options.now - t.added_ago;
    const firstTracker = t.trackers.find((tr) => tr.status === 2);
    const pieces = Math.ceil(t.size / t.piece_size);
    return {
      infohash_v1: t.hash,
      infohash_v2: "",
      name: t.name,
      has_metadata: true,
      created_by: t.created_by,
      creation_date: addedOn - 86400,
      private: t.private ?? false,
      total_size: t.size,
      pieces_num: pieces,
      piece_size: t.piece_size,
      magnet_uri: `magnet:?xt=urn:btih:${t.hash}&dn=${encodeURIComponent(t.name)}`,
      size,
      progress: t.progress,
      total_wasted: 0,
      pieces_have: Math.floor(pieces * t.progress),
      dlspeed: isStopped ? 0 : t.dlspeed,
      upspeed: isStopped ? 0 : t.upspeed,
      // qBittorrent queues the unfinished torrents; finished ones have no position (0)
      priority: queue().indexOf(t) + 1,
      num_seeds: t.num_seeds,
      num_complete: t.num_complete,
      num_leechs: t.num_leechs,
      num_incomplete: t.num_incomplete,
      state: t.state,
      eta,
      seq_dl: t.seq_dl ?? false,
      f_l_piece_prio: t.f_l_piece_prio ?? false,
      category: t.category,
      tags: t.tags.join(", "),
      super_seeding: t.super_seeding ?? false,
      force_start: t.force_start ?? false,
      save_path: t.save_path,
      download_path: "",
      content_path: t.files.length === 1 ? `${t.save_path}/${t.files[0]?.name}` : `${t.save_path}/${t.name}`,
      root_path: t.files.length === 1 ? "" : `${t.save_path}/${t.name}`,
      added_on: addedOn,
      completion_on: t.progress >= 1 ? addedOn + 3600 : -1,
      tracker: firstTracker?.url ?? "",
      trackers_count: t.trackers.length,
      dl_limit: t.dl_limit ?? 0,
      up_limit: t.up_limit ?? 0,
      downloaded,
      uploaded: Math.round(downloaded * t.ratio),
      downloaded_session: downloaded,
      uploaded_session: Math.round(downloaded * t.ratio),
      amount_left: left,
      completed,
      connections_count: t.peers.length || t.num_seeds + t.num_leechs,
      connections_limit: 100,
      max_ratio: -1,
      max_seeding_time: -1,
      max_inactive_seeding_time: -1,
      ratio: t.ratio,
      ratio_limit: t.share?.ratioLimit ?? -2,
      popularity: 0.1,
      seeding_time_limit: t.share?.seedingTimeLimit ?? -2,
      inactive_seeding_time_limit: t.share?.inactiveSeedingTimeLimit ?? -2,
      share_limits_mode: t.share?.shareLimitsMode ?? "Default",
      share_limit_action: t.share?.shareLimitAction ?? "Default",
      seen_complete: options.now - 60,
      auto_tmm: t.auto_tmm ?? false,
      time_active: t.time_active,
      seeding_time: t.progress >= 1 ? Math.max(0, t.time_active - 3600) : 0,
      last_activity: options.now - (t.dlspeed + t.upspeed > 0 ? 0 : 1800),
      availability: isDl ? Math.round((t.num_seeds / 2.21) * 10) / 10 : -1,
      reannounce: firstTracker?.next_in ?? 0,
      comment: t.comment,
      has_tracker_warning: false,
      has_tracker_error: t.trackers.some((tr) => tr.status === 4),
      has_other_announce_error: false,
    };
  }

  function fullState(): Json {
    const torrentMap: Json = {};
    const trackerMap: Record<string, string[]> = {};
    for (const t of torrents) {
      torrentMap[t.hash] = serialize(t);
      for (const tr of t.trackers) {
        trackerMap[tr.url] = [...(trackerMap[tr.url] ?? []), t.hash];
      }
    }
    const dl = torrents.reduce((s, t) => s + (t.state.startsWith("stopped") ? 0 : t.dlspeed), 0);
    const up = torrents.reduce((s, t) => s + (t.state.startsWith("stopped") ? 0 : t.upspeed), 0);
    return {
      torrents: torrentMap,
      categories: structuredClone(categories),
      tags: [...tags],
      trackers: trackerMap,
      server_state: {
        connection_status: "connected",
        dht_nodes: 381,
        dl_info_data: 48.2 * units.GB,
        dl_info_speed: dl,
        dl_rate_limit: Number(altSpeed ? prefs.alt_dl_limit : prefs.dl_limit),
        up_info_data: 12.7 * units.GB,
        up_info_speed: up,
        up_rate_limit: Number(altSpeed ? prefs.alt_up_limit : prefs.up_limit),
        last_external_address_v4: "193.29.106.24",
        last_external_address_v6: "",
        free_space_on_disk: 412 * units.GB,
        queueing: true,
        refresh_interval: 1500,
        use_alt_speed_limits: altSpeed,
        session_state: sessionPaused,
        alltime_dl: 2.81e12,
        alltime_ul: 3.96e12,
        global_ratio: "1.41",
        total_peer_connections: 87,
      },
    };
  }

  function diffMap(prev: Json, next: Json): Json {
    const out: Json = {};
    for (const [key, value] of Object.entries(next)) {
      if (JSON.stringify(prev[key]) !== JSON.stringify(value)) out[key] = value;
    }
    return out;
  }

  function maindata(rid: number): Json {
    const state = fullState();
    const prev = snapshots.get(rid);
    const id = (lastRid % 1000000) + 1;
    lastRid = id;
    snapshots.set(id, state);
    // keep the last few snapshots, like qBittorrent keeps the last accepted one
    for (const key of [...snapshots.keys()]) if (key < id - 5) snapshots.delete(key);
    if (!rid || !prev) return { rid: id, full_update: true, ...state };

    const out: Json = { rid: id };
    const prevTorrents = prev.torrents as Record<string, Json>;
    const nextTorrents = state.torrents as Record<string, Json>;
    const changed: Json = {};
    for (const [hash, t] of Object.entries(nextTorrents)) {
      const before = prevTorrents[hash];
      const d = before ? diffMap(before, t) : t;
      if (Object.keys(d).length) changed[hash] = d;
    }
    if (Object.keys(changed).length) out.torrents = changed;
    const removed = Object.keys(prevTorrents).filter((h) => !nextTorrents[h]);
    if (removed.length) out.torrents_removed = removed;

    const cats = diffMap(prev.categories as Json, state.categories as Json);
    if (Object.keys(cats).length) out.categories = cats;
    const catsRemoved = Object.keys(prev.categories as Json).filter((c) => !(c in (state.categories as Json)));
    if (catsRemoved.length) out.categories_removed = catsRemoved;

    const prevTags = prev.tags as string[];
    const nextTags = state.tags as string[];
    const addedTags = nextTags.filter((t) => !prevTags.includes(t));
    const removedTags = prevTags.filter((t) => !nextTags.includes(t));
    if (addedTags.length) out.tags = addedTags;
    if (removedTags.length) out.tags_removed = removedTags;

    const trackers = diffMap(prev.trackers as Json, state.trackers as Json);
    if (Object.keys(trackers).length) out.trackers = trackers;
    const trRemoved = Object.keys(prev.trackers as Json).filter((u) => !(u in (state.trackers as Json)));
    if (trRemoved.length) out.trackers_removed = trRemoved;

    const server = diffMap(prev.server_state as Json, state.server_state as Json);
    if (Object.keys(server).length) out.server_state = server;
    return out;
  }

  /** One second of simulated transfer. */
  function tick() {
    if (options.frozen) return;
    for (const t of torrents) {
      if (t.state.startsWith("stopped") || t.state === "error") continue;
      const jitter = 0.85 + Math.random() * 0.3;
      if (t.dlspeed > 0) {
        t.dlspeed = Math.max(64 * units.KB, t.dlspeed * jitter);
        const size = wanted(t) || t.size;
        t.progress = Math.min(1, t.progress + t.dlspeed / size);
        for (const f of t.files) if (f.priority > 0) f.progress = Math.min(1, f.progress + t.dlspeed / size);
        if (t.progress >= 1) {
          t.state = "uploading";
          t.dlspeed = 0;
        }
      }
      if (t.upspeed > 0) t.upspeed = Math.max(8 * units.KB, t.upspeed * jitter);
      t.time_active += 1;
    }
  }

  function trackersOf(t: MockTorrent): Json[] {
    const n = now();
    const sticky = ["DHT", "PeX", "LSD"].map((name, i) => ({
      url: `** [${name}] **`,
      tier: -1,
      msg: t.private ? "This torrent is private" : "",
      status: t.private ? 0 : 2,
      num_peers: 0,
      num_downloaded: 0,
      num_seeds: [38, 12, 0][i],
      num_leeches: [9, 3, 0][i],
    }));
    const real = t.trackers.map((tr) => ({
      url: tr.url,
      tier: tr.tier,
      updating: false,
      status: tr.status,
      msg: tr.msg,
      num_peers: tr.num_peers,
      num_seeds: tr.num_seeds,
      num_leeches: tr.num_leeches,
      num_downloaded: tr.num_downloaded,
      next_announce: n + tr.next_in,
      min_announce: n + 60,
      endpoints: [],
    }));
    return [...sticky, ...real];
  }

  function peersOf(t: MockTorrent): Record<string, Json> {
    const out: Record<string, Json> = {};
    for (const p of t.peers) {
      const key = `${p.ip}:${p.port}`;
      out[key] = {
        client: p.client,
        peer_id_client: p.client.split(" ")[0],
        connection: p.connection,
        country: p.country,
        country_code: p.country_code,
        dl_speed: p.dl_speed,
        up_speed: p.up_speed,
        downloaded: Math.round(p.dl_speed * 300),
        uploaded: Math.round(p.up_speed * 300),
        files: "",
        flags: p.flags,
        flags_desc: "",
        ip: p.ip,
        port: p.port,
        progress: p.progress,
        relevance: p.progress,
        host_name: "",
      };
    }
    return out;
  }

  function pieceStates(t: MockTorrent): number[] {
    const pieces = Math.min(Math.ceil(t.size / t.piece_size), 4000);
    const have = Math.floor(pieces * t.progress);
    const states: number[] = [];
    // Deterministic pattern: mostly in order, a few gaps and pieces in flight
    for (let i = 0; i < pieces; i++) {
      const wobble = ((i * 7919) % 97) / 97;
      if (i < have * 0.9 || (i < have * 1.1 && wobble < 0.6)) states.push(2);
      else if (i < have * 1.12 && wobble < 0.8) states.push(1);
      else states.push(0);
    }
    return states;
  }

  let rssUid = 0;

  /** Paths in rss/* are names joined with "\\" (Item::PathSeparator in rss_item.cpp). */
  function rssFind(path: string): MockFeed | MockFolder | undefined {
    if (!path) return rssTree;
    let node: MockFeed | MockFolder | undefined = rssTree;
    for (const part of path.split("\\")) node = node?.kind === "folder" ? node.children[part] : undefined;
    return node;
  }

  function rssParent(path: string): { parent?: MockFolder; name: string } {
    const parts = path.split("\\");
    const name = parts.pop() ?? "";
    const parent = rssFind(parts.join("\\"));
    return { parent: parent?.kind === "folder" ? parent : undefined, name };
  }

  function rssFeeds(node: MockFeed | MockFolder): MockFeed[] {
    return node.kind === "feed" ? [node] : Object.values(node.children).flatMap(rssFeeds);
  }

  function rssJson(folder: MockFolder, withData: boolean): Json {
    const out: Json = {};
    for (const [name, item] of Object.entries(folder.children)) {
      if (item.kind === "folder") {
        out[name] = rssJson(item, withData);
        continue;
      }
      out[name] = {
        uid: item.uid,
        url: item.url,
        ...(withData
          ? {
              title: item.title,
              lastBuildDate: new Date((options.now - 600) * 1000).toUTCString(),
              isLoading: false,
              hasError: item.hasError ?? false,
              articles: item.articles.map((a) => ({
                id: a.id,
                date: new Date((options.now - a.ageMinutes * 60) * 1000).toISOString(),
                title: a.title,
                author: "",
                description: a.description,
                torrentURL: a.torrentURL,
                link: a.link,
                isRead: a.isRead,
              })),
            }
          : {}),
      };
    }
    return out;
  }

  /** A made-up multi-file torrent for the metadata preview of the add dialog. */
  function metadataInfo(seed: string, name: string): Json {
    const files = [
      { path: `${name}/${name}.mkv`, length: 4.2 * units.GB },
      { path: `${name}/Untertitel/${name}.de.srt`, length: 61 * units.KB },
      { path: `${name}/Untertitel/${name}.en.srt`, length: 58 * units.KB },
      { path: `${name}/Extras/Making-of.mkv`, length: 640 * units.MB },
    ];
    return {
      infohash_v1: seed,
      infohash_v2: "",
      hash: seed,
      info: {
        name,
        length: files.reduce((s, f) => s + f.length, 0),
        piece_length: 4 * 1024 * 1024,
        pieces_num: 1200,
        private: false,
        files,
      },
      trackers: [{ url: "udp://tracker.opentrackr.org:1337/announce", tier: 0 }],
    };
  }

  function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
  }
  const text = (body: string, status = 200) =>
    new Response(body, { status, headers: { "content-type": "text/plain; charset=UTF-8" } });

  async function params(req: Request, url: URL): Promise<URLSearchParams & { files?: File[] }> {
    if (req.method !== "POST") return url.searchParams;
    const type = req.headers.get("content-type") ?? "";
    if (type.includes("multipart/form-data")) {
      const form = await req.formData();
      const out = new URLSearchParams() as URLSearchParams & { files?: File[] };
      out.files = [];
      for (const [key, value] of form.entries()) {
        if (typeof value === "string") out.set(key, value);
        else out.files.push(value);
      }
      return out;
    }
    return new URLSearchParams(await req.text());
  }

  function hasSession(req: Request): boolean {
    if (!options.auth) return true;
    const cookie = req.headers.get("cookie") ?? "";
    return cookie.split(/;\s*/).some((c) => c === `SID=${SID}` && sessions.has(SID));
  }

  function addTorrent(p: URLSearchParams & { files?: File[] }) {
    const names = [
      ...(p.get("urls") ?? "")
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean)
        .map((u) => {
          const dn = /[?&]dn=([^&]+)/.exec(u)?.[1];
          return dn ? decodeURIComponent(dn.replaceAll("+", " ")) : (u.split("/").pop() ?? u);
        }),
      ...(p.files ?? []).map((f) => f.name.replace(/\.torrent$/, "")),
    ];
    const category = p.get("category") ?? "";
    for (const name of names) {
      addCounter++;
      const stopped = p.get("stopped") === "true";
      torrents.push({
        hash: (addCounter.toString(16).padStart(8, "0") + "ab".repeat(16)).slice(0, 40),
        name: p.get("rename") || name,
        category,
        tags: (p.get("tags") ?? "").split(",").filter(Boolean),
        state: stopped ? "stoppedDL" : "metaDL",
        size: 0,
        progress: 0,
        dlspeed: 0,
        upspeed: 0,
        ratio: 0,
        num_seeds: 0,
        num_complete: 0,
        num_leechs: 0,
        num_incomplete: 0,
        added_ago: 0,
        time_active: 0,
        piece_size: 4 * 1024 * 1024,
        save_path: p.get("savepath") || categories[category]?.savePath || "/downloads",
        comment: "",
        created_by: "",
        seq_dl: p.get("sequentialDownload") === "true",
        f_l_piece_prio: p.get("firstLastPiecePrio") === "true",
        auto_tmm: p.get("autoTMM") === "true",
        files: (p.get("filePriorities") ?? "")
          .split(",")
          .filter(Boolean)
          .map((prio, i) => ({
            name: `${name}/file-${i + 1}`,
            size: 100 * units.MB,
            progress: 0,
            priority: Number(prio),
          })),
        trackers: [],
        webseeds: [],
        peers: [],
      });
    }
    return names.length;
  }

  async function handleApi(req: Request, url: URL, endpoint: string): Promise<Response> {
    if (endpoint === "auth/login") {
      const p = await params(req, url);
      if (p.get("username") === "admin" && p.get("password") === "adminadmin") {
        sessions.add(SID);
        return new Response("Ok.", {
          headers: { "set-cookie": `SID=${SID}; HttpOnly; SameSite=Strict; path=/`, "content-type": "text/plain" },
        });
      }
      return text("Unauthorized", 401);
    }
    if (!hasSession(req)) return text("Forbidden", 403);

    const p = await params(req, url);
    const list = () => selected(p.get("hashes"));
    const ok = () => text("");

    switch (endpoint) {
      case "auth/logout":
        sessions.clear();
        return ok();
      case "app/version":
        return text("v5.3.0");
      case "app/webapiVersion":
        return text("2.16.2");
      case "app/defaultSavePath":
        return text("/downloads");
      case "sync/maindata":
        return json(maindata(Number(p.get("rid") ?? 0)));
      case "sync/torrentPeers": {
        const t = find(p.get("hash"));
        if (!t) return text("Not Found", 404);
        const rid = Number(p.get("rid") ?? 0);
        const state = peersOf(t);
        const key = `${t.hash}:${rid}`;
        const prev = rid ? peerSnapshots.get(key) : undefined;
        const id = rid + 1;
        peerSnapshots.set(`${t.hash}:${id}`, state);
        if (!prev) return json({ rid: id, full_update: true, show_flags: true, peers: state });
        const changed: Json = {};
        for (const [k, v] of Object.entries(state)) {
          const d = prev[k] ? diffMap(prev[k] as Json, v) : v;
          if (Object.keys(d).length) changed[k] = d;
        }
        const removed = Object.keys(prev).filter((k) => !state[k]);
        return json({ rid: id, peers: changed, ...(removed.length ? { peers_removed: removed } : {}) });
      }
      case "torrents/properties": {
        const t = find(p.get("hash"));
        if (!t) return text("Not Found", 404);
        const s = serialize(t);
        return json({
          infohash_v1: t.hash,
          infohash_v2: "",
          name: t.name,
          hash: t.hash,
          time_elapsed: t.time_active,
          seeding_time: s.seeding_time,
          eta: s.eta,
          nb_connections: s.connections_count,
          nb_connections_limit: 100,
          total_downloaded: s.downloaded,
          total_downloaded_session: s.downloaded_session,
          total_uploaded: s.uploaded,
          total_uploaded_session: s.uploaded_session,
          dl_speed: s.dlspeed,
          dl_speed_avg: Math.round(Number(s.downloaded) / Math.max(1, t.time_active)),
          up_speed: s.upspeed,
          up_speed_avg: Math.round(Number(s.uploaded) / Math.max(1, t.time_active)),
          dl_limit: -1,
          up_limit: -1,
          total_wasted: 0,
          seeds: t.num_seeds,
          seeds_total: t.num_complete,
          peers: t.num_leechs,
          peers_total: t.num_incomplete,
          share_ratio: t.ratio,
          popularity: 0.1,
          availability: s.availability,
          reannounce: s.reannounce,
          total_size: t.size,
          pieces_num: s.pieces_num,
          piece_size: t.piece_size,
          pieces_have: s.pieces_have,
          created_by: t.created_by,
          is_private: t.private ?? false,
          private: t.private ?? false,
          addition_date: s.added_on,
          last_seen: s.seen_complete,
          completion_date: s.completion_on,
          creation_date: s.creation_date,
          save_path: t.save_path,
          download_path: "",
          comment: t.comment,
          has_metadata: true,
          progress: t.progress,
        });
      }
      case "torrents/files": {
        const t = find(p.get("hash"));
        if (!t) return text("Not Found", 404);
        return json(
          t.files.map((f, index) => ({
            index,
            name: f.name,
            size: f.size,
            progress: f.progress,
            priority: f.priority,
            is_seed: f.progress >= 1,
            piece_range: [0, Math.ceil(f.size / t.piece_size)],
            availability: f.progress >= 1 ? 1 : 0.8,
          })),
        );
      }
      case "torrents/trackers": {
        const t = find(p.get("hash"));
        return t ? json(trackersOf(t)) : text("Not Found", 404);
      }
      case "torrents/webseeds": {
        const t = find(p.get("hash"));
        return t ? json(t.webseeds.map((u) => ({ url: u }))) : text("Not Found", 404);
      }
      case "torrents/pieceStates": {
        const t = find(p.get("hash"));
        return t ? json(pieceStates(t)) : text("Not Found", 404);
      }
      case "torrents/export": {
        const t = find(p.get("hash"));
        if (!t) return text("Not Found", 404);
        return new Response(`d4:info d4:name${t.name.length}:${t.name}ee`, {
          headers: { "content-type": "application/x-bittorrent" },
        });
      }
      case "torrents/start":
        for (const t of list()) {
          if (t.state === "stoppedDL") t.state = t.dlspeed > 0 ? "downloading" : "stalledDL";
          else if (t.state === "stoppedUP") t.state = t.upspeed > 0 ? "uploading" : "stalledUP";
        }
        return ok();
      case "torrents/stop":
        for (const t of list()) {
          if (!t.state.startsWith("stopped")) t.state = t.progress >= 1 ? "stoppedUP" : "stoppedDL";
          t.force_start = false;
        }
        return ok();
      case "torrents/setForceStart":
        for (const t of list()) {
          t.force_start = p.get("value") === "true";
          if (t.force_start) t.state = t.progress >= 1 ? "forcedUP" : "forcedDL";
        }
        return ok();
      case "torrents/delete": {
        const remove = new Set(list().map((t) => t.hash));
        torrents = torrents.filter((t) => !remove.has(t.hash));
        return ok();
      }
      case "torrents/recheck":
        for (const t of list()) t.state = t.progress >= 1 ? "checkingUP" : "checkingDL";
        return ok();
      case "torrents/reannounce":
        return ok();
      case "torrents/setCategory": {
        const category = p.get("category") ?? "";
        if (category && !categories[category]) return text("Conflict", 409);
        for (const t of list()) t.category = category;
        return ok();
      }
      case "torrents/addTags": {
        const add = (p.get("tags") ?? "").split(",").filter(Boolean);
        for (const tag of add) if (!tags.includes(tag)) tags.push(tag);
        for (const t of list()) for (const tag of add) if (!t.tags.includes(tag)) t.tags.push(tag);
        return ok();
      }
      case "torrents/removeTags": {
        const rm = (p.get("tags") ?? "").split(",").filter(Boolean);
        for (const t of list()) t.tags = t.tags.filter((tag) => !rm.includes(tag));
        return ok();
      }
      case "torrents/setAutoManagement":
        for (const t of list()) t.auto_tmm = p.get("enable") === "true";
        return ok();
      case "torrents/toggleSequentialDownload":
        for (const t of list()) t.seq_dl = !t.seq_dl;
        return ok();
      case "torrents/toggleFirstLastPiecePrio":
        for (const t of list()) t.f_l_piece_prio = !t.f_l_piece_prio;
        return ok();
      case "torrents/setSuperSeeding":
        for (const t of list()) t.super_seeding = p.get("value") === "true";
        return ok();
      case "torrents/setLocation":
        for (const t of list()) t.save_path = p.get("location") ?? t.save_path;
        return ok();
      case "torrents/rename": {
        const t = find(p.get("hash"));
        if (t) t.name = p.get("name") ?? t.name;
        return ok();
      }
      case "torrents/topPrio":
      case "torrents/bottomPrio":
      case "torrents/increasePrio":
      case "torrents/decreasePrio": {
        const where = { topPrio: "top", bottomPrio: "bottom", increasePrio: "up", decreasePrio: "down" }[
          endpoint.slice("torrents/".length) as "topPrio"
        ];
        moveInQueue(list(), where);
        return ok();
      }
      case "torrents/setDownloadLimit":
        for (const t of list()) t.dl_limit = Number(p.get("limit"));
        return ok();
      case "torrents/setUploadLimit":
        for (const t of list()) t.up_limit = Number(p.get("limit"));
        return ok();
      case "torrents/setShareLimits":
        for (const t of list()) {
          t.share = {
            ratioLimit: Number(p.get("ratioLimit")),
            seedingTimeLimit: Number(p.get("seedingTimeLimit")),
            inactiveSeedingTimeLimit: Number(p.get("inactiveSeedingTimeLimit")),
            shareLimitAction: p.get("shareLimitAction") ?? "Default",
            shareLimitsMode: p.get("shareLimitsMode") ?? "Default",
          };
        }
        return ok();
      case "torrents/createCategory": {
        const name = p.get("category") ?? "";
        if (!name || categories[name]) return text("Conflict", 409);
        categories[name] = { name, savePath: p.get("savePath") ?? "" };
        return ok();
      }
      case "torrents/editCategory": {
        const name = p.get("category") ?? "";
        const category = categories[name];
        if (!category) return text("Conflict", 409);
        category.savePath = p.get("savePath") ?? category.savePath;
        return ok();
      }
      case "torrents/removeCategories":
        for (const name of (p.get("categories") ?? "").split("\n")) {
          delete categories[name];
          for (const t of torrents) if (t.category === name) t.category = "";
        }
        return ok();
      case "torrents/createTags":
        for (const tag of (p.get("tags") ?? "").split(",").filter(Boolean)) if (!tags.includes(tag)) tags.push(tag);
        return ok();
      case "torrents/deleteTags": {
        const rm = (p.get("tags") ?? "").split(",");
        tags = tags.filter((t) => !rm.includes(t));
        for (const t of torrents) t.tags = t.tags.filter((tag) => !rm.includes(tag));
        return ok();
      }
      case "torrents/renameFile":
      case "torrents/renameFolder": {
        const t = find(p.get("hash"));
        const oldPath = p.get("oldPath") ?? "";
        const newPath = p.get("newPath") ?? "";
        if (!t) return text("Not Found", 404);
        const folder = endpoint.endsWith("Folder");
        let hit = false;
        for (const f of t.files) {
          if (folder ? f.name.startsWith(`${oldPath}/`) : f.name === oldPath) {
            f.name = folder ? newPath + f.name.slice(oldPath.length) : newPath;
            hit = true;
          }
        }
        return hit ? ok() : text("Conflict", 409);
      }
      case "torrents/fetchMetadata": {
        // Like qBittorrent: 202 while fetching, then 200 with the file list
        const source = p.get("source") ?? "";
        const hash = /btih:([0-9a-f]{40})/i.exec(source)?.[1]?.toLowerCase() ?? source.toLowerCase();
        const calls = (metadataRequests.get(hash) ?? 0) + 1;
        metadataRequests.set(hash, calls);
        const name = /[?&]dn=([^&]+)/.exec(source)?.[1];
        if (calls < 2) return json({ infohash_v1: hash, infohash_v2: "", hash }, 202);
        return json(metadataInfo(hash, name ? decodeURIComponent(name.replaceAll("+", " ")) : hash));
      }
      case "torrents/parseMetadata":
        return json((p.files ?? []).map((f) => metadataInfo(f.name, f.name.replace(/\.torrent$/, ""))));
      case "search/plugins":
        return json(
          plugins.map((pl) => ({
            name: pl.name,
            fullName: pl.fullName,
            version: pl.version,
            url: pl.url,
            enabled: pl.enabled,
            supportedCategories: [
              { id: "all", name: "All categories" },
              ...pl.categories.map((c) => ({ id: c, name: c[0]!.toUpperCase() + c.slice(1) })),
            ],
          })),
        );
      case "search/start": {
        if (options.noPython) return text("Python must be installed to use the Search Engine.", 409);
        const wantedPlugins = (p.get("plugins") ?? "enabled").split("|");
        const engines =
          wantedPlugins[0] === "all"
            ? plugins.map((pl) => pl.name)
            : wantedPlugins[0] === "enabled"
              ? plugins.filter((pl) => pl.enabled).map((pl) => pl.name)
              : wantedPlugins;
        searchCounter++;
        searches.set(searchCounter, {
          pattern: p.get("pattern") ?? "",
          results: searchCorpus(p.get("pattern") ?? "", p.get("category") ?? "all", engines),
          polls: 0,
          stopped: false,
        });
        return json({ id: searchCounter });
      }
      case "search/stop":
      case "search/delete": {
        const job = searches.get(Number(p.get("id")));
        if (!job) return text("Not Found", 404);
        if (endpoint === "search/delete") searches.delete(Number(p.get("id")));
        else job.stopped = true;
        return ok();
      }
      case "search/results": {
        // Results arrive in steps of four, one step per request, like plugins that answer one by one
        const job = searches.get(Number(p.get("id")));
        if (!job) return text("Not Found", 404);
        if (!job.stopped) job.polls++;
        const available = job.stopped ? job.results.length : Math.min(job.results.length, job.polls * 4);
        if (available >= job.results.length) job.stopped = true;
        const offset = Number(p.get("offset") ?? 0);
        return json({
          status: job.stopped ? "Stopped" : "Running",
          total: available,
          results: job.results.slice(offset, available).map((r) => {
            const plugin = plugins.find((pl) => pl.name === r.engine);
            const hash = r.fileName
              .split("")
              .reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
              .toString(16)
              .padStart(8, "0");
            return {
              fileName: r.fileName,
              fileUrl: `magnet:?xt=urn:btih:${hash.repeat(5)}&dn=${encodeURIComponent(r.fileName)}`,
              fileSize: r.fileSize,
              nbSeeders: r.nbSeeders,
              nbLeechers: r.nbLeechers,
              engineName: plugin?.fullName ?? r.engine,
              siteUrl: plugin?.url ?? "",
              descrLink: `${plugin?.url ?? "https://example.org"}/details/${encodeURIComponent(r.fileName)}`,
              pubDate: options.now - r.age,
            };
          }),
        });
      }
      case "search/enablePlugin": {
        const names = (p.get("names") ?? "").split("|");
        for (const pl of plugins) if (names.includes(pl.name)) pl.enabled = p.get("enable") === "true";
        return ok();
      }
      case "search/uninstallPlugin": {
        const names = (p.get("names") ?? "").split("|");
        plugins = plugins.filter((pl) => !names.includes(pl.name));
        return ok();
      }
      case "search/installPlugin": {
        for (const source of (p.get("sources") ?? "").split("|").filter(Boolean)) {
          const name = (source.split("/").pop() ?? source)
            .replace(/\.py$/, "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
          if (name && !plugins.some((pl) => pl.name === name)) {
            plugins.push({
              name,
              fullName: name,
              version: "1.0",
              url: source,
              enabled: true,
              categories: ["software"],
            });
          }
        }
        return ok();
      }
      case "search/updatePlugins":
        return ok();
      case "rss/items":
        return json(rssJson(rssTree, p.get("withData") === "true"));
      case "rss/addFolder": {
        const { parent, name } = rssParent(p.get("path") ?? "");
        if (!parent || !name || parent.children[name]) return text("Conflict", 409);
        parent.children[name] = { kind: "folder", children: {} };
        return ok();
      }
      case "rss/addFeed": {
        const url = p.get("url") ?? "";
        const { parent, name } = rssParent(p.get("path") || url);
        if (!parent || !name || parent.children[name]) return text("Conflict", 409);
        rssUid++;
        parent.children[name] = {
          kind: "feed",
          uid: `{22222222-0000-0000-0000-${String(rssUid).padStart(12, "0")}}`,
          url,
          title: name,
          articles: [],
        };
        return ok();
      }
      case "rss/setFeedURL": {
        const item = rssFind(p.get("path") ?? "");
        if (item?.kind !== "feed") return text("Conflict", 409);
        item.url = p.get("url") ?? item.url;
        return ok();
      }
      case "rss/removeItem": {
        const { parent, name } = rssParent(p.get("path") ?? "");
        if (!parent || !name || !parent.children[name]) return text("Conflict", 409);
        delete parent.children[name];
        return ok();
      }
      case "rss/moveItem": {
        const from = rssParent(p.get("itemPath") ?? "");
        const to = rssParent(p.get("destPath") ?? "");
        const item = from.parent && from.name ? from.parent.children[from.name] : undefined;
        if (!item || !to.parent || !to.name || to.parent.children[to.name]) return text("Conflict", 409);
        delete from.parent!.children[from.name];
        to.parent.children[to.name] = item;
        if (item.kind === "feed") item.title = to.name;
        return ok();
      }
      case "rss/refreshItem":
        return ok();
      case "rss/markAsRead": {
        const item = rssFind(p.get("itemPath") ?? "");
        if (!item) return text("Conflict", 409);
        const id = p.get("articleId");
        for (const feed of rssFeeds(item)) {
          for (const a of feed.articles) if (!id || a.id === id) a.isRead = true;
        }
        return ok();
      }
      case "rss/rules":
        return json(rssRules);
      case "rss/setRule": {
        const name = p.get("ruleName") ?? "";
        if (!name) return text("Bad Request", 400);
        rssRules[name] = JSON.parse(p.get("ruleDef") ?? "{}");
        return ok();
      }
      case "rss/renameRule": {
        const rule = rssRules[p.get("ruleName") ?? ""];
        if (!rule) return text("Conflict", 409);
        delete rssRules[p.get("ruleName") ?? ""];
        rssRules[p.get("newRuleName") ?? ""] = rule;
        return ok();
      }
      case "rss/removeRule":
        delete rssRules[p.get("ruleName") ?? ""];
        return ok();
      case "rss/matchingArticles": {
        const rule = rssRules[p.get("ruleName") ?? ""];
        if (!rule) return text("Not Found", 404);
        const out: Record<string, string[]> = {};
        for (const feed of rssFeeds(rssTree)) {
          if (!(rule.affectedFeeds as string[] | undefined)?.includes(feed.url)) continue;
          const titles = feed.articles
            .filter(
              (a) =>
                matchRule(a.title, {
                  mustContain: String(rule.mustContain ?? ""),
                  mustNotContain: String(rule.mustNotContain ?? ""),
                  useRegex: rule.useRegex === true,
                  episodeFilter: String(rule.episodeFilter ?? ""),
                }).ok,
            )
            .map((a) => a.title);
          if (titles.length) out[feed.title] = titles;
        }
        return json(out);
      }
      case "transfer/toggleSpeedLimitsMode":
        altSpeed = !altSpeed;
        return ok();
      case "transfer/pauseSession":
        sessionPaused = true;
        return ok();
      case "transfer/resumeSession":
        sessionPaused = false;
        return ok();
      case "app/preferences":
        return json(prefs);
      case "app/setPreferences": {
        const changes = JSON.parse(p.get("json") ?? "{}") as Record<string, string | number | boolean>;
        for (const [key, value] of Object.entries(changes)) {
          if (key === "web_ui_password" || readOnlyPrefs.has(key)) continue;
          if (key in prefs) prefs[key] = value;
          if (key === "current_network_interface") prefs.current_interface_name = String(value);
        }
        return ok();
      }
      case "app/networkInterfaceList":
        return json([
          { name: "tun0", value: "tun0" },
          { name: "eth0", value: "eth0" },
          { name: "lo", value: "lo" },
        ]);
      case "app/networkInterfaceAddressList": {
        const iface = p.get("iface") ?? "";
        const list: Record<string, string[]> = {
          tun0: ["10.2.0.2"],
          eth0: ["192.168.1.20", "fe80::1"],
          lo: ["127.0.0.1", "::1"],
          "": ["10.2.0.2", "192.168.1.20", "127.0.0.1"],
        };
        return json(list[iface] ?? []);
      }
      case "torrents/filePrio": {
        const t = find(p.get("hash"));
        if (!t) return text("Not Found", 404);
        const priority = Number(p.get("priority"));
        for (const id of (p.get("id") ?? "").split("|")) {
          const f = t.files[Number(id)];
          if (f) f.priority = priority;
        }
        return ok();
      }
      case "torrents/addTrackers": {
        const t = find(p.get("hash"));
        if (!t) return text("Not Found", 404);
        for (const u of (p.get("urls") ?? "").split("\n").filter(Boolean)) {
          t.trackers.push({
            url: u.trim(),
            tier: t.trackers.length,
            status: 1,
            msg: "",
            num_seeds: -1,
            num_peers: -1,
            num_leeches: -1,
            num_downloaded: -1,
            next_in: 0,
          });
        }
        return ok();
      }
      case "torrents/editTracker": {
        const t = find(p.get("hash"));
        const tr = t?.trackers.find((x) => x.url === p.get("url"));
        if (!tr) return text("Conflict", 409);
        tr.url = p.get("newUrl") ?? tr.url;
        return ok();
      }
      case "torrents/removeTrackers": {
        const t = find(p.get("hash"));
        const rm = (p.get("urls") ?? "").split("|");
        if (t) t.trackers = t.trackers.filter((x) => !rm.includes(x.url));
        return ok();
      }
      case "torrents/addWebSeeds": {
        const t = find(p.get("hash"));
        if (t) t.webseeds.push(...(p.get("urls") ?? "").split("|").filter(Boolean));
        return ok();
      }
      case "torrents/editWebSeed": {
        const t = find(p.get("hash"));
        if (t) t.webseeds = t.webseeds.map((u) => (u === p.get("origUrl") ? (p.get("newUrl") ?? u) : u));
        return ok();
      }
      case "torrents/removeWebSeeds": {
        const t = find(p.get("hash"));
        const rm = (p.get("urls") ?? "").split("|");
        if (t) t.webseeds = t.webseeds.filter((u) => !rm.includes(u));
        return ok();
      }
      case "torrents/addPeers":
        return ok();
      case "transfer/banPeers": {
        const banned = new Set((p.get("peers") ?? "").split("|"));
        for (const t of torrents) t.peers = t.peers.filter((x) => !banned.has(`${x.ip}:${x.port}`));
        return ok();
      }
      case "torrents/add":
        return addTorrent(p) ? text("Ok.") : text("Fails.", 415);
      default:
        return text("Not Found", 404);
    }
  }

  async function handle(req: Request): Promise<Response | undefined> {
    const url = new URL(req.url);
    // Test hook, not part of qBittorrent: POST /__mock/reset {"auth":true,"frozen":true}
    if (url.pathname === "/__mock/reset") {
      const body = req.method === "POST" ? ((await req.json().catch(() => ({}))) as MockOptions) : {};
      reset(body);
      return json({ ok: true });
    }
    if (url.pathname.startsWith("/api/v2/")) return handleApi(req, url, url.pathname.slice("/api/v2/".length));
    return undefined;
  }

  return { handle, tick, reset, maindata, state: () => ({ torrents, categories, tags }) };
}
