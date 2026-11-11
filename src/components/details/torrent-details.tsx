import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  ChevronLeftIcon,
  CirclePauseIcon,
  CirclePlayIcon,
  EllipsisIcon,
  FolderIcon,
  FolderInputIcon,
  Trash2Icon,
} from "lucide-react";
import { useMaindata } from "@/api/queries";
import type { Torrent } from "@/api/schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatBytes, formatDate, formatEta, formatPercent, formatSpeed, percentValue } from "@/lib/format";
import { kindLabel } from "@/lib/labels";
import { isStopped, statusKind } from "@/lib/torrents";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages.js";
import { type DetailTab, Route } from "@/routes/torrents";
import { statusIcon } from "../torrents/columns";
import { dropdownKit, TorrentMenuItems, torrentDialogStore, useTorrentActions } from "../torrents/torrent-actions";
import { FilesTab } from "./files-tab";
import { OverviewTab } from "./overview-tab";
import { PeersTab } from "./peers-tab";
import { TrackersTab } from "./trackers-tab";

function subtitle(t: Torrent): string {
  const added = m.added_on({ date: formatDate(t.added_on) });
  return t.category ? `${t.category} · ${added}` : added;
}

function StatusBadge({ t }: { t: Torrent }) {
  const kind = statusKind(t.state);
  const Icon = statusIcon[kind];
  const bad = kind === "error" || kind === "missing";
  return (
    <Badge variant="secondary" className={cn(bad && "text-destructive")}>
      <Icon aria-hidden />
      {kindLabel(kind)}
    </Badge>
  );
}

/** Start/stop, set location, more, remove (docs/mockup/Details.dc.html). */
function DetailActions({ t, phone }: { t: Torrent; phone?: boolean }) {
  const actions = useTorrentActions();
  const stopped = isStopped(t);
  return (
    <div className={cn("flex gap-2", phone && "grid grid-cols-[1fr_1fr_44px]")}>
      {stopped ? (
        <Button variant="outline" size={phone ? "lg" : "sm"} onClick={() => actions.start([t.hash])}>
          <CirclePlayIcon /> {m.action_start()}
        </Button>
      ) : (
        <Button variant="outline" size={phone ? "lg" : "sm"} onClick={() => actions.stop([t.hash])}>
          <CirclePauseIcon /> {m.action_stop()}
        </Button>
      )}
      <Button
        variant="outline"
        size={phone ? "lg" : "sm"}
        onClick={() => torrentDialogStore.set({ kind: "location", hashes: [t.hash] })}
      >
        {phone ? <FolderIcon /> : <FolderInputIcon />} {m.save_location()}
      </Button>
      {!phone && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label={m.more_actions()}>
              <EllipsisIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <TorrentMenuItems kit={dropdownKit} torrents={[t]} />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <Button
        variant="outline"
        size={phone ? "icon-lg" : "icon-sm"}
        className={cn("text-destructive hover:text-destructive", !phone && "ml-auto", phone && "h-10 w-11")}
        aria-label={m.action_remove()}
        onClick={() => torrentDialogStore.set({ kind: "remove", hashes: [t.hash] })}
      >
        <Trash2Icon />
      </Button>
    </div>
  );
}

function DetailTabs({ t, tab, onTab }: { t: Torrent; tab: DetailTab; onTab: (tab: DetailTab) => void }) {
  return (
    <Tabs value={tab} onValueChange={(v) => onTab(v as DetailTab)} className="gap-4">
      <TabsList className="w-full">
        <TabsTrigger value="overview">{m.tab_overview()}</TabsTrigger>
        <TabsTrigger value="files">{m.tab_files()}</TabsTrigger>
        <TabsTrigger value="peers">{m.tab_peers()}</TabsTrigger>
        <TabsTrigger value="trackers">{m.tab_trackers()}</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <OverviewTab t={t} />
      </TabsContent>
      <TabsContent value="files">
        <FilesTab t={t} />
      </TabsContent>
      <TabsContent value="peers">
        <PeersTab t={t} />
      </TabsContent>
      <TabsContent value="trackers">
        <TrackersTab t={t} />
      </TabsContent>
    </Tabs>
  );
}

/**
 * The details of one torrent: a sheet from the right on the desktop, a full screen on
 * the phone (docs/mockup/Details.dc.html, PhoneDetail.dc.html). Open while `?torrent=`
 * is set; the detail queries poll only then.
 */
export function TorrentDetails({ hash }: { hash: string | undefined }) {
  const { data } = useMaindata();
  const search = useSearch({ from: Route.id });
  const navigate = useNavigate({ from: Route.fullPath });
  const isMobile = useIsMobile();
  const t = hash ? data?.torrents[hash] : undefined;
  const tab = search.tab ?? "overview";
  const close = () => navigate({ search: (prev) => ({ ...prev, torrent: undefined, tab: undefined }) });
  const onTab = (next: DetailTab) =>
    navigate({ search: (prev) => ({ ...prev, tab: next === "overview" ? undefined : next }), replace: true });

  if (isMobile) {
    if (!t) return null;
    const speeds = `↓ ${formatSpeed(t.dlspeed)} · ↑ ${formatSpeed(t.upspeed)}`;
    return (
      <div
        className="fixed inset-0 z-30 flex flex-col overflow-y-auto bg-background pb-[calc(80px+env(safe-area-inset-bottom))]"
        role="dialog"
        aria-label={t.name}
      >
        <header className="sticky top-0 z-10 flex items-center gap-1 bg-background px-2 pt-3 pb-1">
          <Button variant="ghost" size="icon" className="size-11" aria-label={m.back()} onClick={close}>
            <ChevronLeftIcon className="size-5" />
          </Button>
          <span className="flex-1 font-medium">{m.details()}</span>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11" aria-label={m.more_actions()}>
                <EllipsisIcon className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <TorrentMenuItems kit={dropdownKit} torrents={[t]} />
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="flex flex-col gap-5 px-4 pt-2 pb-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="break-all font-semibold text-xl tracking-tight">{t.name}</h1>
            <span className="text-muted-foreground">{subtitle(t)}</span>
          </div>
          <div className="flex flex-col gap-2.5 tabular-nums">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-[32px] tracking-tight">{formatPercent(t.progress)}</span>
              <span className="text-muted-foreground">
                {t.progress < 1 && formatEta(t.eta) !== "–" ? (
                  m.eta_left({ eta: formatEta(t.eta) })
                ) : (
                  <StatusBadge t={t} />
                )}
              </span>
            </div>
            <Progress value={percentValue(t.progress)} className="h-1.5" aria-label={m.col_progress()} />
            <div className="flex justify-between text-[13px]">
              <span className="text-muted-foreground">
                {m.size_of({ done: formatBytes(t.completed), total: formatBytes(t.size) })}
              </span>
              <span>{speeds}</span>
            </div>
          </div>
          <DetailActions t={t} phone />
          <DetailTabs t={t} tab={tab} onTab={onTab} />
        </div>
      </div>
    );
  }

  return (
    <Sheet open={!!hash} onOpenChange={(open) => !open && close()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-[480px]" data-testid="details-sheet">
        {t ? (
          <>
            <SheetHeader className="gap-1.5 pr-12 pb-0">
              <SheetTitle className="break-all">{t.name}</SheetTitle>
              <SheetDescription>{subtitle(t)}</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <StatusBadge t={t} />
                  {t.progress < 1 && formatEta(t.eta) !== "–" && (
                    <span className="text-muted-foreground tabular-nums">{m.eta_left({ eta: formatEta(t.eta) })}</span>
                  )}
                </div>
                <Progress value={percentValue(t.progress)} className="h-1.5" aria-label={m.col_progress()} />
                <div className="flex justify-between text-[13px] tabular-nums">
                  <span className="text-muted-foreground">
                    {m.size_of({ done: formatBytes(t.completed), total: formatBytes(t.size) })}
                  </span>
                  <span className="font-medium">{formatPercent(t.progress)}</span>
                </div>
              </div>
              <DetailActions t={t} />
              <DetailTabs t={t} tab={tab} onTab={onTab} />
            </div>
          </>
        ) : (
          <SheetHeader>
            <SheetTitle>{m.details()}</SheetTitle>
            <SheetDescription>{m.torrent_gone()}</SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}
