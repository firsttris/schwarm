import { m } from "@/paraglide/messages.js";
import { preferenceFields } from "./fields";
import type { PreferenceField, PreferenceSection } from "./types";

export { preferenceFields } from "./fields";
export * from "./types";

export const fieldByKey = new Map(preferenceFields.map((f) => [f.key, f]));

export function field(key: string): PreferenceField {
  const f = fieldByKey.get(key);
  if (!f) throw new Error(`Unknown preference ${key}`);
  return f;
}

export function sectionLabel(section: PreferenceSection): string {
  switch (section) {
    case "behavior":
      return m.prefs_section_behavior();
    case "downloads":
      return m.prefs_section_downloads();
    case "connection":
      return m.prefs_section_connection();
    case "speed":
      return m.prefs_section_speed();
    case "bittorrent":
      return m.prefs_section_bittorrent();
    case "rss":
      return m.prefs_section_rss();
    case "webui":
      return m.prefs_section_webui();
    case "advanced":
      return m.prefs_section_advanced();
  }
}

/** Search in the German and English label, qBittorrent's original label and the key. */
export function matchesQuery(f: PreferenceField, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = `${f.label()} ${f.original ?? ""} ${f.key}`.toLowerCase();
  return q.split(/\s+/).every((t) => haystack.includes(t));
}

/**
 * Interface names that look like a VPN tunnel. qBittorrent bound to such an interface is
 * usually set up by a VPN container (e.g. gluetun), which also sets the listening port.
 */
export function looksLikeVpnInterface(name: string | undefined): boolean {
  return !!name && /^(tun|tap|wg|ppp|proton|nordlynx|mullvad|utun)/i.test(name);
}

/** The API key as the stock WebUI shows it: the first four, dots, the last six (preferences.html, maskAPIKey). */
export function maskApiKey(key: string): string {
  if (key.length <= 10) return "•".repeat(key.length);
  return key.slice(0, 4) + "•".repeat(key.length - 10) + key.slice(-6);
}
