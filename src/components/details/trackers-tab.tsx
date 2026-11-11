import { EllipsisIcon, PlusIcon, RotateCwIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { useRunAction, useTrackers } from "@/api/queries";
import { type Torrent, type Tracker, TrackerStatus } from "@/api/schemas";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { copyText } from "@/lib/clipboard";
import { formatDuration, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages.js";
import { InputDialog, type InputDialogState } from "./input-dialog";

function statusText(status: number): { label: string; tone: "ok" | "bad" | "muted" } {
  switch (status) {
    case TrackerStatus.Working:
      return { label: m.tracker_working(), tone: "ok" };
    case TrackerStatus.Updating:
      return { label: m.tracker_updating(), tone: "muted" };
    case TrackerStatus.NotContacted:
      return { label: m.tracker_not_contacted(), tone: "muted" };
    case TrackerStatus.Disabled:
      return { label: m.tracker_disabled(), tone: "muted" };
    default:
      return { label: m.tracker_failed(), tone: "bad" };
  }
}

const count = (n: number) => (n < 0 ? "–" : formatNumber(n));

async function copy(value: string) {
  if (await copyText(value)) toast.success(m.toast_copied());
  else toast.error(m.toast_copy_failed());
}

/** Tab "Tracker" incl. DHT/PeX/LSD and HTTP sources (Tracker.dc.html). */
export function TrackersTab({ t }: { t: Torrent }) {
  const { data, isPending } = useTrackers(t.hash);
  const run = useRunAction();
  const [dialog, setDialog] = useState<InputDialogState | null>(null);
  const key = [["trackers", t.hash]];

  if (isPending) return <Skeleton className="h-48 w-full" />;

  const all = data?.trackers ?? [];
  const sticky = all.filter((tr) => tr.tier < 0);
  const trackers = all.filter((tr) => tr.tier >= 0);
  const webseeds = data?.webseeds ?? [];
  const now = Date.now() / 1000;

  const addTrackers = () =>
    setDialog({
      title: m.trackers_add_title(),
      description: m.trackers_add_text(),
      label: m.trackers_add_label(),
      multiline: true,
      submit: m.add(),
      onSubmit: (value) => run(() => api.addTrackers(t.hash, value.split("\n")), { invalidate: key }),
    });
  const editTracker = (tr: Tracker) =>
    setDialog({
      title: m.trackers_edit_title(),
      label: m.url(),
      initial: tr.url,
      submit: m.save(),
      onSubmit: (value) => run(() => api.editTracker(t.hash, tr.url, value), { invalidate: key }),
    });
  const addWebSeed = () =>
    setDialog({
      title: m.webseeds_add_title(),
      description: m.webseeds_add_text(),
      label: m.url(),
      submit: m.add(),
      onSubmit: (value) => run(() => api.addWebSeeds(t.hash, [value]), { invalidate: key }),
    });
  const editWebSeed = (url: string) =>
    setDialog({
      title: m.webseeds_edit_title(),
      label: m.url(),
      initial: url,
      submit: m.save(),
      onSubmit: (value) => run(() => api.editWebSeed(t.hash, url, value), { invalidate: key }),
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={addTrackers}>
          <PlusIcon /> {m.trackers_add()}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => run(() => api.reannounce([t.hash]), { success: m.toast_reannounce() })}
        >
          <RotateCwIcon /> {m.trackers_reannounce_all()}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {trackers.length === 0 && <p className="text-muted-foreground text-sm">{m.trackers_none()}</p>}
        {trackers.map((tr) => {
          const st = statusText(tr.status);
          const next = tr.next_announce ? tr.next_announce - now : 0;
          return (
            <div
              key={tr.url}
              className="flex flex-col gap-1.5 rounded-lg border p-3 shadow-xs"
              data-testid="tracker-card"
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-mono text-[13px]" title={tr.url}>
                  {tr.url}
                </span>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="size-7"
                      aria-label={m.actions_for({ name: tr.url })}
                    >
                      <EllipsisIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => editTracker(tr)}>{m.edit()}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => copy(tr.url)}>{m.copy_url()}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => run(() => api.removeTrackers(t.hash, [tr.url]), { invalidate: key })}
                    >
                      {m.remove()}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] tabular-nums">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5",
                    st.tone === "ok" && "text-success",
                    st.tone === "bad" && "text-destructive",
                    st.tone === "muted" && "text-muted-foreground",
                  )}
                >
                  <span className="size-1.5 rounded-full bg-current" aria-hidden />
                  {st.label}
                </span>
                <span className="text-muted-foreground">{m.tracker_tier({ tier: tr.tier })}</span>
                <span className="text-muted-foreground">
                  {m.tracker_counts({ seeds: count(tr.num_seeds), peers: count(tr.num_leeches) })}
                </span>
                {next > 0 && (
                  <span className="text-muted-foreground">{m.tracker_next({ time: formatDuration(next) })}</span>
                )}
              </div>
              {tr.msg && (
                <span className={cn("text-[13px]", st.tone === "bad" ? "text-destructive" : "text-muted-foreground")}>
                  {tr.msg}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {sticky.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-medium text-sm">{m.trackers_other_sources()}</span>
          <div className="grid grid-cols-3 gap-2 tabular-nums">
            {sticky.map((tr) => {
              const name = tr.url.replace(/\*|\[|\]/g, "").trim();
              return (
                <div
                  key={tr.url}
                  className="flex flex-col gap-0.5 rounded-lg border p-3 shadow-xs"
                  title={tr.msg || undefined}
                >
                  <span className="text-[13px] text-muted-foreground">{name}</span>
                  <span className="font-semibold text-sm">
                    {tr.status === TrackerStatus.Disabled ? m.off() : m.n_peers({ n: tr.num_seeds + tr.num_leeches })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">{m.webseeds()}</span>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={addWebSeed}>
            {m.add()}
          </Button>
        </div>
        {webseeds.length === 0 && <p className="text-muted-foreground text-sm">{m.webseeds_none()}</p>}
        {webseeds.map(({ url }) => (
          <div key={url} className="flex items-center gap-2 rounded-lg border p-3 shadow-xs">
            <span className="min-w-0 flex-1 truncate font-mono text-[13px]" title={url}>
              {url}
            </span>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" className="size-7" aria-label={m.actions_for({ name: url })}>
                  <EllipsisIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => editWebSeed(url)}>{m.edit()}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => copy(url)}>{m.copy_url()}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => run(() => api.removeWebSeeds(t.hash, [url]), { invalidate: key })}
                >
                  {m.remove()}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
      <InputDialog state={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}
