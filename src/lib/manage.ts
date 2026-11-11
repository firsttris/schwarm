import { createMemoryStore } from "./store";

/** Opened from the sidebar ("Kategorien" / "Tags") and the app menu. */
export const manageStore = createMemoryStore<{ open: boolean; tab: "categories" | "tags" }>({
  open: false,
  tab: "categories",
});
export const openManage = (tab: "categories" | "tags") => manageStore.set({ open: true, tab });
