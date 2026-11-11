import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

/** qBittorrent's "infinite" ETA (MAX_ETA in src/base/bittorrent/torrent.h). */
export const MAX_ETA = 8640000;

const units = ["B", "KB", "MB", "GB", "TB", "PB"];

function numberFormat(options: Intl.NumberFormatOptions, locale = getLocale()) {
  return new Intl.NumberFormat(locale, options);
}

/** Sizes in decimal units with at most three significant digits: "6,1 GB", "820 KB". */
export function formatBytes(bytes: number, locale = getLocale()): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "–";
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  const digits = numberFormat({ maximumSignificantDigits: 3 }, locale);
  return `${digits.format(unit === 0 ? Math.round(value) : value)} ${units[unit]}`;
}

export function formatSpeed(bytesPerSecond: number, locale = getLocale()): string {
  return `${formatBytes(bytesPerSecond, locale)}/s`;
}

/** Speed limits: 0 (and below) means unlimited. */
export function formatLimit(bytesPerSecond: number, locale = getLocale()): string {
  return bytesPerSecond > 0 ? formatSpeed(bytesPerSecond, locale) : m.limit_unlimited({}, { locale });
}

export function formatNumber(value: number, locale = getLocale()): string {
  return numberFormat({ maximumFractionDigits: 0 }, locale).format(value);
}

/** Whole percent, rounded down but never to 100 before the end (0.58 → 58, 0.999 → 99). */
export function percentValue(progress: number): number {
  if (progress >= 1) return 100;
  // the epsilon keeps 0.58 * 100 = 57.99… at 58
  return Math.max(0, Math.min(99, Math.floor(progress * 100 + 1e-9)));
}

export function formatPercent(progress: number, locale = getLocale()): string {
  return `${numberFormat({ maximumFractionDigits: 0 }, locale).format(percentValue(progress))} %`;
}

/** Ratios: qBittorrent sends -1 for "infinite" (MAX_RATIO). */
export function formatRatio(ratio: number, locale = getLocale()): string {
  if (ratio < 0) return "∞";
  return numberFormat({ minimumFractionDigits: 2, maximumFractionDigits: 2 }, locale).format(ratio);
}

/** Durations in seconds, two units at most: "6 s", "11 Min", "2 Std 5 Min", "3 T 4 Std". */
export function formatDuration(seconds: number, locale = getLocale()): string {
  if (!Number.isFinite(seconds) || seconds < 0 || seconds >= MAX_ETA) return "∞";
  const s = Math.floor(seconds);
  const o = { locale };
  if (s < 60) return m.duration_s({ s }, o);
  const min = Math.floor(s / 60);
  if (min < 60) return m.duration_min({ min }, o);
  const h = Math.floor(min / 60);
  if (h < 24) {
    const rest = min % 60;
    return rest ? m.duration_h_min({ h, min: rest }, o) : m.duration_h({ h }, o);
  }
  const d = Math.floor(h / 24);
  const rest = h % 24;
  return rest ? m.duration_d_h({ d, h: rest }, o) : m.duration_d({ d }, o);
}

export function formatEta(eta: number, locale = getLocale()): string {
  if (eta <= 0 || eta >= MAX_ETA) return "–";
  return formatDuration(eta, locale);
}

/** Unix seconds; qBittorrent sends -1 or 0 for "never". "heute, 20:58", "gestern, 08:12", "3. Nov. 2026". */
export function formatDate(unixSeconds: number, now = new Date(), locale = getLocale()): string {
  if (!unixSeconds || unixSeconds < 0) return "–";
  const date = new Date(unixSeconds * 1000);
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (days === 0) return m.date_today({ time }, { locale });
  if (days === 1) return m.date_yesterday({ time }, { locale });
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

/** "193.29.106.24" or "–" */
export function orDash(value: string | undefined | null): string {
  return value ? value : "–";
}

/** Host of a tracker URL, as the stock WebUI groups trackers by host. */
export function trackerHost(url: string): string {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}
