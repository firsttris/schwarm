import * as z from "zod/mini";

/*
 * Zod schemas for the qBittorrent WebUI API v2 (qBittorrent 5.3.0, WebAPI 2.16.2).
 * Field names come from the sources:
 *   torrents:      src/webui/api/serialize/serialize_torrent.{h,cpp}
 *   maindata:      src/webui/api/synccontroller.cpp (maindataAction, getTransferInfo)
 *   properties,
 *   files,
 *   trackers:      src/webui/api/torrentscontroller.cpp
 *   peers:         src/webui/api/synccontroller.cpp (torrentPeersAction)
 * Objects are loose, so a newer qBittorrent with extra fields keeps working. zod/mini keeps the
 * bundle small: only the validators in use are included.
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

export const torrentSchema = z.looseObject({
  hash: str,
  infohash_v1: str,
  infohash_v2: str,
  name: str,
  has_metadata: z.boolean(),
  created_by: str,
  creation_date: num,
  private: z.nullable(z.boolean()),
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
});
export type Torrent = z.infer<typeof torrentSchema>;

/** In maindata, torrents are keyed by hash and carry only the changed fields. */
export const torrentDeltaSchema = z.partial(z.omit(torrentSchema, { hash: true }));
export type TorrentDelta = z.infer<typeof torrentDeltaSchema>;

export const categorySchema = z.looseObject({
  name: str,
  savePath: z._default(z.optional(str), ""),
  download_path: z.optional(z.nullable(z.union([str, z.boolean()]))),
});
export type Category = z.infer<typeof categorySchema>;

export const connectionStatuses = ["connected", "firewalled", "disconnected"] as const;

export const serverStateSchema = z.partial(
  z.looseObject({
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
    /** true while the whole session is paused (transfer/pauseSession). */
    session_state: z.boolean(),
    alltime_dl: num,
    alltime_ul: num,
    total_peer_connections: num,
  }),
);
export type ServerState = z.infer<typeof serverStateSchema>;

export const maindataResponseSchema = z.looseObject({
  rid: num,
  full_update: z.optional(z.boolean()),
  torrents: z.optional(z.record(str, torrentDeltaSchema)),
  torrents_removed: z.optional(z.array(str)),
  categories: z.optional(z.record(str, z.partial(categorySchema))),
  categories_removed: z.optional(z.array(str)),
  tags: z.optional(z.array(str)),
  tags_removed: z.optional(z.array(str)),
  trackers: z.optional(z.record(str, z.array(str))),
  trackers_removed: z.optional(z.array(str)),
  server_state: z.optional(serverStateSchema),
});
export type MaindataResponse = z.infer<typeof maindataResponseSchema>;

export const propertiesSchema = z.partial(
  z.looseObject({
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
    private: z.nullable(z.boolean()),
    addition_date: num,
    last_seen: num,
    completion_date: num,
    creation_date: num,
    save_path: str,
    download_path: str,
    comment: str,
    has_metadata: z.boolean(),
    progress: num,
  }),
);
export type Properties = z.infer<typeof propertiesSchema>;

/** File priorities, from src/base/bittorrent/downloadpriority.h. */
export const FilePriority = { Ignored: 0, Normal: 1, High: 6, Maximum: 7 } as const;
export type FilePriorityValue = (typeof FilePriority)[keyof typeof FilePriority];

export const fileSchema = z.looseObject({
  index: num,
  name: str,
  size: num,
  progress: num,
  priority: num,
  is_seed: z.optional(z.boolean()),
  piece_range: z.optional(z.array(num)),
  availability: z.optional(num),
});
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

export const trackerSchema = z.looseObject({
  url: str,
  tier: num,
  status: num,
  msg: z._default(z.optional(str), ""),
  num_peers: z._default(z.optional(num), 0),
  num_seeds: z._default(z.optional(num), 0),
  num_leeches: z._default(z.optional(num), 0),
  num_downloaded: z._default(z.optional(num), 0),
  updating: z.optional(z.boolean()),
  next_announce: z.optional(num),
  min_announce: z.optional(num),
});
export type Tracker = z.infer<typeof trackerSchema>;
export const trackersSchema = z.array(trackerSchema);

export const webseedsSchema = z.array(z.looseObject({ url: str }));

export const peerSchema = z.partial(
  z.looseObject({
    client: str,
    connection: str,
    country: z.optional(str),
    country_code: z.optional(str),
    dl_speed: num,
    up_speed: num,
    downloaded: num,
    uploaded: num,
    files: z.optional(str),
    flags: str,
    flags_desc: z.optional(str),
    ip: str,
    port: num,
    progress: num,
    relevance: num,
    peer_id_client: z.optional(str),
  }),
);
export type PeerDelta = z.infer<typeof peerSchema>;

export const torrentPeersResponseSchema = z.looseObject({
  rid: num,
  full_update: z.optional(z.boolean()),
  show_flags: z.optional(z.boolean()),
  peers: z.optional(z.record(str, peerSchema)),
  peers_removed: z.optional(z.array(str)),
});

/** torrents/pieceStates: 0 not downloaded, 1 downloading, 2 downloaded. */
export const pieceStatesSchema = z.array(num);

/** torrents/fetchMetadata and torrents/parseMetadata (serializeTorrentInfo in torrentscontroller.cpp). */
export const torrentInfoSchema = z.looseObject({
  infohash_v1: z.optional(str),
  infohash_v2: z.optional(str),
  hash: z.optional(str),
  info: z.optional(
    z.looseObject({
      name: str,
      length: num,
      piece_length: z.optional(num),
      pieces_num: z.optional(num),
      private: z.optional(z.boolean()),
      files: z.array(z.looseObject({ path: str, length: num, priority: z.optional(num) })),
    }),
  ),
  trackers: z.optional(z.array(z.looseObject({ url: str, tier: num }))),
  created_by: z.optional(str),
  comment: z.optional(str),
});
export type TorrentInfo = z.infer<typeof torrentInfoSchema>;

/** The part of app/preferences that the speed menu edits (appcontroller.cpp, preferencesAction). */
export const speedPreferencesSchema = z.partial(
  z.looseObject({
    dl_limit: num,
    up_limit: num,
    alt_dl_limit: num,
    alt_up_limit: num,
    scheduler_enabled: z.boolean(),
    schedule_from_hour: num,
    schedule_from_min: num,
    schedule_to_hour: num,
    schedule_to_min: num,
    /** Scheduler::Days in src/base/preferences.h: 0 every day, 1 weekdays, 2 weekend, 3–9 Monday–Sunday. */
    scheduler_days: num,
  }),
);
export type SpeedPreferences = z.infer<typeof speedPreferencesSchema>;

/** ShareLimitAction and ShareLimitsMode in src/base/bittorrent/sharelimits.h, sent by name. */
export const shareLimitActions = ["Default", "Stop", "Remove", "RemoveWithContent", "EnableSuperSeeding"] as const;
export type ShareLimitAction = (typeof shareLimitActions)[number];
export const shareLimitsModes = ["Default", "MatchAny", "MatchAll"] as const;
export type ShareLimitsMode = (typeof shareLimitsModes)[number];
/** -2 follows the global setting, -1 means no limit (DEFAULT_RATIO_LIMIT, NO_RATIO_LIMIT). */
export const USE_GLOBAL_LIMIT = -2;
export const NO_LIMIT = -1;
