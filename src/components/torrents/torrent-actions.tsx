import {
  ArrowDownToLineIcon,
  CirclePauseIcon,
  CirclePlayIcon,
  CopyIcon,
  FolderIcon,
  FolderInputIcon,
  ListOrderedIcon,
  MegaphoneIcon,
  PencilIcon,
  RefreshCwIcon,
  Settings2Icon,
  TagIcon,
  Trash2Icon,
  ZapIcon,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { useMaindata, useRunAction } from "@/api/queries";
import type { Torrent } from "@/api/schemas";
import * as CM from "@/components/ui/context-menu";
import * as DM from "@/components/ui/dropdown-menu";
import { copyText } from "@/lib/clipboard";
import { createMemoryStore } from "@/lib/store";
import { isStopped, torrentTags } from "@/lib/torrents";
import { m } from "@/paraglide/messages.js";

/** Dialogs opened from the menus; rendered once by <TorrentDialogs />. */
export type TorrentDialog = { kind: "remove" | "location" | "rename"; hashes: string[] } | null;
export const torrentDialogStore = createMemoryStore<TorrentDialog>(null);

export function useTorrentActions() {
  const run = useRunAction();
  const predictStart = (t: Torrent): Partial<Torrent> =>
    isStopped(t) ? { state: t.progress >= 1 ? "stalledUP" : "stalledDL" } : {};
  const predictStop = (t: Torrent): Partial<Torrent> => ({
    state: t.progress >= 1 ? "stoppedUP" : "stoppedDL",
    dlspeed: 0,
    upspeed: 0,
  });
  return {
    start: (hashes: string[]) => run(() => api.start(hashes), { optimistic: { hashes, patch: predictStart } }),
    stop: (hashes: string[]) => run(() => api.stop(hashes), { optimistic: { hashes, patch: predictStop } }),
    forceStart: (hashes: string[], value = true) =>
      run(() => api.setForceStart(hashes, value), { optimistic: { hashes, patch: () => ({ force_start: value }) } }),
    setCategory: (hashes: string[], category: string) =>
      run(() => api.setCategory(hashes, category), { optimistic: { hashes, patch: () => ({ category }) } }),
    setTag: (hashes: string[], tag: string, on: boolean) =>
      run(() => (on ? api.addTags(hashes, [tag]) : api.removeTags(hashes, [tag])), {
        optimistic: {
          hashes,
          patch: (t) => {
            const tags = new Set(torrentTags(t));
            if (on) tags.add(tag);
            else tags.delete(tag);
            return { tags: [...tags].sort((a, b) => a.localeCompare(b)).join(", ") };
          },
        },
      }),
    recheck: (hashes: string[]) => run(() => api.recheck(hashes), { success: m.toast_recheck() }),
    reannounce: (hashes: string[]) => run(() => api.reannounce(hashes), { success: m.toast_reannounce() }),
    queue: (hashes: string[], where: "top" | "up" | "down" | "bottom") =>
      run(() =>
        where === "top"
          ? api.topPrio(hashes)
          : where === "up"
            ? api.increasePrio(hashes)
            : where === "down"
              ? api.decreasePrio(hashes)
              : api.bottomPrio(hashes),
      ),
    setAutoTmm: (hashes: string[], enable: boolean) => run(() => api.setAutoManagement(hashes, enable)),
    setSuperSeeding: (hashes: string[], value: boolean) => run(() => api.setSuperSeeding(hashes, value)),
    /** The toggles flip each torrent, so only those that differ from the wanted value are sent. */
    setSequential: (torrents: Torrent[], value: boolean) => {
      const hashes = torrents.filter((t) => t.seq_dl !== value).map((t) => t.hash);
      return hashes.length ? run(() => api.toggleSequentialDownload(hashes)) : undefined;
    },
    setFirstLast: (torrents: Torrent[], value: boolean) => {
      const hashes = torrents.filter((t) => t.f_l_piece_prio !== value).map((t) => t.hash);
      return hashes.length ? run(() => api.toggleFirstLastPiecePrio(hashes)) : undefined;
    },
    exportTorrents: (torrents: Torrent[]) => {
      for (const t of torrents) {
        const a = document.createElement("a");
        a.href = api.exportUrl(t.hash);
        a.download = `${t.name}.torrent`;
        document.body.append(a);
        a.click();
        a.remove();
      }
    },
  };
}

async function copy(value: string) {
  if (await copyText(value)) toast.success(m.toast_copied());
  else toast.error(m.toast_copy_failed());
}

type Kit = {
  Item: ComponentType<{
    children: ReactNode;
    onSelect?: () => void;
    variant?: "default" | "destructive";
    disabled?: boolean;
  }>;
  CheckboxItem: ComponentType<{
    children: ReactNode;
    checked?: boolean | "indeterminate";
    onCheckedChange?: (v: boolean) => void;
    onSelect?: (e: Event) => void;
  }>;
  RadioGroup: ComponentType<{ children: ReactNode; value?: string; onValueChange?: (v: string) => void }>;
  RadioItem: ComponentType<{ children: ReactNode; value: string }>;
  Separator: ComponentType;
  Label: ComponentType<{ children: ReactNode; className?: string }>;
  Sub: ComponentType<{ children: ReactNode }>;
  SubTrigger: ComponentType<{ children: ReactNode }>;
  SubContent: ComponentType<{ children: ReactNode; className?: string }>;
  Shortcut: ComponentType<{ children: ReactNode }>;
};

export const contextKit: Kit = {
  Item: CM.ContextMenuItem,
  CheckboxItem: CM.ContextMenuCheckboxItem as Kit["CheckboxItem"],
  RadioGroup: CM.ContextMenuRadioGroup,
  RadioItem: CM.ContextMenuRadioItem,
  Separator: CM.ContextMenuSeparator,
  Label: CM.ContextMenuLabel,
  Sub: CM.ContextMenuSub,
  SubTrigger: CM.ContextMenuSubTrigger,
  SubContent: CM.ContextMenuSubContent,
  Shortcut: CM.ContextMenuShortcut,
};

export const dropdownKit: Kit = {
  Item: DM.DropdownMenuItem,
  CheckboxItem: DM.DropdownMenuCheckboxItem as Kit["CheckboxItem"],
  RadioGroup: DM.DropdownMenuRadioGroup,
  RadioItem: DM.DropdownMenuRadioItem,
  Separator: DM.DropdownMenuSeparator,
  Label: DM.DropdownMenuLabel,
  Sub: DM.DropdownMenuSub,
  SubTrigger: DM.DropdownMenuSubTrigger,
  SubContent: DM.DropdownMenuSubContent,
  Shortcut: DM.DropdownMenuShortcut,
};

const allOrSome = (list: Torrent[], pick: (t: Torrent) => boolean): boolean | "indeterminate" => {
  const n = list.filter(pick).length;
  return n === 0 ? false : n === list.length ? true : "indeterminate";
};

/**
 * Every action for a selection, as in docs/mockup/Kontextmenue.dc.html and features.md.
 * The same items serve the context menu, the row menu "…" and the toolbar.
 */
export function TorrentMenuItems({ kit: K, torrents }: { kit: Kit; torrents: Torrent[] }) {
  const { data } = useMaindata();
  const a = useTorrentActions();
  const hashes = torrents.map((t) => t.hash);
  const single = torrents.length === 1 ? torrents[0] : undefined;
  const categories = Object.keys(data?.categories ?? {}).sort((x, y) => x.localeCompare(y));
  const tags = data?.tags ?? [];
  const commonCategory = torrents.every((t) => t.category === torrents[0]?.category)
    ? (torrents[0]?.category ?? "")
    : undefined;
  const queueing = data?.serverState.queueing ?? false;
  const openDialog = (kind: "remove" | "location" | "rename") => torrentDialogStore.set({ kind, hashes });

  if (!torrents.length) return null;
  return (
    <>
      <K.Label className="max-w-64 truncate font-medium text-muted-foreground text-xs">
        {single ? single.name : m.n_torrents({ n: torrents.length })}
      </K.Label>
      <K.Item onSelect={() => a.start(hashes)}>
        <CirclePlayIcon /> {m.action_start()}
        <K.Shortcut>␣</K.Shortcut>
      </K.Item>
      <K.Item onSelect={() => a.stop(hashes)}>
        <CirclePauseIcon /> {m.action_stop()}
      </K.Item>
      <K.Item onSelect={() => a.forceStart(hashes)}>
        <ZapIcon /> {m.action_force_start()}
      </K.Item>
      <K.Separator />
      <K.Sub>
        <K.SubTrigger>
          <FolderIcon /> {m.category()}
        </K.SubTrigger>
        <K.SubContent className="max-h-80 overflow-y-auto">
          <K.RadioGroup value={commonCategory} onValueChange={(v) => a.setCategory(hashes, v)}>
            <K.RadioItem value="">{m.category_none()}</K.RadioItem>
            {categories.map((c) => (
              <K.RadioItem key={c} value={c}>
                {c}
              </K.RadioItem>
            ))}
          </K.RadioGroup>
        </K.SubContent>
      </K.Sub>
      <K.Sub>
        <K.SubTrigger>
          <TagIcon /> {m.tags()}
        </K.SubTrigger>
        <K.SubContent className="max-h-80 overflow-y-auto">
          {tags.length === 0 && <K.Label className="font-normal text-muted-foreground">{m.tags_none()}</K.Label>}
          {tags.map((tag) => {
            const state = allOrSome(torrents, (t) => torrentTags(t).includes(tag));
            return (
              <K.CheckboxItem
                key={tag}
                checked={state}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={() => a.setTag(hashes, tag, state !== true)}
              >
                {tag}
              </K.CheckboxItem>
            );
          })}
        </K.SubContent>
      </K.Sub>
      <K.Item onSelect={() => openDialog("location")}>
        <FolderInputIcon /> {m.action_location()}
      </K.Item>
      {single && (
        <K.Item onSelect={() => openDialog("rename")}>
          <PencilIcon /> {m.action_rename()}
          <K.Shortcut>F2</K.Shortcut>
        </K.Item>
      )}
      <K.Separator />
      {queueing && (
        <K.Sub>
          <K.SubTrigger>
            <ListOrderedIcon /> {m.queue()}
          </K.SubTrigger>
          <K.SubContent>
            <K.Item onSelect={() => a.queue(hashes, "top")}>{m.queue_top()}</K.Item>
            <K.Item onSelect={() => a.queue(hashes, "up")}>{m.queue_up()}</K.Item>
            <K.Item onSelect={() => a.queue(hashes, "down")}>{m.queue_down()}</K.Item>
            <K.Item onSelect={() => a.queue(hashes, "bottom")}>{m.queue_bottom()}</K.Item>
          </K.SubContent>
        </K.Sub>
      )}
      <K.Sub>
        <K.SubTrigger>
          <Settings2Icon /> {m.advanced()}
        </K.SubTrigger>
        <K.SubContent className="w-64">
          <K.CheckboxItem
            checked={allOrSome(torrents, (t) => t.auto_tmm)}
            onCheckedChange={(v) => a.setAutoTmm(hashes, v)}
          >
            {m.adv_auto_tmm()}
          </K.CheckboxItem>
          <K.CheckboxItem
            checked={allOrSome(torrents, (t) => t.seq_dl)}
            onCheckedChange={(v) => a.setSequential(torrents, v)}
          >
            {m.adv_sequential()}
          </K.CheckboxItem>
          <K.CheckboxItem
            checked={allOrSome(torrents, (t) => t.f_l_piece_prio)}
            onCheckedChange={(v) => a.setFirstLast(torrents, v)}
          >
            {m.adv_first_last()}
          </K.CheckboxItem>
          <K.CheckboxItem
            checked={allOrSome(torrents, (t) => t.super_seeding)}
            onCheckedChange={(v) => a.setSuperSeeding(hashes, v)}
          >
            {m.adv_super_seeding()}
          </K.CheckboxItem>
        </K.SubContent>
      </K.Sub>
      <K.Separator />
      <K.Item onSelect={() => a.recheck(hashes)}>
        <RefreshCwIcon /> {m.action_recheck()}
      </K.Item>
      <K.Item onSelect={() => a.reannounce(hashes)}>
        <MegaphoneIcon /> {m.action_reannounce()}
      </K.Item>
      <K.Separator />
      <K.Sub>
        <K.SubTrigger>
          <CopyIcon /> {m.copy()}
        </K.SubTrigger>
        <K.SubContent>
          <K.Item onSelect={() => copy(torrents.map((t) => t.name).join("\n"))}>{m.copy_name()}</K.Item>
          <K.Item
            onSelect={() =>
              copy(
                torrents
                  .map((t) => t.infohash_v1)
                  .filter(Boolean)
                  .join("\n"),
              )
            }
          >
            {m.copy_hash_v1()}
          </K.Item>
          {torrents.some((t) => t.infohash_v2) && (
            <K.Item
              onSelect={() =>
                copy(
                  torrents
                    .map((t) => t.infohash_v2)
                    .filter(Boolean)
                    .join("\n"),
                )
              }
            >
              {m.copy_hash_v2()}
            </K.Item>
          )}
          <K.Item onSelect={() => copy(torrents.map((t) => t.magnet_uri).join("\n"))}>{m.copy_magnet()}</K.Item>
          <K.Item onSelect={() => copy(hashes.join("\n"))}>{m.copy_id()}</K.Item>
          <K.Item
            onSelect={() =>
              copy(
                torrents
                  .map((t) => t.comment)
                  .filter(Boolean)
                  .join("\n"),
              )
            }
          >
            {m.copy_comment()}
          </K.Item>
          <K.Item onSelect={() => copy(torrents.map((t) => t.content_path).join("\n"))}>{m.copy_content_path()}</K.Item>
        </K.SubContent>
      </K.Sub>
      <K.Item onSelect={() => a.exportTorrents(torrents)}>
        <ArrowDownToLineIcon /> {m.action_export()}
      </K.Item>
      <K.Separator />
      <K.Item variant="destructive" onSelect={() => openDialog("remove")}>
        <Trash2Icon /> {m.action_remove()}
        <K.Shortcut>{m.key_delete()}</K.Shortcut>
      </K.Item>
    </>
  );
}
