/** The sections of qBittorrent's options dialog, which "Alle Optionen" follows. */
export const preferenceSections = [
  "behavior",
  "downloads",
  "connection",
  "speed",
  "bittorrent",
  "rss",
  "webui",
  "advanced",
] as const;
export type PreferenceSection = (typeof preferenceSections)[number];

export type PreferenceValue = string | number | boolean | Record<string, string | number>;

export interface PreferenceField {
  /** The field name in app/preferences. */
  key: string;
  section: PreferenceSection;
  /**
   * bool, number, string, password (never shown), lines (one entry per line), enum (options),
   * scan (monitored folders), iface / ifaddr (network interface and address, listed by the API)
   */
  type: "bool" | "number" | "string" | "password" | "lines" | "enum" | "scan" | "iface" | "ifaddr";
  label: () => string;
  /** bytes/s is shown as MB/s; the others as written. path, command and url only change the font. */
  unit?: string;
  /** qBittorrent's own label, for the tooltip. */
  original?: string;
  options?: { value: string | number | boolean; label: () => string }[];
  readOnly?: boolean;
  writeOnly?: boolean;
}
