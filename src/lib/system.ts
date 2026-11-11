import type { QueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { authState, resetMaindata } from "@/api/queries";
import { createMemoryStore } from "./store";

/** Dialogs opened from the app menu and Settings → "System", and whether qBittorrent was shut down. */
export const systemStore = createMemoryStore<{ creator: boolean; shutdown: boolean; stopped: boolean }>({
  creator: false,
  shutdown: false,
  stopped: false,
});

export const openCreator = () => systemStore.set((s) => ({ ...s, creator: true }));
export const openShutdown = () => systemStore.set((s) => ({ ...s, shutdown: true }));

/** auth/logout, then the login screen (qBittorrent drops the SID). */
export async function logout(queryClient: QueryClient) {
  await api.logout().catch(() => undefined);
  resetMaindata();
  queryClient.clear();
  authState.set(true);
}
