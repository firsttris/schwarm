import * as z from "zod/mini";
import {
  filesSchema,
  maindataResponseSchema,
  matchingArticlesSchema,
  pieceStatesSchema,
  propertiesSchema,
  type RssRule,
  rssRulesSchema,
  rssTreeSchema,
  type ShareLimitAction,
  type ShareLimitsMode,
  type SpeedPreferences,
  searchPluginsSchema,
  searchResultsSchema,
  speedPreferencesSchema,
  torrentInfoSchema,
  torrentPeersResponseSchema,
  trackersSchema,
  webseedsSchema,
} from "./schemas";

/**
 * Typed client for the qBittorrent WebUI API v2 on the same origin. The page is served
 * by qBittorrent under any path, so requests go to the relative "api/v2/…".
 * Endpoints and parameters: src/webui/api/*controller.cpp at release-5.3.0.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** True when qBittorrent wants a login: API calls without a session answer 403. */
export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

const base = "api/v2/";

type Params = Record<string, string | number | boolean | undefined>;

function toSearch(params: Params): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  return search;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(base + path, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || res.statusText);
  }
  return res;
}

async function get<T>(path: string, schema: z.ZodMiniType<T>, params: Params = {}): Promise<T> {
  const search = toSearch(params).toString();
  const res = await request(search ? `${path}?${search}` : path);
  return schema.parse(await res.json());
}

async function getText(path: string, params: Params = {}): Promise<string> {
  const search = toSearch(params).toString();
  const res = await request(search ? `${path}?${search}` : path);
  return res.text();
}

async function post(path: string, params: Params | FormData = {}): Promise<string> {
  const body = params instanceof FormData ? params : toSearch(params);
  const res = await request(path, { method: "POST", body });
  return res.text();
}

const hashes = (list: string[]) => list.join("|");

export type ContentLayout = "Original" | "Subfolder" | "NoSubfolder";
export type StopCondition = "None" | "MetadataReceived" | "FilesChecked";

export interface AddTorrentOptions {
  urls?: string[];
  files?: File[];
  savepath?: string;
  downloadPath?: string;
  useDownloadPath?: boolean;
  category?: string;
  tags?: string[];
  rename?: string;
  stopped?: boolean;
  sequentialDownload?: boolean;
  firstLastPiecePrio?: boolean;
  autoTMM?: boolean;
  contentLayout?: ContentLayout;
  stopCondition?: StopCondition;
  addToTopOfQueue?: boolean;
  /** "Skip hash check", called seedMode in addAction (torrentscontroller.cpp). */
  seedMode?: boolean;
  /** Bytes per second; 0 is unlimited. */
  dlLimit?: number;
  upLimit?: number;
  /** A search plugin that downloads the link itself (search results; addAction "downloader"). */
  downloader?: string;
  /** One priority per file index, after choosing files (addAction: "filePriorities"). */
  filePriorities?: number[];
}

export interface ShareLimits {
  /** -2 global, -1 none, otherwise the ratio. */
  ratioLimit: number;
  /** Minutes; -2 global, -1 none. */
  seedingTimeLimit: number;
  inactiveSeedingTimeLimit: number;
  shareLimitAction: ShareLimitAction;
  shareLimitsMode: ShareLimitsMode;
}

export const api = {
  // auth (src/webui/api/authcontroller.cpp): 200 on success, 401 on wrong credentials
  login: (username: string, password: string) => post("auth/login", { username, password }),
  logout: () => post("auth/logout"),

  // app (appcontroller.cpp)
  version: () => getText("app/version"),
  webapiVersion: () => getText("app/webapiVersion"),
  defaultSavePath: () => getText("app/defaultSavePath"),

  // sync (synccontroller.cpp)
  maindata: (rid: number) => get("sync/maindata", maindataResponseSchema, { rid }),
  torrentPeers: (hash: string, rid: number) => get("sync/torrentPeers", torrentPeersResponseSchema, { hash, rid }),

  // torrents (torrentscontroller.cpp)
  properties: (hash: string) => get("torrents/properties", propertiesSchema, { hash }),
  files: (hash: string) => get("torrents/files", filesSchema, { hash }),
  trackers: (hash: string) => get("torrents/trackers", trackersSchema, { hash }),
  webseeds: (hash: string) => get("torrents/webseeds", webseedsSchema, { hash }),
  pieceStates: (hash: string) => get("torrents/pieceStates", pieceStatesSchema, { hash }),

  start: (list: string[]) => post("torrents/start", { hashes: hashes(list) }),
  stop: (list: string[]) => post("torrents/stop", { hashes: hashes(list) }),
  setForceStart: (list: string[], value: boolean) => post("torrents/setForceStart", { hashes: hashes(list), value }),
  remove: (list: string[], deleteFiles: boolean) => post("torrents/delete", { hashes: hashes(list), deleteFiles }),
  recheck: (list: string[]) => post("torrents/recheck", { hashes: hashes(list) }),
  reannounce: (list: string[]) => post("torrents/reannounce", { hashes: hashes(list) }),
  setCategory: (list: string[], category: string) => post("torrents/setCategory", { hashes: hashes(list), category }),
  addTags: (list: string[], tags: string[]) => post("torrents/addTags", { hashes: hashes(list), tags: tags.join(",") }),
  removeTags: (list: string[], tags: string[]) =>
    post("torrents/removeTags", { hashes: hashes(list), tags: tags.join(",") }),
  setAutoManagement: (list: string[], enable: boolean) =>
    post("torrents/setAutoManagement", { hashes: hashes(list), enable }),
  toggleSequentialDownload: (list: string[]) => post("torrents/toggleSequentialDownload", { hashes: hashes(list) }),
  toggleFirstLastPiecePrio: (list: string[]) => post("torrents/toggleFirstLastPiecePrio", { hashes: hashes(list) }),
  setSuperSeeding: (list: string[], value: boolean) =>
    post("torrents/setSuperSeeding", { hashes: hashes(list), value }),
  setLocation: (list: string[], location: string) => post("torrents/setLocation", { hashes: hashes(list), location }),
  rename: (hash: string, name: string) => post("torrents/rename", { hash, name }),
  topPrio: (list: string[]) => post("torrents/topPrio", { hashes: hashes(list) }),
  increasePrio: (list: string[]) => post("torrents/increasePrio", { hashes: hashes(list) }),
  decreasePrio: (list: string[]) => post("torrents/decreasePrio", { hashes: hashes(list) }),
  bottomPrio: (list: string[]) => post("torrents/bottomPrio", { hashes: hashes(list) }),
  exportUrl: (hash: string) => `${base}torrents/export?${toSearch({ hash })}`,

  /** Several file ids are joined with "|" (filePrioAction). */
  setFilePriority: (hash: string, ids: number[], priority: number) =>
    post("torrents/filePrio", { hash, id: ids.join("|"), priority }),

  addTrackers: (hash: string, urls: string[]) => post("torrents/addTrackers", { hash, urls: urls.join("\n") }),
  editTracker: (hash: string, url: string, newUrl: string) => post("torrents/editTracker", { hash, url, newUrl }),
  removeTrackers: (hash: string, urls: string[]) => post("torrents/removeTrackers", { hash, urls: urls.join("|") }),
  addWebSeeds: (hash: string, urls: string[]) => post("torrents/addWebSeeds", { hash, urls: urls.join("|") }),
  editWebSeed: (hash: string, origUrl: string, newUrl: string) =>
    post("torrents/editWebSeed", { hash, origUrl, newUrl }),
  removeWebSeeds: (hash: string, urls: string[]) => post("torrents/removeWebSeeds", { hash, urls: urls.join("|") }),
  addPeers: (list: string[], peers: string[]) =>
    post("torrents/addPeers", { hashes: hashes(list), peers: peers.join("|") }),

  /** Per torrent, bytes per second; 0 is unlimited. */
  setDownloadLimit: (list: string[], limit: number) =>
    post("torrents/setDownloadLimit", { hashes: hashes(list), limit }),
  setUploadLimit: (list: string[], limit: number) => post("torrents/setUploadLimit", { hashes: hashes(list), limit }),
  setShareLimits: (list: string[], limits: ShareLimits) =>
    post("torrents/setShareLimits", { hashes: hashes(list), ...limits }),

  createCategory: (category: string, savePath: string) => post("torrents/createCategory", { category, savePath }),
  editCategory: (category: string, savePath: string) => post("torrents/editCategory", { category, savePath }),
  /** Several categories are joined with a line break (removeCategoriesAction). */
  removeCategories: (categories: string[]) => post("torrents/removeCategories", { categories: categories.join("\n") }),
  createTags: (tags: string[]) => post("torrents/createTags", { tags: tags.join(",") }),
  deleteTags: (tags: string[]) => post("torrents/deleteTags", { tags: tags.join(",") }),

  renameFile: (hash: string, oldPath: string, newPath: string) =>
    post("torrents/renameFile", { hash, oldPath, newPath }),
  renameFolder: (hash: string, oldPath: string, newPath: string) =>
    post("torrents/renameFolder", { hash, oldPath, newPath }),

  /**
   * Metadata of a magnet link or hash before adding. qBittorrent answers 202 with the hashes
   * while it is still fetching, then 200 with the file list (fetchMetadataAction).
   */
  fetchMetadata: async (source: string, downloader?: string) => {
    const res = await request("torrents/fetchMetadata", { method: "POST", body: toSearch({ source, downloader }) });
    return { ready: res.status === 200, info: torrentInfoSchema.parse(await res.json()) };
  },
  /** Metadata of .torrent files, one result per file (parseMetadataAction). */
  parseMetadata: async (files: File[]) => {
    const form = new FormData();
    for (const file of files) form.append("torrents", file, file.name);
    const res = await request("torrents/parseMetadata", { method: "POST", body: form });
    return z.array(torrentInfoSchema).parse(await res.json());
  },

  // search (searchcontroller.cpp); qBittorrent answers 409 when Python is missing
  searchStart: async (pattern: string, category: string, plugins: string[] | "enabled" | "all") => {
    const body = toSearch({ pattern, category, plugins: Array.isArray(plugins) ? plugins.join("|") : plugins });
    const res = await request("search/start", { method: "POST", body });
    return z.looseObject({ id: z.number() }).parse(await res.json()).id;
  },
  searchStop: (id: number) => post("search/stop", { id }),
  searchDelete: (id: number) => post("search/delete", { id }),
  /** Results from `offset` on, so polling only fetches the new ones. */
  searchResults: (id: number, offset: number) => get("search/results", searchResultsSchema, { id, offset }),
  searchPlugins: () => get("search/plugins", searchPluginsSchema),
  /** URLs or local paths of plugin files, joined with "|". */
  installSearchPlugins: (sources: string[]) => post("search/installPlugin", { sources: sources.join("|") }),
  uninstallSearchPlugins: (names: string[]) => post("search/uninstallPlugin", { names: names.join("|") }),
  enableSearchPlugins: (names: string[], enable: boolean) =>
    post("search/enablePlugin", { names: names.join("|"), enable }),
  updateSearchPlugins: () => post("search/updatePlugins"),

  // rss (rsscontroller.cpp); items are addressed by their path, folders joined with "\\"
  rssItems: () => get("rss/items", rssTreeSchema, { withData: true }),
  rssAddFeed: (url: string, path: string) => post("rss/addFeed", { url, path }),
  rssAddFolder: (path: string) => post("rss/addFolder", { path }),
  rssSetFeedUrl: (path: string, url: string) => post("rss/setFeedURL", { path, url }),
  rssRemoveItem: (path: string) => post("rss/removeItem", { path }),
  rssMoveItem: (itemPath: string, destPath: string) => post("rss/moveItem", { itemPath, destPath }),
  rssRefreshItem: (itemPath: string) => post("rss/refreshItem", { itemPath }),
  /** Without articleId the whole feed or folder is marked as read. */
  rssMarkAsRead: (itemPath: string, articleId?: string) => post("rss/markAsRead", { itemPath, articleId }),
  rssRules: () => get("rss/rules", rssRulesSchema),
  rssSetRule: (ruleName: string, rule: Partial<RssRule>) =>
    post("rss/setRule", { ruleName, ruleDef: JSON.stringify(rule) }),
  rssRenameRule: (ruleName: string, newRuleName: string) => post("rss/renameRule", { ruleName, newRuleName }),
  rssRemoveRule: (ruleName: string) => post("rss/removeRule", { ruleName }),
  rssMatchingArticles: (ruleName: string) => get("rss/matchingArticles", matchingArticlesSchema, { ruleName }),

  // transfer (transfercontroller.cpp)
  banPeers: (peers: string[]) => post("transfer/banPeers", { peers: peers.join("|") }),
  toggleSpeedLimitsMode: () => post("transfer/toggleSpeedLimitsMode"),
  pauseSession: () => post("transfer/pauseSession"),
  resumeSession: () => post("transfer/resumeSession"),

  // app (appcontroller.cpp): preferences are sent as one JSON object
  speedPreferences: () => get("app/preferences", speedPreferencesSchema),
  /** Only the given fields change; the others stay as they are (setPreferencesAction). */
  setPreferences: (prefs: SpeedPreferences | Record<string, unknown>) =>
    post("app/setPreferences", { json: JSON.stringify(prefs) }),
  /** Every field of app/preferences, untyped: src/lib/preferences describes them. */
  preferences: () => get("app/preferences", z.record(z.string(), z.unknown())),
  networkInterfaces: () =>
    get("app/networkInterfaceList", z.array(z.looseObject({ name: z.string(), value: z.string() }))),
  networkAddresses: (iface: string) => get("app/networkInterfaceAddressList", z.array(z.string()), { iface }),

  add: (options: AddTorrentOptions) => {
    const form = new FormData();
    const { urls, files, tags, filePriorities, ...rest } = options;
    if (filePriorities?.length) form.set("filePriorities", filePriorities.join(","));
    if (urls?.length) form.set("urls", urls.join("\n"));
    for (const file of files ?? []) form.append("torrents", file, file.name);
    if (tags?.length) form.set("tags", tags.join(","));
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined && value !== "") form.set(key, String(value));
    }
    return post("torrents/add", form);
  },
};
