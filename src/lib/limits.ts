import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";
import { formatLimit } from "./format";

const MB = 1000 * 1000;

/** A speed limit in bytes/s as MB/s text for an input; empty for unlimited. */
export function formatMbps(bytesPerSecond: number, locale = getLocale()): string {
  if (!(bytesPerSecond > 0)) return "";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2, useGrouping: false }).format(bytesPerSecond / MB);
}

/** MB/s text (comma or point) to bytes/s; empty or 0 is unlimited (0), garbage is NaN. */
export function parseMbps(text: string): number {
  const t = text.trim().replace(",", ".");
  if (!t) return 0;
  const value = Number(t);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * MB) : Number.NaN;
}

/** "unbegrenzt / 5 MB/s" */
export function formatLimitPair(dl: number, up: number, locale = getLocale()): string {
  return `${formatLimit(dl, locale)} / ${formatLimit(up, locale)}`;
}

/** Scheduler::Days of src/base/preferences.h. */
export const schedulerDays = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function schedulerDaysLabel(days: number, locale = getLocale()): string {
  const o = { locale };
  switch (days) {
    case 0:
      return m.days_every(undefined, o);
    case 1:
      return m.days_weekdays(undefined, o);
    case 2:
      return m.days_weekend(undefined, o);
    default: {
      // 3 = Monday … 9 = Sunday; 2026-11-09 was a Monday
      const date = new Date(2026, 10, 9 + (days - 3));
      return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date);
    }
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "Mo–Fr 08:00–18:00" */
export function formatSchedule(
  s: {
    schedule_from_hour?: number;
    schedule_from_min?: number;
    schedule_to_hour?: number;
    schedule_to_min?: number;
    scheduler_days?: number;
  },
  locale = getLocale(),
): string {
  const from = `${pad(s.schedule_from_hour ?? 0)}:${pad(s.schedule_from_min ?? 0)}`;
  const to = `${pad(s.schedule_to_hour ?? 0)}:${pad(s.schedule_to_min ?? 0)}`;
  return `${schedulerDaysLabel(s.scheduler_days ?? 0, locale)} ${from}–${to}`;
}
