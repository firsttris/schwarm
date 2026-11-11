import { type FormEvent, useEffect, useState } from "react";
import { api } from "@/api/client";
import { useMaindata, useRunAction } from "@/api/queries";
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
import { lazyNamed, WhenUsed } from "@/lib/lazy";
import { m } from "@/paraglide/messages.js";
import { torrentDialogStore } from "./torrent-actions";

/** Remove (with "Dateien auch löschen"), set location and rename, opened from any torrent menu. */
const LimitsDialog = lazyNamed(() => import("./limits-dialog"), "LimitsDialog");

export function TorrentDialogs({ onRemoved }: { onRemoved?: (hashes: string[]) => void }) {
  const dialog = torrentDialogStore.use();
  const { data } = useMaindata();
  const run = useRunAction();
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [value, setValue] = useState("");
  const torrents = (dialog?.hashes ?? []).map((h) => data?.torrents[h]).filter((t) => t !== undefined);
  const first = torrents[0];

  // biome-ignore lint/correctness/useExhaustiveDependencies: only when a dialog opens
  useEffect(() => {
    if (!dialog) return;
    setDeleteFiles(false);
    setValue(dialog.kind === "rename" ? (first?.name ?? "") : (first?.save_path ?? ""));
  }, [dialog]);

  const close = () => torrentDialogStore.set(null);
  const hashes = dialog?.hashes ?? [];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dialog) return;
    close();
    if (dialog.kind === "remove") {
      onRemoved?.(hashes);
      await run(() => api.remove(hashes, deleteFiles), {
        success: deleteFiles ? m.toast_removed_files({ n: hashes.length }) : m.toast_removed({ n: hashes.length }),
      });
    } else if (dialog.kind === "location" && value.trim()) {
      await run(() => api.setLocation(hashes, value.trim()), { success: m.toast_moved() });
    } else if (dialog.kind === "rename" && first && value.trim()) {
      await run(() => api.rename(first.hash, value.trim()));
    }
  };

  const name = torrents.length === 1 ? (first?.name ?? "") : m.n_torrents({ n: torrents.length });

  if (dialog?.kind === "limits") {
    return (
      <WhenUsed active>
        <LimitsDialog torrents={torrents} open onClose={close} />
      </WhenUsed>
    );
  }

  return (
    <Dialog open={!!dialog} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4">
          {dialog?.kind === "remove" && (
            <>
              <DialogHeader>
                <DialogTitle>{m.remove_title({ n: hashes.length })}</DialogTitle>
                <DialogDescription className="break-all">{name}</DialogDescription>
              </DialogHeader>
              <Label className="flex items-start gap-3 font-normal">
                <Checkbox
                  checked={deleteFiles}
                  onCheckedChange={(v) => setDeleteFiles(v === true)}
                  className="mt-0.5"
                  aria-describedby="delete-files-hint"
                />
                <span className="flex flex-col gap-1">
                  <span className="font-medium">{m.remove_delete_files()}</span>
                  <span id="delete-files-hint" className="text-muted-foreground text-sm">
                    {m.remove_delete_files_hint()}
                  </span>
                </span>
              </Label>
            </>
          )}
          {dialog?.kind === "location" && (
            <>
              <DialogHeader>
                <DialogTitle>{m.location_title()}</DialogTitle>
                <DialogDescription className="break-all">{name}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="location">{m.location_label()}</Label>
                <Input
                  id="location"
                  className="font-mono"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  autoFocus
                />
                <p className="text-muted-foreground text-sm">{m.location_hint()}</p>
              </div>
            </>
          )}
          {dialog?.kind === "rename" && (
            <>
              <DialogHeader>
                <DialogTitle>{m.rename_title()}</DialogTitle>
                <DialogDescription>{m.rename_hint()}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="rename">{m.name()}</Label>
                <Input id="rename" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
              </div>
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              {m.cancel()}
            </Button>
            <Button type="submit" variant={dialog?.kind === "remove" ? "destructive" : "default"}>
              {dialog?.kind === "remove" ? m.remove_confirm() : m.save()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
