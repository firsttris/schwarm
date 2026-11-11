import type { Table } from "@tanstack/react-table";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import type { Torrent } from "@/api/schemas";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Progress } from "@/components/ui/progress";
import { formatBytes, formatEta, formatPercent, formatRatio, formatSpeed, percentValue } from "@/lib/format";
import { kindLabel } from "@/lib/labels";
import { statusKind } from "@/lib/torrents";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages.js";
import { mainSpeed } from "./columns";
import { contextKit, TorrentMenuItems } from "./torrent-actions";

function statusLine(t: Torrent): { text: string; right: string; bad: boolean } {
  const kind = statusKind(t.state);
  const speed = mainSpeed(t);
  const label = kindLabel(kind);
  const bad = kind === "error" || kind === "missing";
  if (bad) return { text: label, right: "", bad };
  const text =
    speed !== undefined && (kind === "downloading" || kind === "seeding") ? `${label} · ${formatSpeed(speed)}` : label;
  const right =
    kind === "downloading" || kind === "stalled" || kind === "metadata"
      ? t.eta > 0 && t.eta < 8640000
        ? m.eta_left({ eta: formatEta(t.eta) })
        : ""
      : kind === "seeding"
        ? m.ratio_value({ ratio: formatRatio(t.ratio) })
        : formatBytes(t.size);
  return { text, right, bad };
}

/** The phone list (docs/mockup/PhoneListe.dc.html): tap opens the details, long press the actions. */
export function PhoneList({ table, onOpen }: { table: Table<Torrent>; onOpen: (hash: string) => void }) {
  const rows = table.getPrePaginationRowModel().rows;
  const listRef = useRef<HTMLDivElement>(null);
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 89,
    overscan: 8,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });
  const items = virtualizer.getVirtualItems();

  if (!rows.length) {
    return <p className="border-t px-4 py-12 text-center text-muted-foreground">{m.no_torrents()}</p>;
  }

  return (
    <div
      ref={listRef}
      className="relative border-t"
      style={{ height: virtualizer.getTotalSize() }}
      data-testid="phone-list"
    >
      {items.map((item) => {
        const t = rows[item.index]!.original;
        const line = statusLine(t);
        return (
          <ContextMenu key={t.hash}>
            <ContextMenuTrigger asChild>
              <button
                type="button"
                ref={virtualizer.measureElement}
                data-index={item.index}
                onClick={() => onOpen(t.hash)}
                className="absolute inset-x-0 flex flex-col gap-2 border-b px-4 py-3 text-left active:bg-muted [-webkit-touch-callout:none] [user-select:none]"
                style={{ transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)` }}
                data-testid="phone-row"
              >
                <span className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                  <span className="font-medium text-[13px] tabular-nums">{formatPercent(t.progress)}</span>
                </span>
                <Progress value={percentValue(t.progress)} className="h-1.5" aria-hidden />
                <span className="flex justify-between gap-3 text-[13px] tabular-nums">
                  <span className={cn("truncate", line.bad ? "text-destructive" : "text-muted-foreground")}>
                    {line.text}
                  </span>
                  <span className="shrink-0 text-muted-foreground">{line.right}</span>
                </span>
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64">
              <TorrentMenuItems kit={contextKit} torrents={[t]} />
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
}
