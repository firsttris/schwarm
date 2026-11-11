/** Piece sizes the stock WebUI offers (createtorrent.html): auto, then 16 KiB … 128 MiB. */
export const pieceSizes = [0, ...Array.from({ length: 14 }, (_, i) => 1024 << (i + 4))];

/** Piece sizes are powers of two: "16 KiB", "4 MiB". */
export function formatPieceSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${bytes / (1024 * 1024)} MiB`;
  return `${bytes / 1024} KiB`;
}

/** One URL per line; an empty line between trackers starts a new tier and is kept (parseUrls). */
export function urlLines(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim());
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines.at(-1)) lines.pop();
  // several empty lines mean one tier break
  return lines.filter((l, i) => l || lines[i - 1]);
}

/** The last part of a path, for the task list: "/downloads/urlaub/" → "urlaub". */
export function baseName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

/** libtorrent 2 knows torrent format v2 and hybrid; 1.2 has the alignment options instead. */
export function hasV2(libtorrent: string | undefined): boolean {
  return Number.parseInt(libtorrent ?? "2", 10) >= 2;
}
