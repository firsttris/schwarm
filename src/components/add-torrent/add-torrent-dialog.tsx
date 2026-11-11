import { useQuery } from "@tanstack/react-query";
import {
  ChevronRightIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  FileIcon,
  LoaderCircleIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { api, type ContentLayout, type StopCondition } from "@/api/client";
import { useDefaultSavePath, useMaindata, useRunAction } from "@/api/queries";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { addDialogStore } from "@/lib/add-dialog";
import { formatBytes } from "@/lib/format";
import { m } from "@/paraglide/messages.js";
import { FilePicker } from "./file-picker";

const NONE = "\u0000none";
const DEFAULT = "\u0000default";

/** Name and hash from a magnet link, for the preview below the field. */
export function parseMagnet(link: string): { name?: string; hash?: string } | undefined {
  const trimmed = link.trim();
  if (/^[0-9a-f]{40}$/i.test(trimmed)) return { hash: trimmed.toLowerCase() };
  if (!trimmed.startsWith("magnet:?")) return undefined;
  const params = new URLSearchParams(trimmed.slice("magnet:?".length));
  const xt = params.getAll("xt").find((v) => v.startsWith("urn:btih:") || v.startsWith("urn:btmh:"));
  return { name: params.get("dn") ?? undefined, hash: xt?.split(":").pop()?.toLowerCase() };
}

function CheckField({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <Label htmlFor={id}>{label}</Label>
      {hint && <span className="text-[13px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

/**
 * "Torrent hinzufügen" (docs/mockup/Hinzufuegen.dc.html): links or files, category, path,
 * start, sequential, and the rest under "Weitere Optionen". Parameters of torrents/add:
 * addAction in src/webui/api/torrentscontroller.cpp.
 */
export function AddTorrentDialog() {
  const state = addDialogStore.use();
  const { data } = useMaindata();
  const defaultPath = useDefaultSavePath();
  const run = useRunAction();
  const fileInput = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"link" | "file">("link");
  const [links, setLinks] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState(NONE);
  const [savePath, setSavePath] = useState("");
  const [pathTouched, setPathTouched] = useState(false);
  const [start, setStart] = useState(true);
  const [sequential, setSequential] = useState(false);
  const [tags, setTags] = useState("");
  const [rename, setRename] = useState("");
  const [useDownloadPath, setUseDownloadPath] = useState(false);
  const [downloadPath, setDownloadPath] = useState("");
  const [autoTmm, setAutoTmm] = useState(DEFAULT);
  const [layout, setLayout] = useState<ContentLayout | typeof DEFAULT>(DEFAULT);
  const [stopCondition, setStopCondition] = useState<StopCondition>("None");
  const [topOfQueue, setTopOfQueue] = useState(false);
  const [skipCheck, setSkipCheck] = useState(false);
  const [firstLast, setFirstLast] = useState(false);
  const [dlLimit, setDlLimit] = useState("");
  const [upLimit, setUpLimit] = useState("");
  const [busy, setBusy] = useState(false);

  const categories = Object.values(data?.categories ?? {}).sort((a, b) => a.name.localeCompare(b.name));

  // Reset the form whenever the dialog opens
  useEffect(() => {
    if (!state.open) return;
    setTab(state.files.length ? "file" : "link");
    setLinks(state.links);
    setFiles(state.files);
    setCategory(NONE);
    setSavePath("");
    setPathTouched(false);
    setStart(true);
    setSequential(false);
    setTags("");
    setRename("");
    setUseDownloadPath(false);
    setDownloadPath("");
    setAutoTmm(DEFAULT);
    setLayout(DEFAULT);
    setStopCondition("None");
    setTopOfQueue(false);
    setSkipCheck(false);
    setFirstLast(false);
    setDlLimit("");
    setUpLimit("");
  }, [state.open, state.files, state.links]);

  // The save path follows the category until it is edited
  const categoryPath = category !== NONE ? data?.categories[category]?.savePath : undefined;
  const shownPath = pathTouched ? savePath : categoryPath || defaultPath.data || "";

  const linkList = links
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const preview = linkList.length === 1 ? parseMagnet(linkList[0]!) : undefined;

  // Metadata for one magnet link or one file: size, file list and choosing files (torrents/
  // fetchMetadata polls with 202 until qBittorrent has it; parseMetadata reads a .torrent file)
  const linkSource = tab === "link" && preview?.hash ? linkList[0] : undefined;
  const singleFile = tab === "file" && files.length === 1 ? files[0] : undefined;
  const linkMeta = useQuery({
    queryKey: ["metadata", linkSource],
    queryFn: () => api.fetchMetadata(linkSource!, state.downloader),
    enabled: state.open && !!linkSource,
    refetchInterval: (q) => (q.state.data?.ready || q.state.error ? false : 1500),
    retry: false,
  });
  const fileMeta = useQuery({
    queryKey: ["metadata-file", singleFile?.name, singleFile?.size, singleFile?.lastModified],
    queryFn: async () => (await api.parseMetadata([singleFile!]))[0],
    enabled: state.open && !!singleFile,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const meta = tab === "link" ? linkMeta : fileMeta;
  const info = tab === "link" ? (linkMeta.data?.ready ? linkMeta.data.info.info : undefined) : fileMeta.data?.info;
  const metaKey = info ? `${info.name}:${info.length}:${info.files.length}` : "";
  const [priorities, setPriorities] = useState<number[] | null>(null);
  const [choosing, setChoosing] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: new metadata, new choice
  useEffect(() => {
    setPriorities(null);
    setChoosing(false);
  }, [metaKey]);
  const shownPriorities = priorities ?? info?.files.map((f) => f.priority ?? 1) ?? [];
  const canSubmit = tab === "link" ? linkList.length > 0 : files.length > 0;

  const close = () => addDialogStore.set((s) => ({ ...s, open: false }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    const mbps = (v: string) => (v.trim() ? Math.round(Number(v.replace(",", ".")) * 1000 * 1000) : undefined);
    const result = await run(
      () =>
        api.add({
          urls: tab === "link" ? linkList : undefined,
          downloader: tab === "link" && linkList[0] === state.links.trim() ? state.downloader : undefined,
          files: tab === "file" ? files : undefined,
          category: category === NONE ? undefined : category,
          savepath: pathTouched && savePath.trim() ? savePath.trim() : undefined,
          stopped: !start,
          sequentialDownload: sequential || undefined,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          rename: rename.trim() || undefined,
          useDownloadPath: useDownloadPath || undefined,
          downloadPath: useDownloadPath && downloadPath.trim() ? downloadPath.trim() : undefined,
          autoTMM: autoTmm === DEFAULT ? undefined : autoTmm === "true",
          contentLayout: layout === DEFAULT ? undefined : layout,
          stopCondition: stopCondition === "None" ? undefined : stopCondition,
          addToTopOfQueue: topOfQueue || undefined,
          seedMode: skipCheck || undefined,
          firstLastPiecePrio: firstLast || undefined,
          filePriorities: priorities && info ? priorities : undefined,
          dlLimit: mbps(dlLimit),
          upLimit: mbps(upLimit),
        }),
      { success: m.toast_added({ n: tab === "link" ? linkList.length : files.length }) },
    );
    setBusy(false);
    if (result !== undefined) close();
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...[...list].filter((f) => !prev.some((p) => p.name === f.name))]);
  };

  return (
    <Dialog open={state.open} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-[536px]" data-testid="add-dialog">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{m.add_torrent()}</DialogTitle>
            <DialogDescription>{m.add_description()}</DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "link" | "file")}>
            <TabsList className="w-full">
              <TabsTrigger value="link">{m.add_tab_link()}</TabsTrigger>
              <TabsTrigger value="file">{m.add_tab_file()}</TabsTrigger>
            </TabsList>
          </Tabs>

          {tab === "link" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-links">{m.add_links_label()}</Label>
              <Textarea
                id="add-links"
                value={links}
                onChange={(e) => setLinks(e.target.value)}
                className="min-h-16 break-all font-mono text-[13px]"
                placeholder="magnet:?xt=urn:btih:…"
                autoFocus
              />
              <span className="text-[13px] text-muted-foreground">{m.add_links_hint()}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addFiles(e.dataTransfer.files);
                }}
                className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center text-sm hover:bg-muted/50"
              >
                <UploadIcon className="size-5 text-muted-foreground" aria-hidden />
                <span className="font-medium">{m.add_files_choose()}</span>
                <span className="text-[13px] text-muted-foreground">{m.add_files_hint()}</span>
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".torrent,application/x-bittorrent"
                multiple
                hidden
                onChange={(e) => addFiles(e.target.files)}
                data-testid="add-file-input"
              />
              {files.map((f) => (
                <div key={f.name} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <FileIcon className="size-4 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">{formatBytes(f.size)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={m.remove_file({ name: f.name })}
                    onClick={() => setFiles((prev) => prev.filter((p) => p !== f))}
                  >
                    <XIcon />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {(linkSource || singleFile) && (
            <div className="flex flex-col gap-3 rounded-lg border px-4 py-3" data-testid="add-preview">
              <div className="flex items-start gap-3">
                {info ? (
                  <CircleCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                ) : meta.isError ? (
                  <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                ) : (
                  <LoaderCircleIcon className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-medium">
                    {info?.name ?? preview?.name ?? singleFile?.name ?? m.add_magnet_unnamed()}
                  </span>
                  <span className="truncate text-[13px] text-muted-foreground tabular-nums">
                    {info
                      ? m.add_meta_summary({ size: formatBytes(info.length), n: info.files.length })
                      : meta.isError
                        ? m.add_meta_failed()
                        : m.add_meta_loading()}
                  </span>
                </div>
                {info && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-my-1"
                    onClick={() => setChoosing((v) => !v)}
                    aria-expanded={choosing}
                  >
                    {choosing ? m.add_files_hide() : m.add_files_choose_files()}
                  </Button>
                )}
              </div>
              {info && choosing && (
                <FilePicker files={info.files} priorities={shownPriorities} onChange={setPriorities} />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-category">{m.category()}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="add-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{m.category_none()}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-path">{m.add_save_in()}</Label>
              <Input
                id="add-path"
                className="font-mono text-[13px]"
                value={shownPath}
                onChange={(e) => {
                  setPathTouched(true);
                  setSavePath(e.target.value);
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <CheckField checked={start} onChange={setStart} label={m.add_start()} />
            <CheckField
              checked={sequential}
              onChange={setSequential}
              label={m.adv_sequential()}
              hint={m.add_sequential_hint()}
            />
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
                  <Label htmlFor="add-tags">{m.tags()}</Label>
                  <Input
                    id="add-tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder={m.add_tags_placeholder()}
                    list="add-tags-list"
                  />
                  <datalist id="add-tags-list">
                    {data?.tags.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="add-rename">{m.add_rename()}</Label>
                  <Input id="add-rename" value={rename} onChange={(e) => setRename(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="add-tmm">{m.add_management()}</Label>
                  <Select value={autoTmm} onValueChange={setAutoTmm}>
                    <SelectTrigger id="add-tmm" className="w-full" title={m.add_management_hint()}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DEFAULT}>{m.add_default()}</SelectItem>
                      <SelectItem value="false">{m.add_management_manual()}</SelectItem>
                      <SelectItem value="true">{m.add_management_auto()}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="add-layout">{m.add_layout()}</Label>
                  <Select value={layout} onValueChange={(v) => setLayout(v as ContentLayout)}>
                    <SelectTrigger id="add-layout" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DEFAULT}>{m.add_default()}</SelectItem>
                      <SelectItem value="Original">{m.add_layout_original()}</SelectItem>
                      <SelectItem value="Subfolder">{m.add_layout_subfolder()}</SelectItem>
                      <SelectItem value="NoSubfolder">{m.add_layout_nosubfolder()}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="add-stop">{m.add_stop_condition()}</Label>
                  <Select value={stopCondition} onValueChange={(v) => setStopCondition(v as StopCondition)}>
                    <SelectTrigger id="add-stop" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">{m.add_stop_none()}</SelectItem>
                      <SelectItem value="MetadataReceived">{m.add_stop_metadata()}</SelectItem>
                      <SelectItem value="FilesChecked">{m.add_stop_checked()}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="add-dl">{m.add_dl_limit()}</Label>
                    <Input
                      id="add-dl"
                      inputMode="decimal"
                      value={dlLimit}
                      onChange={(e) => setDlLimit(e.target.value)}
                      placeholder="MB/s"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="add-ul">{m.add_up_limit()}</Label>
                    <Input
                      id="add-ul"
                      inputMode="decimal"
                      value={upLimit}
                      onChange={(e) => setUpLimit(e.target.value)}
                      placeholder="MB/s"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <CheckField checked={useDownloadPath} onChange={setUseDownloadPath} label={m.add_incomplete_path()} />
                {useDownloadPath && (
                  <Input
                    aria-label={m.add_incomplete_path()}
                    className="font-mono text-[13px]"
                    value={downloadPath}
                    onChange={(e) => setDownloadPath(e.target.value)}
                    placeholder="/downloads/incomplete"
                  />
                )}
                <CheckField checked={firstLast} onChange={setFirstLast} label={m.adv_first_last()} />
                <CheckField checked={topOfQueue} onChange={setTopOfQueue} label={m.add_top_of_queue()} />
                <CheckField
                  checked={skipCheck}
                  onChange={setSkipCheck}
                  label={m.add_skip_check()}
                  hint={m.add_skip_check_hint()}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={close}>
              {m.cancel()}
            </Button>
            <Button type="submit" disabled={!canSubmit || busy}>
              {busy && <LoaderCircleIcon className="animate-spin" />}
              {m.add()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
