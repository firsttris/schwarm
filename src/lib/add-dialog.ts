import { createMemoryStore } from "./store";

/** The "Torrent hinzufügen" dialog can be opened from the header, the phone list and by dropping files. */
export const addDialogStore = createMemoryStore<{ open: boolean; files: File[]; links: string }>({
  open: false,
  files: [],
  links: "",
});

export function openAddDialog(init: { files?: File[]; links?: string } = {}) {
  addDialogStore.set({ open: true, files: init.files ?? [], links: init.links ?? "" });
}
