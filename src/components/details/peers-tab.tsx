import { PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/api/client";
import type { Peer } from "@/api/maindata";
import { usePeers, useRunAction } from "@/api/queries";
import type { Torrent } from "@/api/schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { copyText } from "@/lib/clipboard";
import { formatPercent, formatSpeed, percentValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages.js";
import { InputDialog, type InputDialogState } from "./input-dialog";

const address = (p: Peer) => (p.ip.includes(":") ? `[${p.ip}]:${p.port}` : `${p.ip}:${p.port}`);

/** Tab "Peers" (Peers.dc.html): sync/torrentPeers, add peers, ban, copy IP:port. */
export function PeersTab({ t }: { t: Torrent }) {
  const { data, isPending } = usePeers(t.hash);
  const run = useRunAction();
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<InputDialogState | null>(null);

  const peers = useMemo(
    () => Object.values(data?.peers ?? {}).sort((a, b) => b.dl_speed + b.up_speed - (a.dl_speed + a.up_speed)),
    [data?.peers],
  );
  const current = selected ? data?.peers[selected] : undefined;

  if (isPending) return <Skeleton className="h-48 w-full" />;

  const addPeers = () =>
    setDialog({
      title: m.peers_add_title(),
      description: m.peers_add_text(),
      label: m.peers_add_label(),
      multiline: true,
      submit: m.add(),
      onSubmit: (value) =>
        run(() => api.addPeers([t.hash], value.split(/\s+/).filter(Boolean)), { success: m.toast_peers_added() }),
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2 tabular-nums">
        {(
          [
            [m.peers_connected(), peers.length],
            [m.peers_seeds(), peers.filter((p) => p.progress >= 1).length],
            [m.peers_incoming(), peers.filter((p) => p.flags?.includes("I")).length],
          ] as const
        ).map(([label, n]) => (
          <div key={label} className="flex flex-col gap-0.5 rounded-lg border p-3 shadow-xs">
            <span className="text-[13px] text-muted-foreground">{label}</span>
            <span className="font-semibold text-lg">{n}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted-foreground">{m.peers_sorted()}</span>
        <Button variant="outline" size="sm" onClick={addPeers}>
          <PlusIcon /> {m.peers_add()}
        </Button>
      </div>

      <div className="border-t" role="listbox" aria-label={m.tab_peers()}>
        {peers.length === 0 && <p className="py-8 text-center text-muted-foreground text-sm">{m.peers_none()}</p>}
        {peers.map((p) => (
          <div
            key={p.key}
            role="option"
            tabIndex={0}
            aria-selected={selected === p.key}
            onClick={() => setSelected(selected === p.key ? null : p.key)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(selected === p.key ? null : p.key)}
            className={cn(
              "grid cursor-default grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 border-b px-2 py-2.5 text-sm outline-none hover:bg-muted/50 focus-visible:bg-muted/50",
              selected === p.key && "bg-muted hover:bg-muted",
            )}
          >
            <Badge variant="outline" className="justify-center px-1 uppercase" title={p.country}>
              {p.country_code || "–"}
            </Badge>
            <span className="flex min-w-0 flex-col gap-1.5">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">{p.client || "–"}</span>
                <span className="font-mono text-muted-foreground text-xs" title={p.flags_desc}>
                  {p.flags}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground text-xs">{p.ip}</span>
                <Progress value={percentValue(p.progress)} className="h-1.5 flex-1" aria-label={m.col_progress()} />
                <span className="w-9 text-right text-muted-foreground text-xs tabular-nums">
                  {formatPercent(p.progress)}
                </span>
              </span>
            </span>
            <span className="flex flex-col items-end gap-0.5 text-[13px] tabular-nums">
              <span>↓ {formatSpeed(p.dl_speed)}</span>
              <span className="text-muted-foreground">↑ {formatSpeed(p.up_speed)}</span>
            </span>
          </div>
        ))}
      </div>

      {current && (
        <div className="flex items-center gap-2 rounded-lg border py-2 pr-2 pl-3 text-sm">
          <span className="min-w-0 flex-1 truncate">
            <span className="text-muted-foreground">{m.peers_selected()}</span>{" "}
            <span className="font-mono">{address(current)}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={async () =>
              (await copyText(address(current))) ? toast.success(m.toast_copied()) : toast.error(m.toast_copy_failed())
            }
          >
            {m.copy()}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              setSelected(null);
              void run(() => api.banPeers([`${current.ip}:${current.port}`]), {
                success: m.toast_peer_banned(),
                invalidate: [["peers", t.hash]],
              });
            }}
          >
            {m.peers_ban()}
          </Button>
        </div>
      )}
      <p className="text-[13px] text-muted-foreground">{m.peers_flags()}</p>
      <InputDialog state={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}
