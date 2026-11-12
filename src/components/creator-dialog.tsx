import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRightIcon, DownloadIcon, LoaderCircleIcon, Trash2Icon } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { api, type CreateTorrentOptions } from "@/api/client";
import { useRunAction } from "@/api/queries";
import type { CreatorTask } from "@/api/schemas";
import { PathInput } from "@/components/path-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { baseName, formatPieceSize, hasV2, pieceSizes, urlLines } from "@/lib/creator";
import { formatDate } from "@/lib/format";
import { systemStore } from "@/lib/system";
import { m } from "@/paraglide/messages.js";

const tasksKey = ["creatorTasks"];

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

function statusLabel(task: CreatorTask): string {
  switch (task.status) {
    case "Queued":
      return m.creator_queued();
    case "Running":
      return m.creator_running();
    case "Finished":
      return m.creator_finished();
    case "Failed":
      return m.creator_failed();
  }
}

function TaskList({ tasks }: { tasks: CreatorTask[] }) {
  const run = useRunAction();
  if (!tasks.length) return <p className="py-8 text-center text-muted-foreground text-sm">{m.creator_no_tasks()}</p>;
  return (
    <ul className="flex flex-col divide-y rounded-lg border text-sm" data-testid="creator-tasks">
      {[...tasks].reverse().map((task) => (
        <li key={task.taskID} className="flex flex-col gap-2 px-3 py-2.5">
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-2">
                <span className="truncate font-medium">{baseName(task.sourcePath)}</span>
                <Badge variant={task.status === "Failed" ? "destructive" : "secondary"}>{statusLabel(task)}</Badge>
              </span>
              <span className="truncate font-mono text-muted-foreground text-xs">{task.sourcePath}</span>
            </div>
            {task.status === "Finished" && (
              <Button variant="outline" size="sm" asChild>
                <a href={api.creatorFileUrl(task.taskID)} download={`${baseName(task.sourcePath)}.torrent`}>
                  <DownloadIcon /> .torrent
                </a>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={m.delete_name({ name: baseName(task.sourcePath) })}
              onClick={() => run(() => api.deleteCreatorTask(task.taskID), { invalidate: [tasksKey] })}
            >
              <Trash2Icon className="text-muted-foreground" />
            </Button>
          </div>
          {task.status === "Running" && (
            <div className="flex items-center gap-3">
              <Progress value={task.progress ?? 0} className="h-1.5" aria-label={m.creator_running()} />
              <span className="w-10 text-right text-muted-foreground text-xs tabular-nums">
                {Math.round(task.progress ?? 0)} %
              </span>
            </div>
          )}
          {task.status === "Finished" && (
            <span className="text-muted-foreground text-xs">
              {[
                task.pieceSize ? m.creator_piece_info({ size: formatPieceSize(task.pieceSize) }) : "",
                task.timeFinished ? formatDate(task.timeFinished) : "",
                task.torrentFilePath ? task.torrentFilePath : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
          {task.status === "Failed" && task.errorMessage && (
            <span className="text-destructive text-xs">{task.errorMessage}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * "Torrent erstellen" (torrentcreator/addTask, status, torrentFile, deleteTask): qBittorrent reads
 * the files on its machine and makes the .torrent. Fields as in www/private/views/createtorrent.html.
 */
export function CreatorDialog() {
  const open = systemStore.use().creator;
  const close = () => systemStore.set((s) => ({ ...s, creator: false }));
  const [tab, setTab] = useState<"new" | "tasks">("new");
  const [sourcePath, setSourcePath] = useState("");
  const [trackers, setTrackers] = useState("");
  const [urlSeeds, setUrlSeeds] = useState("");
  const [comment, setComment] = useState("");
  const [source, setSource] = useState("");
  const [torrentFilePath, setTorrentFilePath] = useState("");
  const [isPrivate, setPrivate] = useState(false);
  const [startSeeding, setStartSeeding] = useState(true);
  const [ignoreDotfiles, setIgnoreDotfiles] = useState(true);
  const [pieceSize, setPieceSize] = useState(0);
  const [format, setFormat] = useState<"hybrid" | "v1" | "v2">("hybrid");
  const [optimizeAlignment, setOptimizeAlignment] = useState(true);
  const [busy, setBusy] = useState(false);
  const run = useRunAction();
  const queryClient = useQueryClient();
  const build = useQuery({ queryKey: ["buildInfo"], queryFn: api.buildInfo, staleTime: Infinity, enabled: open });
  const v2 = hasV2(build.data?.libtorrent);
  const tasks = useQuery({
    queryKey: tasksKey,
    queryFn: api.creatorTasks,
    enabled: open,
    // quick while something is being made
    refetchInterval: (q) => (q.state.data?.some((t) => t.status === "Queued" || t.status === "Running") ? 1000 : 5000),
  });
  const list = tasks.data ?? [];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!sourcePath.trim()) return;
    setBusy(true);
    const options: CreateTorrentOptions = {
      sourcePath: sourcePath.trim(),
      pieceSize,
      private: isPrivate,
      ignoreDotfiles,
      startSeeding,
      trackers: urlLines(trackers),
      urlSeeds: urlLines(urlSeeds).filter(Boolean),
      comment: comment.trim() || undefined,
      source: source.trim() || undefined,
      torrentFilePath: torrentFilePath.trim() || undefined,
      ...(v2 ? { format } : { optimizeAlignment }),
    };
    const id = await run(() => api.createTorrent(options), { success: m.toast_creator_started() });
    setBusy(false);
    if (id === undefined) return;
    await queryClient.invalidateQueries({ queryKey: tasksKey });
    setTab("tasks");
  };

  const running = list.filter((t) => t.status === "Queued" || t.status === "Running").length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-[560px]"
        data-testid="creator-dialog"
      >
        <DialogHeader>
          <DialogTitle>{m.creator_title()}</DialogTitle>
          <DialogDescription>{m.creator_text()}</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "new" | "tasks")}>
          <TabsList className="w-full">
            <TabsTrigger value="new">{m.creator_new()}</TabsTrigger>
            <TabsTrigger value="tasks">
              {m.creator_tasks()}
              {list.length > 0 && (
                <span className="text-muted-foreground tabular-nums">
                  {running ? `${running}/${list.length}` : list.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "tasks" ? (
          <>
            <TaskList tasks={list} />
            <DialogFooter>
              <Button variant="outline" onClick={close}>
                {m.close()}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="creator-source">{m.creator_source()}</Label>
              <PathInput
                files
                id="creator-source"
                value={sourcePath}
                onChange={(e) => setSourcePath(e.target.value)}
                placeholder="/downloads/…"
                className="font-mono text-[13px]"
                autoComplete="off"
              />
              <span className="text-[13px] text-muted-foreground">{m.creator_source_hint()}</span>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="creator-trackers">{m.creator_trackers()}</Label>
              <Textarea
                id="creator-trackers"
                value={trackers}
                onChange={(e) => setTrackers(e.target.value)}
                placeholder="udp://tracker.example.org:1337/announce"
                className="min-h-16 break-all font-mono text-[13px]"
              />
              <span className="text-[13px] text-muted-foreground">{m.creator_trackers_hint()}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              <Check checked={isPrivate} onChange={setPrivate} label={m.creator_private()} />
              <Check checked={startSeeding} onChange={setStartSeeding} label={m.creator_start_seeding()} />
            </div>

            <Collapsible className="group/more flex flex-col gap-4">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto self-start p-0 text-muted-foreground hover:no-underline has-[>svg]:px-0"
                >
                  <ChevronRightIcon className="transition-transform group-data-[state=open]/more:rotate-90" />
                  {m.add_more_options()}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="creator-piece">{m.creator_piece_size()}</Label>
                    <Select value={String(pieceSize)} onValueChange={(v) => setPieceSize(Number(v))}>
                      <SelectTrigger id="creator-piece" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pieceSizes.map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size ? formatPieceSize(size) : m.creator_auto()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {v2 && (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="creator-format">{m.creator_format()}</Label>
                      <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
                        <SelectTrigger id="creator-format" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hybrid">{m.creator_hybrid()}</SelectItem>
                          <SelectItem value="v1">v1</SelectItem>
                          <SelectItem value="v2">v2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2.5">
                  <Check checked={ignoreDotfiles} onChange={setIgnoreDotfiles} label={m.creator_ignore_dotfiles()} />
                  {!v2 && (
                    <Check checked={optimizeAlignment} onChange={setOptimizeAlignment} label={m.creator_alignment()} />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="creator-seeds">{m.creator_web_seeds()}</Label>
                  <Textarea
                    id="creator-seeds"
                    value={urlSeeds}
                    onChange={(e) => setUrlSeeds(e.target.value)}
                    className="min-h-14 break-all font-mono text-[13px]"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="creator-comment">{m.creator_comment()}</Label>
                    <Input id="creator-comment" value={comment} onChange={(e) => setComment(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="creator-source-field">{m.creator_source_field()}</Label>
                    <Input id="creator-source-field" value={source} onChange={(e) => setSource(e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="creator-save">{m.creator_save_to()}</Label>
                  <PathInput
                    id="creator-save"
                    value={torrentFilePath}
                    onChange={(e) => setTorrentFilePath(e.target.value)}
                    placeholder="/downloads/urlaub.torrent"
                    className="font-mono text-[13px]"
                  />
                  <span className="text-[13px] text-muted-foreground">{m.creator_save_to_hint()}</span>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" onClick={close}>
                {m.cancel()}
              </Button>
              <Button type="submit" disabled={!sourcePath.trim() || busy}>
                {busy && <LoaderCircleIcon className="animate-spin" />}
                {m.creator_create()}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
