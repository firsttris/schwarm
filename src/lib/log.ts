import type { LogMessage } from "@/api/schemas";

/** Message types of qBittorrent's log are bits (src/base/logger.h). */
export const logLevels = ["normal", "info", "warning", "critical"] as const;
export type LogLevel = (typeof logLevels)[number];

const bits: Record<LogLevel, number> = { normal: 1, info: 2, warning: 4, critical: 8 };

export function logLevel(type: number): LogLevel {
  if (type & 8) return "critical";
  if (type & 4) return "warning";
  if (type & 2) return "info";
  return "normal";
}

/** qBittorrent keeps 20 000 messages (MAX_LOG_MESSAGES); the browser keeps the newest of them. */
export const LOG_KEEP = 5000;

/**
 * Appends what log/main or log/peers sent after the last known id. qBittorrent counts ids up
 * from 0 since its start; a smaller id than the last one means it restarted, so start over.
 */
export function appendLog<T extends { id: number }>(list: T[], next: T[], keep = LOG_KEEP): T[] {
  if (!next.length) return list;
  const last = list.at(-1)?.id ?? -1;
  // asked for ids after `last`: anything else means a new count
  const merged = next[0]!.id <= last ? next : [...list, ...next];
  return merged.length > keep ? merged.slice(merged.length - keep) : merged;
}

/** Messages of the chosen levels that contain the text, newest first. */
export function filterLog(list: LogMessage[], levels: LogLevel[], query: string): LogMessage[] {
  const mask = levels.reduce((sum, level) => sum | bits[level], 0);
  const q = query.trim().toLowerCase();
  const out: LogMessage[] = [];
  for (let i = list.length - 1; i >= 0; i--) {
    const msg = list[i]!;
    if (!(msg.type & mask)) continue;
    if (q && !msg.message.toLowerCase().includes(q)) continue;
    out.push(msg);
  }
  return out;
}

/** Counts per level, for the filter buttons. */
export function countLevels(list: LogMessage[]): Record<LogLevel, number> {
  const counts: Record<LogLevel, number> = { normal: 0, info: 0, warning: 0, critical: 0 };
  for (const msg of list) counts[logLevel(msg.type)]++;
  return counts;
}
