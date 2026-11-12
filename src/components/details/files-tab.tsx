import { useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon, ChevronRightIcon, DownloadIcon, PencilIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@/api/client";
import { useFiles, useRunAction } from "@/api/queries";
import { FilePriority, type Torrent, type TorrentFile } from "@/api/schemas";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { buildFileTree, type FileNode, filterTree, flattenTree, isWanted, MIXED } from "@/lib/file-tree";
import { formatBytes, percentValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages.js";
import { InputDialog, type InputDialogState } from "./input-dialog";
import { RenameFilesDialog } from "./rename-files-dialog";

export function priorityLabel(priority: number): string {
  switch (priority) {
    case FilePriority.Ignored:
      return m.prio_ignored();
    case FilePriority.High:
      return m.prio_high();
    case FilePriority.Maximum:
      return m.prio_maximum();
    case MIXED:
      return m.prio_mixed();
    default:
      return m.prio_normal();
  }
}

export function PriorityMenu({ node, onChange }: { node: FileNode; onChange: (priority: number) => void }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-full justify-between px-2 font-normal text-xs"
          aria-label={m.priority_for({ name: node.name })}
        >
          {priorityLabel(node.priority)}
          <ChevronDownIcon className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-muted-foreground text-xs">{m.priority()}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={String(node.priority)} onValueChange={(v) => onChange(Number(v))}>
          <DropdownMenuRadioItem value={String(FilePriority.Ignored)}>{m.prio_ignored()}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value={String(FilePriority.Normal)}>{m.prio_normal()}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value={String(FilePriority.High)}>{m.prio_high()}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value={String(FilePriority.Maximum)}>{m.prio_maximum()}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Tab "Dateien": the file tree with priorities (Dateien.dc.html); torrents/files, torrents/filePrio. */
export function FilesTab({ t }: { t: Torrent }) {
  const { data: files, isPending } = useFiles(t.hash);
  const queryClient = useQueryClient();
  const run = useRunAction();
  const [filter, setFilter] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState(false);
  const [dialog, setDialog] = useState<InputDialogState | null>(null);

  const renameOne = (node: FileNode) =>
    setDialog({
      title: node.isDir ? m.rename_folder_title() : m.rename_file_title(),
      label: m.name(),
      initial: node.name,
      submit: m.save(),
      onSubmit: (name) => {
        const parent = node.path.slice(0, node.path.length - node.name.length);
        const newPath = parent + name;
        if (newPath === node.path) return;
        void run(
          () =>
            node.isDir ? api.renameFolder(t.hash, node.path, newPath) : api.renameFile(t.hash, node.path, newPath),
          { invalidate: [["files", t.hash]] },
        );
      },
    });

  const tree = useMemo(() => buildFileTree(files ?? []), [files]);
  const allNodes = useMemo(() => flattenTree(tree), [tree]);
  const rows = useMemo(
    () => flattenTree(filterTree(tree, filter), filter ? new Set() : collapsed),
    [tree, filter, collapsed],
  );

  const setPriority = (indices: number[], priority: number) => {
    const set = new Set(indices);
    queryClient.setQueryData<TorrentFile[]>(["files", t.hash], (prev) =>
      prev?.map((f) => (set.has(f.index) ? { ...f, priority } : f)),
    );
    void run(() => api.setFilePriority(t.hash, indices, priority), { invalidate: [["files", t.hash]] });
  };

  const toggleDir = (path: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  if (!t.has_metadata) return <p className="text-muted-foreground text-sm">{m.files_no_metadata()}</p>;
  if (isPending) return <Skeleton className="h-48 w-full" />;

  const all = files ?? [];
  const priorityOf = new Map(all.map((f) => [f.index, f.priority]));
  // A folder is ticked when all its files are wanted, whatever their priorities
  const wantedState = (node: FileNode): boolean | "indeterminate" => {
    const wantedCount = node.indices.filter((i) => isWanted(priorityOf.get(i) ?? 0)).length;
    return wantedCount === 0 ? false : wantedCount === node.indices.length ? true : "indeterminate";
  };
  const wanted = all.filter((f) => isWanted(f.priority));
  const allWanted = wanted.length === all.length;
  const someWanted = wanted.length > 0;
  const ignored = all.filter((f) => !isWanted(f.priority)).map((f) => f.index);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={m.files_filter()}
            aria-label={m.files_filter()}
            className="h-8 pl-8"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setRenaming(true)}>
          {m.action_rename()}
        </Button>
      </div>

      <section className="overflow-hidden rounded-lg border text-sm" aria-label={m.tab_files()}>
        <div className="grid min-h-10 grid-cols-[16px_minmax(0,1fr)_64px_96px] items-center gap-3 border-b px-2 font-medium">
          <Checkbox
            checked={allWanted ? true : someWanted ? "indeterminate" : false}
            onCheckedChange={(v) =>
              setPriority(
                all.map((f) => f.index),
                v === true ? FilePriority.Normal : FilePriority.Ignored,
              )
            }
            aria-label={m.files_all()}
          />
          <span>{m.col_name()}</span>
          <span className="text-right">{m.col_size()}</span>
          <span className="text-right">{m.priority()}</span>
        </div>
        {rows.map((node) => {
          const on = isWanted(node.priority);
          return (
            <div
              key={node.path}
              className="group/file grid min-h-11 grid-cols-[16px_minmax(0,1fr)_64px_96px] items-center gap-3 border-b px-2 py-1.5 last:border-b-0"
            >
              <Checkbox
                checked={wantedState(node)}
                onCheckedChange={(v) =>
                  setPriority(node.indices, v === true ? FilePriority.Normal : FilePriority.Ignored)
                }
                aria-label={m.files_want({ name: node.name })}
              />
              <span className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: node.depth * 16 }}>
                {node.isDir && (
                  <button
                    type="button"
                    className="-ml-0.5 rounded-sm text-muted-foreground hover:text-foreground"
                    onClick={() => toggleDir(node.path)}
                    aria-label={collapsed.has(node.path) ? m.expand() : m.collapse()}
                  >
                    {collapsed.has(node.path) ? (
                      <ChevronRightIcon className="size-4" />
                    ) : (
                      <ChevronDownIcon className="size-4" />
                    )}
                  </button>
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span
                    className={cn(
                      "truncate",
                      node.isDir && "font-medium",
                      !node.isDir && !on && "text-muted-foreground line-through",
                    )}
                    title={node.path}
                  >
                    {node.name}
                    <button
                      type="button"
                      className="ml-1.5 inline-flex align-middle text-muted-foreground opacity-0 hover:text-foreground focus-visible:opacity-100 group-hover/file:opacity-100"
                      aria-label={m.rename_name({ name: node.name })}
                      onClick={() => renameOne(node)}
                    >
                      <PencilIcon className="size-3.5" />
                    </button>
                    {!node.isDir && node.progress >= 1 && (
                      // a finished file straight into the browser (torrents/downloadFile, qBittorrent 5.3)
                      <a
                        href={api.fileDownloadUrl(t.hash, node.indices[0]!)}
                        download={node.name}
                        className="ml-1.5 inline-flex align-middle text-muted-foreground hover:text-foreground"
                        aria-label={m.file_download({ name: node.name })}
                        title={m.file_download({ name: node.name })}
                      >
                        <DownloadIcon className="size-3.5" />
                      </a>
                    )}
                  </span>
                  {!node.isDir && on && (
                    <Progress value={percentValue(node.progress)} className="h-1.5" aria-label={m.col_progress()} />
                  )}
                </span>
              </span>
              <span className="text-right text-[13px] text-muted-foreground tabular-nums">
                {formatBytes(node.size)}
              </span>
              <PriorityMenu node={node} onChange={(p) => setPriority(node.indices, p)} />
            </div>
          );
        })}
      </section>

      <div className="flex items-center justify-between text-sm tabular-nums">
        <span className="text-muted-foreground">
          {m.files_summary({
            n: wanted.length,
            total: all.length,
            size: formatBytes(wanted.reduce((s, f) => s + f.size, 0)),
          })}
        </span>
        {ignored.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setPriority(ignored, FilePriority.Normal)}>
            {m.files_load_all()}
          </Button>
        )}
      </div>
      <RenameFilesDialog hash={t.hash} nodes={allNodes} open={renaming} onClose={() => setRenaming(false)} />
      <InputDialog state={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}
