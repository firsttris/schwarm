import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import { api, isAuthError } from "@/api/client";
import { authState } from "@/api/queries";
import { m } from "@/paraglide/messages.js";
import { createMemoryStore } from "../store";

export const preferencesKey = ["preferences", "all"] as const;

/**
 * Unsaved changes to app/preferences, kept while moving between the settings sections and
 * saved together. Only changed fields are sent; qBittorrent leaves the others alone.
 */
const draftStore = createMemoryStore<Record<string, unknown>>({});

export function usePreferencesDraft() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: preferencesKey, queryFn: api.preferences, staleTime: 30_000 });
  const changes = draftStore.use();

  const value = useCallback(
    (key: string): unknown => (key in changes ? changes[key] : query.data?.[key]),
    [changes, query.data],
  );

  const set = useCallback(
    (key: string, next: unknown) =>
      draftStore.set((prev) => {
        const copy = { ...prev };
        if (JSON.stringify(query.data?.[key]) === JSON.stringify(next) && key !== "web_ui_password") delete copy[key];
        else copy[key] = next;
        return copy;
      }),
    [query.data],
  );

  const discard = useCallback(() => draftStore.set({}), []);

  const save = useCallback(async () => {
    const pending = draftStore.get();
    if (!Object.keys(pending).length) return;
    try {
      await api.setPreferences(pending);
      draftStore.set({});
      toast.success(m.toast_prefs_saved());
    } catch (error) {
      if (isAuthError(error)) authState.set(true);
      else toast.error(m.error_action(), { description: error instanceof Error ? error.message : String(error) });
    } finally {
      await queryClient.invalidateQueries({ queryKey: ["preferences"] });
    }
  }, [queryClient]);

  return { query, changes, count: Object.keys(changes).length, value, set, discard, save };
}
