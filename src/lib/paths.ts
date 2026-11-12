/**
 * Folder suggestions for path fields. qBittorrent lists a folder that exists
 * (app/getDirectoryContent, appcontroller.cpp) and answers with full paths, so the field asks for
 * the folder of what is typed and keeps the entries that start with the rest.
 */

/** "/downloads/fi" → "/downloads/", "C:\\Vid" → "C:\\"; undefined while it is no absolute path. */
export function folderOf(text: string): string | undefined {
  const absolute = text.startsWith("/") || /^[A-Za-z]:[\\/]/.test(text);
  if (!absolute) return undefined;
  const cut = Math.max(text.lastIndexOf("/"), text.lastIndexOf("\\"));
  return text.slice(0, cut + 1);
}

/** Suggestions for the typed text, at most `max`; with `folders`, each with a closing separator. */
export function suggestPaths(text: string, entries: string[], max = 25, folders = true): string[] {
  const sep = text.includes("\\") && !text.includes("/") ? "\\" : "/";
  const lower = text.toLowerCase();
  return entries
    .filter((p) => p.toLowerCase().startsWith(lower) && p.length > text.length)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, max)
    .map((p) => (!folders || p.endsWith(sep) ? p : p + sep));
}
