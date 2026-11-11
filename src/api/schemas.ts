import { z } from "zod";

/*
 * Zod schemas for the qBittorrent WebUI API v2 (qBittorrent 5.3.0, WebAPI 2.16.2).
 * Field names come from the sources:
 *   torrents:      src/webui/api/serialize/serialize_torrent.{h,cpp}
 *   maindata:      src/webui/api/synccontroller.cpp (maindataAction, getTransferInfo)
 *   properties,
 *   files,
 *   trackers:      src/webui/api/torrentscontroller.cpp
 *   peers:         src/webui/api/synccontroller.cpp (torrentPeersAction)
 * Schemas use .loose() so a newer qBittorrent with extra fields keeps working.
 */

/** Torrent states, from torrentStateToString() in serialize_torrent.cpp. */
export const torrentStates = [
  "error",
  "missingFiles",
  "uploading",
  "stoppedUP",
  "queuedUP",
  "stalledUP",
  "checkingUP",
  "forcedUP",
  "downloading",
  "metaDL",
  "forcedMetaDL",
  "stoppedDL",
  "queuedDL",
  "stalledDL",
  "checkingDL",
  "forcedDL",
  "checkingResumeData",
  "moving",
  "unknown",
] as const;
export type TorrentState = (typeof torrentStates)[number];

const num = z.number();
const str = z.string();

export const torrentSchema = z
  .object({
    hash: str,
    infohash_v1: str,
    infohash_v2: str,
    name: str,
    has_metadata: z.boolean(),
    created_by: str,
    creation_date: num,
    private: z.boolean().nullable(),
    total_size: num,
    pieces_num: num,
    piece_size: num,
    magnet_uri: str,
    size: num,
    progress: num,
    total_wasted: num,
    pieces_have: num,
    dlspeed: num,
    upspeed: num,
    priority: num,
    num_seeds: num,
    num_complete: num,
    num_leechs: num,
    num_incomplete: num,
    // A newer qBittorrent may add states; they are shown as "unknown".
    state: z.string(),
    eta: num,
    seq_dl: z.boolean(),
    f_l_piece_prio: z.boolean(),
    category: str,
    tags: str,
    super_seeding: z.boolean(),
    force_start: z.boolean(),
    save_path: str,
    download_path: str,
    content_path: str,
    root_path: str,
    added_on: num,
    completion_on: num,
    tracker: str,
    trackers_count: num,
    dl_limit: num,
    up_limit: num,
    downloaded: num,
    uploaded: num,
    downloaded_session: num,
    uploaded_session: num,
    amount_left: num,
    completed: num,
    connections_count: num,
    connections_limit: num,
    max_ratio: num,
    max_seeding_time: num,
    max_inactive_seeding_time: num,
    ratio: num,
    ratio_limit: num,
    popularity: num,
    seeding_time_limit: num,
    inactive_seeding_time_limit: num,
    share_limits_mode: str,
    share_limit_action: str,
    seen_complete: num,
    auto_tmm: z.boolean(),
    time_active: num,
    seeding_time: num,
    last_activity: num,
    availability: num,
    reannounce: num,
    comment: str,
    // added by synccontroller.cpp (addAnnounceStats)
    has_tracker_warning: z.boolean(),
    has_tracker_error: z.boolean(),
    has_other_announce_error: z.boolean(),
  })
  .loose();
export type Torrent = z.infer<typeof torrentSchema>;

/** In maindata, torrents are keyed by hash and carry only the changed fields. */
export const torrentDeltaSchema = torrentSchema.omit({ hash: true }).partial().loose();
export type TorrentDelta = z.infer<typeof torrentDeltaSchema>;

export const categorySchema = z
  .object({
    name: str,
    savePath: str.optional().default(""),
    download_path: z.union([str, z.boolean()]).nullable().optional(),
  })
  .loose();
export type Category = z.infer<typeof categorySchema>;

export const connectionStatuses = ["connected", "firewalled", "disconnected"] as const;

export const serverStateSchema = z
  .object({
    connection_status: z.string(),
    dht_nodes: num,
    dl_info_data: num,
    dl_info_speed: num,
    dl_rate_limit: num,
    up_info_data: num,
    up_info_speed: num,
    up_rate_limit: num,
    last_external_address_v4: str,
    last_external_address_v6: str,
    free_space_on_disk: num,
    queueing: z.boolean(),
    refresh_interval: num,
    use_alt_speed_limits: z.boolean(),
    alltime_dl: num,
    alltime_ul: num,
    total_peer_connections: num,
  })
  .partial()
  .loose();
export type ServerState = z.infer<typeof serverStateSchema>;

export const maindataResponseSchema = z
  .object({
    rid: num,
    full_update: z.boolean().optional(),
    torrents: z.record(str, torrentDeltaSchema).optional(),
    torrents_removed: z.array(str).optional(),
    categories: z.record(str, categorySchema.partial().loose()).optional(),
    categories_removed: z.array(str).optional(),
    tags: z.array(str).optional(),
    tags_removed: z.array(str).optional(),
    trackers: z.record(str, z.array(str)).optional(),
    trackers_removed: z.array(str).optional(),
    server_state: serverStateSchema.optional(),
  })
  .loose();
export type MaindataResponse = z.infer<typeof maindataResponseSchema>;

export const propertiesSchema = z
  .object({
    infohash_v1: str,
    infohash_v2: str,
    name: str,
    hash: str,
    time_elapsed: num,
    seeding_time: num,
    eta: num,
    nb_connections: num,
    nb_connections_limit: num,
    total_downloaded: num,
    total_downloaded_session: num,
    total_uploaded: num,
    total_uploaded_session: num,
    dl_speed: num,
    dl_speed_avg: num,
    up_speed: num,
    up_speed_avg: num,
    dl_limit: num,
    up_limit: num,
    total_wasted: num,
    seeds: num,
    seeds_total: num,
    peers: num,
    peers_total: num,
    share_ratio: num,
    popularity: num,
    availability: num,
    reannounce: num,
    total_size: num,
    pieces_num: num,
    piece_size: num,
    pieces_have: num,
    created_by: str,
    private: z.boolean().nullable(),
    addition_date: num,
    last_seen: num,
    completion_date: num,
    creation_date: num,
    save_path: str,
    download_path: str,
    comment: str,
    has_metadata: z.boolean(),
    progress: num,
  })
  .partial()
  .loose();
export type Properties = z.infer<typeof propertiesSchema>;

/** File priorities, from src/base/bittorrent/downloadpriority.h. */
export const FilePriority = { Ignored: 0, Normal: 1, High: 6, Maximum: 7 } as const;
export type FilePriorityValue = (typeof FilePriority)[keyof typeof FilePriority];

export const fileSchema = z
  .object({
    index: num,
    name: str,
    size: num,
    progress: num,
    priority: num,
    is_seed: z.boolean().optional(),
    piece_range: z.array(num).optional(),
    availability: num.optional(),
  })
  .loose();
export type TorrentFile = z.infer<typeof fileSchema>;
export const filesSchema = z.array(fileSchema);

/**
 * Tracker status, from TrackerEndpointState in src/base/bittorrent/trackerentrystatus.h;
 * 0 is "disabled", used by the DHT/PeX/LSD entries (getStickyTrackers in torrentscontroller.cpp).
 */
export const TrackerStatus = {
  Disabled: 0,
  NotContacted: 1,
  Working: 2,
  Updating: 3,
  NotWorking: 4,
  TrackerError: 5,
  Unreachable: 6,
} as const;

export const trackerSchema = z
  .object({
    url: str,
    tier: num,
    status: num,
    msg: str.optional().default(""),
    num_peers: num.optional().default(0),
    num_seeds: num.optional().default(0),
    num_leeches: num.optional().default(0),
    num_downloaded: num.optional().default(0),
    updating: z.boolean().optional(),
    next_announce: num.optional(),
    min_announce: num.optional(),
  })
  .loose();
export type Tracker = z.infer<typeof trackerSchema>;
export const trackersSchema = z.array(trackerSchema);

export const webseedsSchema = z.array(z.object({ url: str }).loose());

export const peerSchema = z
  .object({
    client: str,
    connection: str,
    country: str.optional(),
    country_code: str.optional(),
    dl_speed: num,
    up_speed: num,
    downloaded: num,
    uploaded: num,
    files: str.optional(),
    flags: str,
    flags_desc: str.optional(),
    ip: str,
    port: num,
    progress: num,
    relevance: num,
    peer_id_client: str.optional(),
  })
  .partial()
  .loose();
export type PeerDelta = z.infer<typeof peerSchema>;

export const torrentPeersResponseSchema = z
  .object({
    rid: num,
    full_update: z.boolean().optional(),
    show_flags: z.boolean().optional(),
    peers: z.record(str, peerSchema).optional(),
    peers_removed: z.array(str).optional(),
  })
  .loose();

/** torrents/pieceStates: 0 not downloaded, 1 downloading, 2 downloaded. */
export const pieceStatesSchema = z.array(num);
