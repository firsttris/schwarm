import { ShieldCheckIcon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { api } from "@/api/client";
import { useMaindata, useRunAction } from "@/api/queries";
import { PathInput } from "@/components/path-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  looksLikeVpnInterface,
  matchesQuery,
  preferenceFields,
  preferenceSections,
  sectionLabel,
} from "@/lib/preferences";
import { usePreferencesDraft } from "@/lib/preferences/draft";
import { m } from "@/paraglide/messages.js";
import { SearchPluginsSection } from "../search/search-plugins";
import { PrefField } from "./pref-field";

type Draft = ReturnType<typeof usePreferencesDraft>;

interface Item {
  key: string;
  description?: string;
  /** Shown only while this switch is on. */
  when?: string;
  /** Shown only while this field is not this value. */
  unless?: [string, unknown];
}

function Fields({ draft, items, disabled }: { draft: Draft; items: Item[]; disabled?: (key: string) => boolean }) {
  return (
    <>
      {items
        .filter(
          (i) => (!i.when || draft.value(i.when) === true) && (!i.unless || draft.value(i.unless[0]) !== i.unless[1]),
        )
        .map((i) => (
          <PrefField
            key={i.key}
            name={i.key}
            value={draft.value(i.key)}
            readValue={draft.value}
            onChange={(v) => draft.set(i.key, v)}
            description={i.description}
            disabled={disabled?.(i.key)}
          />
        ))}
    </>
  );
}

export function SectionShell({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div className="flex max-w-[640px] flex-[999_1_420px] flex-col gap-6 pb-20">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium text-lg">{title}</h2>
        <p className="text-muted-foreground">{text}</p>
      </div>
      <Separator />
      {children}
    </div>
  );
}

function Loading({ draft, children }: { draft: Draft; children: ReactNode }) {
  if (draft.query.isPending) return <Skeleton className="h-64 w-full" />;
  return <>{children}</>;
}

/** Category folders, changed directly with torrents/editCategory when a field loses focus. */
function CategoryPaths() {
  const { data } = useMaindata();
  const run = useRunAction();
  const categories = Object.values(data?.categories ?? {}).sort((a, b) => a.name.localeCompare(b.name));
  if (!categories.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-sm">{m.prefs_category_paths()}</span>
      <div className="rounded-lg border">
        {categories.map((c) => (
          <div key={c.name} className="flex items-center gap-4 border-b px-3 py-2 last:border-b-0">
            <Label htmlFor={`cat-${c.name}`} className="w-28 shrink-0 truncate">
              {c.name}
            </Label>
            <PathInput
              id={`cat-${c.name}`}
              defaultValue={c.savePath}
              placeholder={m.category_default_path()}
              className="h-8 font-mono text-[13px]"
              onBlur={(e) => {
                if (e.target.value !== c.savePath)
                  void run(() => api.editCategory(c.name, e.target.value), { success: m.toast_category_saved() });
              }}
            />
          </div>
        ))}
      </div>
      <span className="text-muted-foreground text-sm">{m.prefs_category_paths_hint()}</span>
    </div>
  );
}

export function DownloadsSection() {
  const draft = usePreferencesDraft();
  return (
    <SectionShell title={m.prefs_section_downloads()} text={m.prefs_downloads_text()}>
      <Loading draft={draft}>
        <Fields draft={draft} items={[{ key: "save_path", description: m.prefs_save_path_hint() }]} />
        <CategoryPaths />
        <Fields
          draft={draft}
          items={[
            { key: "temp_path_enabled", description: m.prefs_temp_path_hint() },
            { key: "temp_path", when: "temp_path_enabled" },
            { key: "auto_delete_mode", description: m.prefs_auto_delete_hint() },
            { key: "torrent_content_layout" },
            { key: "add_stopped_enabled" },
            { key: "torrent_stop_condition" },
            { key: "auto_tmm_enabled", description: m.add_management_hint() },
            { key: "excluded_file_names_enabled" },
            { key: "excluded_file_names", when: "excluded_file_names_enabled" },
          ]}
        />
      </Loading>
    </SectionShell>
  );
}

export function SpeedSection() {
  const draft = usePreferencesDraft();
  return (
    <SectionShell title={m.prefs_section_speed()} text={m.prefs_speed_text()}>
      <Loading draft={draft}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Fields
            draft={draft}
            items={[{ key: "dl_limit" }, { key: "up_limit" }, { key: "alt_dl_limit" }, { key: "alt_up_limit" }]}
          />
        </div>
        <Fields
          draft={draft}
          items={[
            { key: "scheduler_enabled", description: m.schedule_hint() },
            { key: "scheduler_days", when: "scheduler_enabled" },
          ]}
        />
        {draft.value("scheduler_enabled") === true && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Fields
              draft={draft}
              items={[
                { key: "schedule_from_hour" },
                { key: "schedule_from_min" },
                { key: "schedule_to_hour" },
                { key: "schedule_to_min" },
              ]}
            />
          </div>
        )}
        <Fields
          draft={draft}
          items={[{ key: "limit_lan_peers" }, { key: "limit_utp_rate" }, { key: "limit_tcp_overhead" }]}
        />
      </Loading>
    </SectionShell>
  );
}

export function SeedingSection() {
  const draft = usePreferencesDraft();
  return (
    <SectionShell title={m.prefs_seeding()} text={m.prefs_seeding_text()}>
      <Loading draft={draft}>
        <Fields
          draft={draft}
          items={[
            { key: "max_ratio_enabled" },
            { key: "max_ratio", when: "max_ratio_enabled" },
            { key: "max_seeding_time_enabled" },
            { key: "max_seeding_time", when: "max_seeding_time_enabled" },
            { key: "max_inactive_seeding_time_enabled" },
            { key: "max_inactive_seeding_time", when: "max_inactive_seeding_time_enabled" },
            { key: "share_limits_mode" },
            { key: "max_ratio_act" },
          ]}
        />
        <Separator />
        <Fields
          draft={draft}
          items={[
            { key: "queueing_enabled", description: m.prefs_queue_hint() },
            { key: "max_active_downloads", when: "queueing_enabled" },
            { key: "max_active_uploads", when: "queueing_enabled" },
            { key: "max_active_torrents", when: "queueing_enabled" },
            { key: "dont_count_slow_torrents", when: "queueing_enabled" },
          ]}
        />
      </Loading>
    </SectionShell>
  );
}

/** Fields a VPN container sets from outside: locked until the user unlocks them on purpose. */
const vpnManaged = new Set([
  "current_network_interface",
  "current_interface_address",
  "listen_port",
  "random_port",
  "upnp",
]);

export function ConnectionSection() {
  const draft = usePreferencesDraft();
  const [unlocked, setUnlocked] = useState(false);
  const iface = String(draft.query.data?.current_network_interface ?? "");
  const vpn = looksLikeVpnInterface(iface);
  const locked = (key: string) => vpn && !unlocked && vpnManaged.has(key);
  return (
    <SectionShell title={m.prefs_section_connection()} text={m.prefs_connection_text()}>
      <Loading draft={draft}>
        {vpn && (
          <div
            role="note"
            className="grid grid-cols-[16px_1fr] gap-x-3 gap-y-1 rounded-lg border px-4 py-3 text-sm"
            data-testid="vpn-note"
          >
            <ShieldCheckIcon className="mt-0.5 size-4 text-success" aria-hidden />
            <span className="font-medium">{m.prefs_vpn_title()}</span>
            <span />
            <span className="text-muted-foreground">
              {m.prefs_vpn_text({ iface, port: String(draft.query.data?.listen_port ?? "–") })}
            </span>
            <span />
            {!unlocked && (
              <Button variant="link" className="h-auto justify-self-start p-0" onClick={() => setUnlocked(true)}>
                {m.prefs_vpn_unlock()}
              </Button>
            )}
          </div>
        )}
        <Fields
          draft={draft}
          disabled={locked}
          items={[
            { key: "current_network_interface" },
            { key: "current_interface_address" },
            { key: "listen_port" },
            { key: "upnp" },
            { key: "max_connec" },
            { key: "max_connec_per_torrent" },
            { key: "max_uploads" },
            { key: "max_uploads_per_torrent" },
            { key: "dht" },
            { key: "pex" },
            { key: "lsd" },
            { key: "encryption" },
            { key: "anonymous_mode" },
            { key: "proxy_type" },
            { key: "proxy_ip", unless: ["proxy_type", "None"] },
            { key: "proxy_port", unless: ["proxy_type", "None"] },
            { key: "proxy_auth_enabled", unless: ["proxy_type", "None"] },
            { key: "proxy_username", when: "proxy_auth_enabled", unless: ["proxy_type", "None"] },
            { key: "proxy_password", when: "proxy_auth_enabled", unless: ["proxy_type", "None"] },
            { key: "proxy_peer_connections", unless: ["proxy_type", "None"] },
          ]}
        />
      </Loading>
    </SectionShell>
  );
}

export function SearchRssSection() {
  const draft = usePreferencesDraft();
  return (
    <div className="flex max-w-[640px] flex-[999_1_420px] flex-col gap-10 pb-20">
      <SearchPluginsSection />
      <SectionShell title={m.prefs_section_rss()} text={m.prefs_rss_text()}>
        <Loading draft={draft}>
          <Fields
            draft={draft}
            items={[
              { key: "rss_processing_enabled" },
              { key: "rss_refresh_interval", when: "rss_processing_enabled" },
              { key: "rss_max_articles_per_feed" },
              { key: "rss_auto_downloading_enabled" },
              { key: "rss_download_repack_proper_episodes" },
              { key: "rss_smart_episode_filters" },
            ]}
          />
        </Loading>
      </SectionShell>
    </div>
  );
}

/**
 * "Alle Optionen": every field of app/preferences from the generated table, grouped like
 * qBittorrent's options dialog and searchable in German, English and by key.
 */
export function AllOptionsSection() {
  const draft = usePreferencesDraft();
  const [query, setQuery] = useState("");
  const groups = useMemo(
    () =>
      preferenceSections
        .map((section) => ({
          section,
          fields: preferenceFields.filter((f) => f.section === section && matchesQuery(f, query)),
        }))
        .filter((g) => g.fields.length),
    [query],
  );
  const shown = groups.reduce((s, g) => s + g.fields.length, 0);
  return (
    <div className="flex max-w-[860px] flex-[999_1_420px] flex-col gap-6 pb-20">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium text-lg">{m.prefs_all()}</h2>
        <p className="text-muted-foreground">{m.prefs_all_text({ n: preferenceFields.length })}</p>
      </div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={m.prefs_all_search()}
        aria-label={m.prefs_all_search()}
        className="max-w-md"
        data-testid="prefs-search"
      />
      <Loading draft={draft}>
        {shown === 0 && <p className="text-muted-foreground">{m.no_results()}</p>}
        {groups.map((g) => (
          <section key={g.section} className="flex flex-col gap-2" aria-labelledby={`prefs-${g.section}`}>
            <h3
              id={`prefs-${g.section}`}
              className="sticky top-[52px] z-[1] bg-background py-2 font-medium text-muted-foreground text-sm"
            >
              {sectionLabel(g.section)} <span className="tabular-nums">· {g.fields.length}</span>
            </h3>
            <div className="flex flex-col divide-y" data-testid={`prefs-group-${g.section}`}>
              {g.fields.map((f) => (
                <div key={f.key} className="py-2">
                  <PrefField
                    name={f.key}
                    layout="row"
                    value={draft.value(f.key)}
                    readValue={draft.value}
                    onChange={(v) => draft.set(f.key, v)}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </Loading>
    </div>
  );
}

/** Appears while there are unsaved changes, in every section. */
export function SaveBar() {
  const draft = usePreferencesDraft();
  if (!draft.count) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-20 flex justify-center px-4 md:bottom-6"
      data-testid="save-bar"
    >
      <div className="flex items-center gap-3 rounded-lg border bg-popover px-4 py-2 text-sm shadow-lg">
        <span className="tabular-nums">{m.prefs_unsaved({ n: draft.count })}</span>
        <Button variant="outline" size="sm" onClick={draft.discard}>
          {m.rule_discard()}
        </Button>
        <Button size="sm" onClick={() => void draft.save()}>
          {m.save()}
        </Button>
      </div>
    </div>
  );
}
