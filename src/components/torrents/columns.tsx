import type { ColumnDef, SortingFn } from "@tanstack/react-table";
import {
  ArrowDownUpIcon,
  ArrowDownWideNarrowIcon,
  ArrowUpNarrowWideIcon,
  CircleAlertIcon,
  CircleArrowDownIcon,
  CircleArrowUpIcon,
  CircleDashedIcon,
  CirclePauseIcon,
  ClockIcon,
  FileWarningIcon,
  HourglassIcon,
  type LucideIcon,
  RefreshCwIcon,
  TruckIcon,
} from "lucide-react";
import type { Torrent } from "@/api/schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  formatBytes,
  formatDate,
  formatDuration,
  formatEta,
  formatLimit,
  formatNumber,
  formatPercent,
  formatRatio,
  formatSpeed,
  percentValue,
} from "@/lib/format";
import { kindLabel } from "@/lib/labels";
import { isStopped, type StatusKind, statusKind, torrentTags } from "@/lib/torrents";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages.js";

export const statusIcon: Record<StatusKind, LucideIcon> = {
  downloading: CircleArrowDownIcon,
  metadata: CircleDashedIcon,
  stalled: HourglassIcon,
  queued: ClockIcon,
  checking: RefreshCwIcon,
  seeding: CircleArrowUpIcon,
  stopped: CirclePauseIcon,
  moving: TruckIcon,
  missing: FileWarningIcon,
  error: CircleAlertIcon,
};

const kindOrder: StatusKind[] = [
  "downloading",
  "metadata",
  "stalled",
  "checking",
  "queued",
  "seeding",
  "moving",
  "stopped",
  "missing",
  "error",
];

export function StatusCell({ state, className }: { state: string; className?: string }) {
  const kind = statusKind(state);
  const Icon = statusIcon[kind];
  const bad = kind === "error" || kind === "missing";
  return (
    <span className={cn("inline-flex items-center gap-2", bad && "text-destructive", className)}>
      <Icon className={cn("size-4", !bad && "text-muted-foreground")} aria-hidden />
      {kindLabel(kind)}
    </span>
  );
}

export function ProgressCell({ progress }: { progress: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <Progress value={percentValue(progress)} className="h-1.5 flex-1" aria-label={m.col_progress()} />
      <span className="w-10 text-right text-[13px] tabular-nums">{formatPercent(progress)}</span>
    </span>
  );
}

/** "Tempo" in the mockup: download speed while loading, upload speed while seeding. */
export function mainSpeed(t: Torrent): number | undefined {
  if (isStopped(t) || statusKind(t.state) === "error") return undefined;
  const kind = statusKind(t.state);
  return kind === "seeding" || t.progress >= 1 ? t.upspeed : t.dlspeed;
}

function SortHeader({
  column,
  label,
  align,
}: {
  column: import("@tanstack/react-table").Column<Torrent>;
  label: string;
  align?: "right";
}) {
  const sorted = column.getIsSorted();
  const Icon = sorted === "asc" ? ArrowUpNarrowWideIcon : sorted === "desc" ? ArrowDownWideNarrowIcon : ArrowDownUpIcon;
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "-mx-3 h-8 data-[sorted=false]:[&_svg]:opacity-0 hover:[&_svg]:opacity-100",
        align === "right" && "flex-row-reverse",
      )}
      data-sorted={sorted !== false}
      onClick={column.getToggleSortingHandler()}
      aria-label={m.sort_by({ column: label })}
    >
      {label}
      <Icon className="size-3.5 text-muted-foreground" aria-hidden />
    </Button>
  );
}

const sortByKind: SortingFn<Torrent> = (a, b) =>
  kindOrder.indexOf(statusKind(a.original.state)) - kindOrder.indexOf(statusKind(b.original.state));

const dash = <span className="text-muted-foreground">–</span>;

interface Meta {
  label: () => string;
  align?: "right";
  /** Width in px; the name column takes the rest. */
  width?: number;
}

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    label?: () => string;
    align?: "right";
    width?: number;
  }
}

function simple(
  id: string,
  meta: Meta,
  accessor: (t: Torrent) => number | string,
  render: (t: Torrent) => React.ReactNode,
): ColumnDef<Torrent> {
  return {
    id,
    accessorFn: accessor,
    meta,
    header: ({ column }) => <SortHeader column={column} label={meta.label()} align={meta.align} />,
    cell: ({ row }) => render(row.original),
    sortDescFirst: meta.align === "right",
  };
}

export function torrentColumns(opts: {
  onOpen: (hash: string) => void;
  actions: (t: Torrent) => React.ReactNode;
}): ColumnDef<Torrent>[] {
  return [
    {
      id: "select",
      meta: { width: 40 },
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? "indeterminate" : false}
          onCheckedChange={(v) => table.toggleAllRowsSelected(v === true)}
          aria-label={m.select_all()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(v === true)}
          onClick={(e) => e.stopPropagation()}
          aria-label={m.select_row({ name: row.original.name })}
        />
      ),
    },
    {
      id: "name",
      accessorFn: (t) => t.name,
      enableHiding: false,
      meta: { label: () => m.col_name() },
      sortingFn: (a, b) => a.original.name.localeCompare(b.original.name, undefined, { numeric: true }),
      header: ({ column }) => <SortHeader column={column} label={m.col_name()} />,
      cell: ({ row }) => (
        <span className="flex min-w-0 items-center gap-2">
          {row.original.category && (
            <Badge variant="outline" className="shrink-0">
              {row.original.category}
            </Badge>
          )}
          <button
            type="button"
            className="truncate text-left font-medium hover:underline focus-visible:underline focus-visible:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              opts.onOpen(row.original.hash);
            }}
            title={row.original.name}
          >
            {row.original.name}
          </button>
        </span>
      ),
    },
    {
      id: "status",
      accessorFn: (t) => statusKind(t.state),
      meta: { label: () => m.col_status(), width: 150 },
      sortingFn: sortByKind,
      filterFn: (row, _id, value: string[]) => !value?.length || value.includes(statusKind(row.original.state)),
      header: ({ column }) => <SortHeader column={column} label={m.col_status()} />,
      cell: ({ row }) => <StatusCell state={row.original.state} />,
    },
    {
      id: "progress",
      accessorFn: (t) => t.progress,
      meta: { label: () => m.col_progress(), width: 190 },
      sortDescFirst: true,
      header: ({ column }) => <SortHeader column={column} label={m.col_progress()} />,
      cell: ({ row }) => <ProgressCell progress={row.original.progress} />,
    },
    simple(
      "speed",
      { label: () => m.col_speed(), align: "right", width: 110 },
      (t) => mainSpeed(t) ?? -1,
      (t) => {
        const v = mainSpeed(t);
        return v === undefined ? dash : formatSpeed(v);
      },
    ),
    simple(
      "eta",
      { label: () => m.col_eta(), align: "right", width: 100 },
      (t) => (t.eta > 0 && t.eta < 8640000 ? t.eta : Number.MAX_SAFE_INTEGER),
      (t) => <span className="text-muted-foreground">{formatEta(t.eta)}</span>,
    ),
    simple(
      "ratio",
      { label: () => m.col_ratio(), align: "right", width: 80 },
      (t) => t.ratio,
      (t) => formatRatio(t.ratio),
    ),
    simple(
      "size",
      { label: () => m.col_size(), align: "right", width: 100 },
      (t) => t.size,
      (t) => formatBytes(t.size),
    ),
    simple(
      "completed",
      { label: () => m.col_completed(), align: "right", width: 100 },
      (t) => t.completed,
      (t) => formatBytes(t.completed),
    ),
    simple(
      "dlspeed",
      { label: () => m.col_dlspeed(), align: "right", width: 110 },
      (t) => t.dlspeed,
      (t) => formatSpeed(t.dlspeed),
    ),
    simple(
      "upspeed",
      { label: () => m.col_upspeed(), align: "right", width: 110 },
      (t) => t.upspeed,
      (t) => formatSpeed(t.upspeed),
    ),
    simple(
      "seeds",
      { label: () => m.col_seeds(), align: "right", width: 110 },
      (t) => t.num_seeds,
      (t) => (
        <span>
          {formatNumber(t.num_seeds)}{" "}
          <span className="text-muted-foreground">({formatNumber(Math.max(0, t.num_complete))})</span>
        </span>
      ),
    ),
    simple(
      "peers",
      { label: () => m.col_peers(), align: "right", width: 110 },
      (t) => t.num_leechs,
      (t) => (
        <span>
          {formatNumber(t.num_leechs)}{" "}
          <span className="text-muted-foreground">({formatNumber(Math.max(0, t.num_incomplete))})</span>
        </span>
      ),
    ),
    simple(
      "category",
      { label: () => m.col_category(), width: 120 },
      (t) => t.category,
      (t) => t.category || dash,
    ),
    simple(
      "tags",
      { label: () => m.col_tags(), width: 160 },
      (t) => t.tags,
      (t) => (
        <span className="flex gap-1">
          {torrentTags(t).map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </span>
      ),
    ),
    simple(
      "added_on",
      { label: () => m.col_added_on(), width: 150 },
      (t) => t.added_on,
      (t) => formatDate(t.added_on),
    ),
    simple(
      "completion_on",
      { label: () => m.col_completion_on(), width: 150 },
      (t) => t.completion_on,
      (t) => formatDate(t.completion_on),
    ),
    simple(
      "save_path",
      { label: () => m.col_save_path(), width: 200 },
      (t) => t.save_path,
      (t) => <span className="font-mono text-xs">{t.save_path}</span>,
    ),
    simple(
      "tracker",
      { label: () => m.col_tracker(), width: 200 },
      (t) => t.tracker,
      (t) => <span className="truncate font-mono text-xs">{t.tracker || "–"}</span>,
    ),
    simple(
      "downloaded",
      { label: () => m.col_downloaded(), align: "right", width: 110 },
      (t) => t.downloaded,
      (t) => formatBytes(t.downloaded),
    ),
    simple(
      "uploaded",
      { label: () => m.col_uploaded(), align: "right", width: 110 },
      (t) => t.uploaded,
      (t) => formatBytes(t.uploaded),
    ),
    simple(
      "availability",
      { label: () => m.col_availability(), align: "right", width: 100 },
      (t) => t.availability,
      (t) => (t.availability < 0 ? dash : formatRatio(t.availability)),
    ),
    simple(
      "priority",
      { label: () => m.col_queue(), align: "right", width: 90 },
      (t) => (t.priority > 0 ? t.priority : Number.MAX_SAFE_INTEGER),
      (t) => (t.priority > 0 ? t.priority : dash),
    ),
    simple(
      "time_active",
      { label: () => m.col_time_active(), align: "right", width: 110 },
      (t) => t.time_active,
      (t) => formatDuration(t.time_active),
    ),
    simple(
      "dl_limit",
      { label: () => m.col_dl_limit(), align: "right", width: 110 },
      (t) => t.dl_limit,
      (t) => formatLimit(t.dl_limit),
    ),
    simple(
      "up_limit",
      { label: () => m.col_up_limit(), align: "right", width: 110 },
      (t) => t.up_limit,
      (t) => formatLimit(t.up_limit),
    ),
    simple(
      "last_activity",
      { label: () => m.col_last_activity(), width: 150 },
      (t) => t.last_activity,
      (t) => formatDate(t.last_activity),
    ),
    {
      id: "actions",
      meta: { width: 48 },
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="sr-only">{m.actions()}</span>,
      cell: ({ row }) => opts.actions(row.original),
    },
  ];
}
