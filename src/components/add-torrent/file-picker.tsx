import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { FilePriority, type TorrentFile } from "@/api/schemas";
import { Checkbox } from "@/components/ui/checkbox";
import { buildFileTree, flattenTree, isWanted } from "@/lib/file-tree";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages.js";
import { PriorityMenu } from "../details/files-tab";

/**
 * The file tree of the "Dateien" tab, before the torrent exists: which files to load and
 * with which priority. The result goes to torrents/add as "filePriorities".
 */
export function FilePicker({
  files,
  priorities,
  onChange,
}: {
  files: { path: string; length: number }[];
  priorities: number[];
  onChange: (priorities: number[]) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const asFiles: TorrentFile[] = useMemo(
    () =>
      files.map((f, index) => ({ index, name: f.path, size: f.length, progress: 0, priority: priorities[index] ?? 1 })),
    [files, priorities],
  );
  const tree = useMemo(() => buildFileTree(asFiles), [asFiles]);
  const rows = flattenTree(tree, collapsed);
  const set = (indices: number[], priority: number) => {
    const next = [...priorities];
    for (const i of indices) next[i] = priority;
    onChange(next);
  };
  const stateOf = (indices: number[]): boolean | "indeterminate" => {
    const n = indices.filter((i) => isWanted(priorities[i] ?? 1)).length;
    return n === 0 ? false : n === indices.length ? true : "indeterminate";
  };
  const wanted = asFiles.filter((f) => isWanted(f.priority));

  return (
    <div className="flex flex-col gap-2">
      <div className="max-h-64 overflow-y-auto rounded-lg border text-sm" data-testid="file-picker">
        {rows.map((node) => (
          <div
            key={node.path}
            className="grid min-h-10 grid-cols-[16px_minmax(0,1fr)_64px_96px] items-center gap-3 border-b px-2 py-1 last:border-b-0"
          >
            <Checkbox
              checked={stateOf(node.indices)}
              onCheckedChange={(v) => set(node.indices, v === true ? FilePriority.Normal : FilePriority.Ignored)}
              aria-label={m.files_want({ name: node.name })}
            />
            <span className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: node.depth * 16 }}>
              {node.isDir && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={collapsed.has(node.path) ? m.expand() : m.collapse()}
                  onClick={() =>
                    setCollapsed((prev) => {
                      const next = new Set(prev);
                      if (next.has(node.path)) next.delete(node.path);
                      else next.add(node.path);
                      return next;
                    })
                  }
                >
                  {collapsed.has(node.path) ? (
                    <ChevronRightIcon className="size-4" />
                  ) : (
                    <ChevronDownIcon className="size-4" />
                  )}
                </button>
              )}
              <span
                className={cn(
                  "truncate",
                  node.isDir && "font-medium",
                  !node.isDir && !isWanted(node.priority) && "text-muted-foreground line-through",
                )}
                title={node.path}
              >
                {node.name}
              </span>
            </span>
            <span className="text-right text-[13px] text-muted-foreground tabular-nums">{formatBytes(node.size)}</span>
            <PriorityMenu node={node} onChange={(p) => set(node.indices, p)} />
          </div>
        ))}
      </div>
      <span className="text-[13px] text-muted-foreground tabular-nums">
        {m.files_summary({
          n: wanted.length,
          total: asFiles.length,
          size: formatBytes(wanted.reduce((s, f) => s + f.size, 0)),
        })}
      </span>
    </div>
  );
}
