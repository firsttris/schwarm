import { ChevronRightIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { speedHistory, useMaindata, usePieceStates, useProperties } from "@/api/queries";
import type { Torrent } from "@/api/schemas";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { copyText } from "@/lib/clipboard";
import {
  formatBytes,
  formatDate,
  formatDuration,
  formatLimit,
  formatNumber,
  formatRatio,
  formatSpeed,
  orDash,
} from "@/lib/format";
import { m } from "@/paraglide/messages.js";
import { PiecesBar } from "../charts/pieces-bar";
import { SpeedChart } from "../charts/speed-chart";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span className="truncate font-mono text-[13px]" title={value}>
          {value || "–"}
        </span>
      </span>
      {value && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={m.copy_label({ label })}
          onClick={async () =>
            (await copyText(value)) ? toast.success(m.toast_copied()) : toast.error(m.toast_copy_failed())
          }
        >
          <CopyIcon className="text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}

/** Tab "Übersicht": speed chart, key figures, pieces, the rest collapsible (Details.dc.html). */
export function OverviewTab({ t }: { t: Torrent }) {
  // re-render with every poll, the history grows with it
  useMaindata();
  const { data: p } = useProperties(t.hash);
  const { data: pieces } = usePieceStates(t.hash);
  const samples = speedHistory(t.hash);
  const yes = m.yes();
  const no = m.no();

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-xl border p-4 shadow-xs" aria-labelledby="speed-title">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 id="speed-title" className="font-semibold leading-none">
              {m.speed()}
            </h3>
            <span className="text-[13px] text-muted-foreground">{m.last_minutes()}</span>
          </div>
          <div className="flex gap-3.5 text-[13px] tabular-nums">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-[2px] bg-chart-1" aria-hidden />
              <span className="sr-only">{m.download()}</span>
              {formatSpeed(t.dlspeed)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-[2px] bg-chart-2" aria-hidden />
              <span className="sr-only">{m.upload()}</span>
              {formatSpeed(t.upspeed)}
            </span>
          </div>
        </div>
        <SpeedChart
          samples={samples}
          label={m.speed_chart_label({ dl: formatSpeed(t.dlspeed), up: formatSpeed(t.upspeed) })}
        />
      </section>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-sm tabular-nums">
        <Stat label={m.stat_uploaded()} value={formatBytes(t.uploaded)} />
        <Stat label={m.col_ratio()} value={formatRatio(t.ratio)} />
        <Stat
          label={m.col_seeds()}
          value={m.n_of({ n: formatNumber(t.num_seeds), total: formatNumber(Math.max(0, t.num_complete)) })}
        />
        <Stat
          label={m.col_peers()}
          value={m.n_of({ n: formatNumber(t.num_leechs), total: formatNumber(Math.max(0, t.num_incomplete)) })}
        />
        <Stat label={m.col_availability()} value={t.availability < 0 ? "–" : formatRatio(t.availability)} />
        <Stat label={m.col_time_active()} value={formatDuration(t.time_active)} />
        <Stat
          label={m.stat_pieces()}
          value={m.pieces_value({ n: formatNumber(t.pieces_num), size: formatBytes(t.piece_size) })}
        />
        <Stat label={m.stat_wasted()} value={formatBytes(t.total_wasted)} />
      </dl>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-[13px] text-muted-foreground tabular-nums">
          <span>{m.stat_pieces()}</span>
          <span>{m.n_of({ n: formatNumber(t.pieces_have), total: formatNumber(t.pieces_num) })}</span>
        </div>
        <PiecesBar states={pieces ?? []} label={m.pieces_label({ have: t.pieces_have, total: t.pieces_num })} />
      </div>

      <Collapsible className="group/more flex flex-col gap-3">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="-ml-2 self-start text-muted-foreground">
            <ChevronRightIcon className="transition-transform group-data-[state=open]/more:rotate-90" />
            {m.all_details()}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-sm tabular-nums">
            <Stat label={m.stat_downloaded()} value={formatBytes(t.downloaded)} />
            <Stat
              label={m.stat_session()}
              value={`↓ ${formatBytes(t.downloaded_session)} · ↑ ${formatBytes(t.uploaded_session)}`}
            />
            <Stat
              label={m.stat_avg_dl()}
              value={p?.dl_speed_avg !== undefined && p.dl_speed_avg >= 0 ? formatSpeed(p.dl_speed_avg) : "–"}
            />
            <Stat
              label={m.stat_avg_up()}
              value={p?.up_speed_avg !== undefined && p.up_speed_avg >= 0 ? formatSpeed(p.up_speed_avg) : "–"}
            />
            <Stat
              label={m.stat_connections()}
              value={m.n_of({ n: formatNumber(t.connections_count), total: formatNumber(t.connections_limit) })}
            />
            <Stat label={m.stat_limits()} value={`↓ ${formatLimit(t.dl_limit)} · ↑ ${formatLimit(t.up_limit)}`} />
            <Stat label={m.col_size()} value={formatBytes(t.total_size)} />
            <Stat label={m.stat_seeding_time()} value={formatDuration(t.seeding_time)} />
            <Stat label={m.col_added_on()} value={formatDate(t.added_on)} />
            <Stat label={m.col_completion_on()} value={formatDate(t.completion_on)} />
            <Stat label={m.stat_created_on()} value={formatDate(t.creation_date)} />
            <Stat label={m.stat_created_by()} value={orDash(t.created_by)} />
            <Stat label={m.stat_last_seen()} value={formatDate(t.seen_complete)} />
            <Stat label={m.stat_reannounce()} value={t.reannounce > 0 ? formatDuration(t.reannounce) : "–"} />
            <Stat label={m.stat_private()} value={t.private === null ? "–" : t.private ? yes : no} />
            <Stat label={m.col_queue()} value={t.priority > 0 ? t.priority : "–"} />
          </dl>
          {t.comment && (
            <div className="mt-3.5 flex flex-col gap-0.5 text-sm">
              <span className="text-muted-foreground">{m.stat_comment()}</span>
              <p className="break-words">{t.comment}</p>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <div className="h-px bg-border" />

      <div className="flex flex-col gap-2.5">
        <CopyRow label={m.save_location()} value={t.save_path} />
        <CopyRow label={m.info_hash_v1()} value={t.infohash_v1} />
        {t.infohash_v2 && <CopyRow label={m.info_hash_v2()} value={t.infohash_v2} />}
      </div>
    </div>
  );
}
