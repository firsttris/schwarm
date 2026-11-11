import { QueryCache, QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { m } from "@/paraglide/messages.js";
import { api, isAuthError } from "./client";
import { emptyMaindata, type MaindataState, mergeMaindata, mergePeers, type PeersState } from "./maindata";
import type { Torrent } from "./schemas";

/** Set when qBittorrent answers 403: the login screen takes over until a login succeeds. */
let loginRequired = false;
const authListeners = new Set<() => void>();
export const authState = {
  get: () => loginRequired,
  set(value: boolean) {
    if (loginRequired === value) return;
    loginRequired = value;
    for (const l of authListeners) l();
  },
  subscribe(l: () => void) {
    authListeners.add(l);
    return () => authListeners.delete(l);
  },
};
export const useLoginRequired = () => useSyncExternalStore(authState.subscribe, authState.get, authState.get);

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (isAuthError(error)) authState.set(true);
      },
    }),
    defaultOptions: {
      queries: {
        retry: (count, error) => !isAuthError(error) && count < 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/** Poll faster while the tab is visible (spec: every 1–2 s, slower when hidden). */
export const pollInterval = (visibleMs: number) => () =>
  document.visibilityState === "visible" ? visibleMs : visibleMs * 5;

export const maindataKey = ["maindata"] as const;

/** Download/upload speed history for the charts, the last five minutes. */
export interface SpeedSample {
  t: number;
  dl: number;
  up: number;
}
const HISTORY_MS = 5 * 60 * 1000;
const history = new Map<string, SpeedSample[]>();
const GLOBAL = "\u0000global";

function record(state: MaindataState, now = Date.now()) {
  const push = (key: string, dl: number, up: number) => {
    let list = history.get(key);
    if (!list) {
      list = [];
      history.set(key, list);
    }
    list.push({ t: now, dl, up });
    while (list.length && list[0]!.t < now - HISTORY_MS) list.shift();
  };
  push(GLOBAL, state.serverState.dl_info_speed ?? 0, state.serverState.up_info_speed ?? 0);
  for (const t of Object.values(state.torrents)) push(t.hash, t.dlspeed, t.upspeed);
  for (const key of history.keys()) if (key !== GLOBAL && !state.torrents[key]) history.delete(key);
}

export function speedHistory(hash?: string): SpeedSample[] {
  return history.get(hash ?? GLOBAL) ?? [];
}

/**
 * The last state as qBittorrent sent it. Deltas are merged onto this, not onto the cache,
 * so an optimistic patch in the cache (patchTorrents) is replaced by the truth with the
 * next poll, also when qBittorrent did not do what was asked.
 */
let serverMaindata: MaindataState | undefined;
export function resetMaindata() {
  serverMaindata = undefined;
}

export function useMaindata(enabled = true) {
  return useQuery({
    queryKey: maindataKey,
    queryFn: async () => {
      const res = await api.maindata(serverMaindata?.rid ?? 0);
      serverMaindata = mergeMaindata(serverMaindata, res);
      record(serverMaindata);
      return serverMaindata;
    },
    enabled,
    // The merge keeps unchanged torrents' identity itself
    structuralSharing: false,
    refetchInterval: pollInterval(1500),
    refetchIntervalInBackground: true,
    placeholderData: emptyMaindata,
  });
}

export function useVersion() {
  return useQuery({ queryKey: ["version"], queryFn: api.version, staleTime: Number.POSITIVE_INFINITY });
}

export function useDefaultSavePath() {
  return useQuery({ queryKey: ["defaultSavePath"], queryFn: api.defaultSavePath, staleTime: 60_000 });
}

export function useProperties(hash: string | undefined) {
  return useQuery({
    queryKey: ["properties", hash],
    queryFn: () => api.properties(hash!),
    enabled: !!hash,
    refetchInterval: pollInterval(2000),
  });
}

export function useFiles(hash: string | undefined, active = true) {
  return useQuery({
    queryKey: ["files", hash],
    queryFn: () => api.files(hash!),
    enabled: !!hash && active,
    refetchInterval: pollInterval(3000),
  });
}

export function useTrackers(hash: string | undefined, active = true) {
  return useQuery({
    queryKey: ["trackers", hash],
    queryFn: async () => {
      const [trackers, webseeds] = await Promise.all([api.trackers(hash!), api.webseeds(hash!)]);
      return { trackers, webseeds };
    },
    enabled: !!hash && active,
    refetchInterval: pollInterval(5000),
  });
}

export function usePieceStates(hash: string | undefined, active = true) {
  return useQuery({
    queryKey: ["pieceStates", hash],
    queryFn: () => api.pieceStates(hash!),
    enabled: !!hash && active,
    refetchInterval: pollInterval(5000),
  });
}

export function usePeers(hash: string | undefined, active = true) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["peers", hash],
    queryFn: async () => {
      const prev = queryClient.getQueryData<PeersState>(["peers", hash]);
      return mergePeers(prev, await api.torrentPeers(hash!, prev?.rid ?? 0));
    },
    enabled: !!hash && active,
    structuralSharing: false,
    refetchInterval: pollInterval(2000),
  });
}

/** Changes the cached maindata at once, before the next poll confirms (or corrects) it. */
export function patchTorrents(queryClient: QueryClient, hashes: string[], patch: (t: Torrent) => Partial<Torrent>) {
  queryClient.setQueryData<MaindataState>(maindataKey, (prev) => {
    if (!prev) return prev;
    const torrents = { ...prev.torrents };
    for (const hash of hashes) {
      const t = torrents[hash];
      if (t) torrents[hash] = { ...t, ...patch(t) };
    }
    return { ...prev, torrents };
  });
}

/**
 * Runs an action against qBittorrent. Errors become a toast; a 403 shows the login.
 * The optimistic patch (safe ones only: start/stop, category, tags) lasts until the
 * next maindata poll, which shows what qBittorrent really did.
 */
export function useRunAction() {
  const queryClient = useQueryClient();
  return useCallback(
    async <T>(
      action: () => Promise<T>,
      options: {
        optimistic?: { hashes: string[]; patch: (t: Torrent) => Partial<Torrent> };
        success?: string;
        invalidate?: unknown[][];
      } = {},
    ): Promise<T | undefined> => {
      if (options.optimistic) patchTorrents(queryClient, options.optimistic.hashes, options.optimistic.patch);
      try {
        const result = await action();
        if (options.success) toast.success(options.success);
        for (const key of options.invalidate ?? []) void queryClient.invalidateQueries({ queryKey: key });
        void queryClient.invalidateQueries({ queryKey: maindataKey });
        return result;
      } catch (error) {
        if (isAuthError(error)) authState.set(true);
        else toast.error(m.error_action(), { description: error instanceof Error ? error.message : String(error) });
        void queryClient.invalidateQueries({ queryKey: maindataKey });
        return undefined;
      }
    },
    [queryClient],
  );
}
