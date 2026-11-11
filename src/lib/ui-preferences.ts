import { createStore } from "./store";

export type Density = "comfortable" | "compact";

export interface UiPreferences {
  density: Density;
  /** Column ids that are visible in the torrent table. */
  columns: string[];
  pageSize: number;
}

export const defaultColumns = ["name", "status", "progress", "speed", "eta", "ratio"];

export const preferencesStore = createStore<UiPreferences>("preferences", {
  density: "comfortable",
  columns: defaultColumns,
  pageSize: 100,
});

export const usePreferences = preferencesStore.use;
