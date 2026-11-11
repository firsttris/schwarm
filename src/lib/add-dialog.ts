import { createMemoryStore } from "./store";

/** The "Torrent hinzufügen" dialog can be opened from the header, the phone list and by dropping files. */
export const addDialogStore = createMemoryStore<{ open: boolean; files: File[]; links: string; downloader?: string }>({
  open: false,
  files: [],
  links: "",
});

/** `downloader`: the search plugin that fetches the link (results of the search page). */
export function openAddDialog(init: { files?: File[]; links?: string; downloader?: string } = {}) {
  addDialogStore.set({ open: true, files: init.files ?? [], links: init.links ?? "", downloader: init.downloader });
}
