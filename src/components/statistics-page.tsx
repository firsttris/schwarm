import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { speedHistory, useMaindata } from "@/api/queries";
import type { ServerState } from "@/api/schemas";
import { SpeedChart } from "@/components/charts/speed-chart";
import { Separator } from "@/components/ui/separator";
import { formatBytes, formatDuration, formatNumber, formatRatio, formatSpeed } from "@/lib/format";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";
import { PageHeader } from "./page-header";

/** Some statistics come as text ("1.41", "-", "0"): a number, or undefined when there is none. */
export function statNumber(value: number | string | undefined): number | undefined {
  if (value === undefined || value === "" || value === "-") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function percent(value: number | string | undefined): string {
  const n = statNumber(value);
  if (n === undefined) return "–";
  return `${new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }).format(n)} %`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="flex flex-col gap-0.5">
        <span>{label}</span>
        {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
      </dt>
      <dd className="shrink-0 font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function Group({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1 rounded-xl border p-4 shadow-xs" aria-label={title}>
      <h2 className="font-semibold leading-none">{title}</h2>
      <p className="text-[13px] text-muted-foreground">{text}</p>
      <dl className="mt-2 flex flex-col divide-y text-sm">{children}</dl>
    </section>
  );
}

/**
 * Statistik: the figures of the stock "Statistics" window (www/private/views/statistics.html)
 * from server_state (synccontroller.cpp, getTransferInfo), plus the overall speed of the last
 * minutes and how long qBittorrent has been running (app/processInfo).
 */
export function StatisticsPage() {
  const { data } = useMaindata();
  const s: ServerState = data?.serverState ?? {};
  const process = useQuery({ queryKey: ["processInfo"], queryFn: api.processInfo, staleTime: 60_000 });
  const ratio = statNumber(s.global_ratio);
  const running = process.data ? Math.max(0, Date.now() / 1000 - process.data.launch_time) : undefined;
  const dl = s.dl_info_speed ?? 0;
  const up = s.up_info_speed ?? 0;
  const bytes = (n: number | undefined) => (n === undefined ? "–" : formatBytes(n));
  const count = (n: number | undefined) => (n === undefined ? "–" : formatNumber(n));

  return (
    <>
      <PageHeader crumbs={[m.nav_statistics()]} title={m.nav_statistics()} />
      <main className="flex flex-col gap-6 px-4 py-5 md:px-10 md:py-8" data-testid="statistics">
        <div className="hidden flex-col gap-1 md:flex">
          <h1 className="font-semibold text-2xl tracking-tight">{m.nav_statistics()}</h1>
          <p className="text-muted-foreground">{m.stats_intro()}</p>
        </div>
        <Separator className="hidden md:block" />

        <section className="flex flex-col gap-3 rounded-xl border p-4 shadow-xs" aria-labelledby="stats-speed">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="stats-speed" className="font-semibold leading-none">
                {m.speed()}
              </h2>
              <span className="text-[13px] text-muted-foreground">{m.stats_speed_text()}</span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 whitespace-nowrap text-[13px] tabular-nums sm:flex-row sm:gap-3.5">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-[2px] bg-chart-1" aria-hidden />
                <span className="sr-only">{m.download()}</span>
                {formatSpeed(dl)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-[2px] bg-chart-2" aria-hidden />
                <span className="sr-only">{m.upload()}</span>
                {formatSpeed(up)}
              </span>
            </div>
          </div>
          <SpeedChart
            samples={speedHistory()}
            height={160}
            label={m.speed_chart_label({ dl: formatSpeed(dl), up: formatSpeed(up) })}
          />
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Group title={m.stats_alltime()} text={m.stats_alltime_text()}>
            <Stat label={m.stat_downloaded()} value={bytes(s.alltime_dl)} />
            <Stat label={m.stat_uploaded()} value={bytes(s.alltime_ul)} />
            <Stat label={m.col_ratio()} value={ratio === undefined ? "–" : formatRatio(ratio)} />
          </Group>
          <Group title={m.stats_session()} text={m.stats_session_text()}>
            <Stat label={m.stats_running()} value={running === undefined ? "–" : formatDuration(running)} />
            <Stat label={m.stat_downloaded()} value={bytes(s.dl_info_data)} />
            <Stat label={m.stat_uploaded()} value={bytes(s.up_info_data)} />
            <Stat label={m.stats_wasted()} hint={m.stats_wasted_hint()} value={bytes(s.total_wasted_session)} />
            <Stat label={m.stats_peers()} value={count(s.total_peer_connections)} />
          </Group>
          <Group title={m.stats_disk()} text={m.stats_disk_text()}>
            <Stat label={m.stats_buffers()} value={bytes(s.total_buffers_size)} />
            <Stat label={m.stats_read_hits()} value={percent(s.read_cache_hits)} />
            <Stat label={m.stats_read_overload()} value={percent(s.read_cache_overload)} />
            <Stat label={m.stats_write_overload()} value={percent(s.write_cache_overload)} />
            <Stat label={m.stats_io_jobs()} value={count(s.queued_io_jobs)} />
            <Stat
              label={m.stats_queue_time()}
              value={s.average_time_queue === undefined ? "–" : `${formatNumber(s.average_time_queue)} ms`}
            />
            <Stat label={m.stats_queued_size()} value={bytes(s.total_queued_size)} />
          </Group>
          <Group title={m.stats_network()} text={m.stats_network_text()}>
            <Stat label={m.stats_announces()} value={count(s.queued_tracker_announces)} />
            <Stat label={m.stats_dht()} value={count(s.dht_nodes)} />
            <Stat label={m.stats_free()} value={bytes(s.free_space_on_disk)} />
          </Group>
        </div>
      </main>
    </>
  );
}
