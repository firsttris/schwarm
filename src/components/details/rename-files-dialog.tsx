import { useQueryClient } from "@tanstack/react-query";
import { ArrowRightIcon } from "lucide-react";
import { type FormEvent, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { ApiError, api } from "@/api/client";
import { authState } from "@/api/queries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { FileNode } from "@/lib/file-tree";
import { type AppliesTo, computeRenames, defaultRenameOptions, type RenameOptions, renameProblems } from "@/lib/rename";
import { m } from "@/paraglide/messages.js";

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  );
}

/** Renames in the order given, deepest first, one request at a time; stops at the first error. */
async function applyRenames(hash: string, renames: { path: string; newPath: string; isDir: boolean }[]) {
  let done = 0;
  for (const r of [...renames].reverse()) {
    await (r.isDir ? api.renameFolder(hash, r.path, r.newPath) : api.renameFile(hash, r.path, r.newPath));
    done++;
  }
  return done;
}

/**
 * "Umbenennen …" in the Dateien tab: several files and folders with a pattern
 * (torrents/renameFile, renameFolder), with a preview of every change before it is made.
 */
export function RenameFilesDialog({
  hash,
  nodes,
  open,
  onClose,
}: {
  hash: string;
  /** Every file and folder of the torrent, in tree order. */
  nodes: FileNode[];
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [o, setO] = useState<RenameOptions>(defaultRenameOptions);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<RenameOptions>) => setO((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    if (open) setO(defaultRenameOptions);
  }, [open]);

  const result = useMemo(
    () =>
      computeRenames(
        nodes.map((n) => ({ path: n.path, isDir: n.isDir })),
        o,
      ),
    [nodes, o],
  );
  const renames = result.ok ? result.renames : [];
  const problems = renameProblems(
    renames,
    nodes.map((n) => n.path),
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!renames.length || problems.size) return;
    setBusy(true);
    try {
      const done = await applyRenames(hash, renames);
      toast.success(m.toast_files_renamed({ n: done }));
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) authState.set(true);
      else toast.error(m.error_action(), { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
      void queryClient.invalidateQueries({ queryKey: ["files", hash] });
    }
  };

  const problemText = (p: string) =>
    p === "duplicate"
      ? m.rename_problem_duplicate()
      : p === "slash"
        ? m.rename_problem_slash()
        : m.rename_problem_empty();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-[600px]"
        data-testid="rename-files-dialog"
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{m.rename_files_title()}</DialogTitle>
            <DialogDescription>{m.rename_files_text()}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rename-search">{m.rename_search()}</Label>
              <Input
                id="rename-search"
                value={o.search}
                onChange={(e) => set({ search: e.target.value })}
                aria-invalid={!result.ok}
                className="font-mono text-[13px]"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rename-replace">{m.rename_replace()}</Label>
              <Input
                id="rename-replace"
                value={o.replace}
                onChange={(e) => set({ replace: e.target.value })}
                className="font-mono text-[13px]"
              />
            </div>
          </div>
          {!result.ok && (
            <p role="alert" className="-mt-2 text-destructive text-sm">
              {m.rename_bad_regex()}
            </p>
          )}

          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <Check checked={o.regex} onChange={(regex) => set({ regex })} label={m.filter_regex()} />
            <Check checked={o.matchAll} onChange={(matchAll) => set({ matchAll })} label={m.rename_match_all()} />
            <Check
              checked={o.caseSensitive}
              onChange={(caseSensitive) => set({ caseSensitive })}
              label={m.rename_case()}
            />
            <Check
              checked={o.includeFiles}
              onChange={(includeFiles) => set({ includeFiles })}
              label={m.rename_files()}
            />
            <Check
              checked={o.includeFolders}
              onChange={(includeFolders) => set({ includeFolders })}
              label={m.rename_folders()}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rename-applies">{m.rename_applies()}</Label>
              <Select value={o.appliesTo} onValueChange={(v) => set({ appliesTo: v as AppliesTo })}>
                <SelectTrigger id="rename-applies" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">{m.rename_applies_both()}</SelectItem>
                  <SelectItem value="name">{m.rename_applies_name()}</SelectItem>
                  <SelectItem value="extension">{m.rename_applies_extension()}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rename-enum">{m.rename_enumerate()}</Label>
              <Input
                id="rename-enum"
                type="number"
                min={0}
                value={o.enumerateFrom}
                onChange={(e) => set({ enumerateFrom: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
          </div>
          <p className="text-[13px] text-muted-foreground">{m.rename_tokens()}</p>

          <div className="flex flex-col gap-2">
            <span className="font-medium text-sm">{m.rename_preview({ n: renames.length })}</span>
            <div className="max-h-56 overflow-y-auto rounded-lg border text-sm" data-testid="rename-preview">
              {renames.length === 0 && (
                <p className="p-4 text-center text-muted-foreground">{m.rename_preview_none()}</p>
              )}
              {renames.map((r) => (
                <div key={r.path} className="flex flex-col gap-0.5 border-b px-3 py-2 last:border-b-0">
                  <span className="flex min-w-0 items-center gap-2 font-mono text-[13px]">
                    <span className="truncate text-muted-foreground line-through">{r.from}</span>
                    <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label={m.rename_to()} />
                    <span className="truncate">{r.to}</span>
                  </span>
                  {problems.has(r.path) && (
                    <span className="text-destructive text-xs">{problemText(problems.get(r.path)!)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {m.cancel()}
            </Button>
            <Button type="submit" disabled={busy || !renames.length || problems.size > 0}>
              {m.rename_apply({ n: renames.length })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
