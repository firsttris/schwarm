import { flexRender, type Row, type Table } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type KeyboardEvent, type MouseEvent, useRef, useState } from "react";
import type { Torrent } from "@/api/schemas";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { usePreferences } from "@/lib/preferences";
import { isStopped } from "@/lib/torrents";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages.js";
import { contextKit, TorrentMenuItems, torrentDialogStore, useTorrentActions } from "./torrent-actions";

/**
 * The torrent list as a data table. Rows are virtualised (thousands of torrents) by
 * rendering only the visible ones between two spacer rows. Click selects, Ctrl/⌘ and
 * Shift extend, a double click or Enter opens the details, right click the context menu.
 * Keys: Space start/stop, Delete remove, Ctrl+A select all, F2 rename, Esc clear.
 */
export function TorrentTable({
  table,
  selected,
  onOpen,
}: {
  table: Table<Torrent>;
  selected: Torrent[];
  onOpen: (hash: string) => void;
}) {
  const prefs = usePreferences();
  const scrollRef = useRef<HTMLDivElement>(null);
  const anchor = useRef<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const actions = useTorrentActions();
  const rows = table.getRowModel().rows;
  const rowHeight = prefs.density === "compact" ? 40 : 52;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });
  const items = virtualizer.getVirtualItems();
  const padTop = items[0]?.start ?? 0;
  const padBottom = virtualizer.getTotalSize() - (items[items.length - 1]?.end ?? 0);
  const visibleColumns = table.getVisibleLeafColumns();

  const selectOnly = (hash: string) => table.setRowSelection({ [hash]: true });

  const onRowClick = (event: MouseEvent, row: Row<Torrent>, index: number) => {
    const hash = row.id;
    setFocused(hash);
    if (event.shiftKey && anchor.current) {
      const from = rows.findIndex((r) => r.id === anchor.current);
      const [a, b] = from < index ? [from, index] : [index, from];
      const range = Object.fromEntries(rows.slice(a, b + 1).map((r) => [r.id, true]));
      table.setRowSelection(event.ctrlKey || event.metaKey ? (prev) => ({ ...prev, ...range }) : range);
      return;
    }
    anchor.current = hash;
    if (event.ctrlKey || event.metaKey) row.toggleSelected();
    else selectOnly(hash);
  };

  const onContextMenu = (row: Row<Torrent>) => {
    if (!row.getIsSelected()) selectOnly(row.id);
    anchor.current = row.id;
    setFocused(row.id);
  };

  const moveFocus = (delta: number, extend: boolean) => {
    if (!rows.length) return;
    const current = rows.findIndex((r) => r.id === focused);
    const next = Math.max(0, Math.min(rows.length - 1, current < 0 ? 0 : current + delta));
    const hash = rows[next]!.id;
    setFocused(hash);
    virtualizer.scrollToIndex(next);
    if (extend) table.setRowSelection((prev) => ({ ...prev, [hash]: true }));
    else {
      selectOnly(hash);
      anchor.current = hash;
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (
      target !== event.currentTarget &&
      (target.closest("input, textarea") || (event.key === " " && target.closest("button")))
    ) {
      return;
    }
    const hashes = selected.map((t) => t.hash);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveFocus(1, event.shiftKey);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveFocus(-1, event.shiftKey);
        break;
      case " ":
        if (!hashes.length) return;
        event.preventDefault();
        if (selected.every(isStopped)) void actions.start(hashes);
        else void actions.stop(hashes);
        break;
      case "Delete":
      case "Backspace":
        if (!hashes.length) return;
        event.preventDefault();
        torrentDialogStore.set({ kind: "remove", hashes });
        break;
      case "F2":
        if (hashes.length !== 1) return;
        event.preventDefault();
        torrentDialogStore.set({ kind: "rename", hashes });
        break;
      case "Enter": {
        const hash = focused ?? hashes[0];
        if (!hash) return;
        event.preventDefault();
        onOpen(hash);
        break;
      }
      case "Escape":
        table.resetRowSelection();
        break;
      case "a":
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          table.toggleAllRowsSelected(true);
        }
        break;
    }
  };

  return (
    <ContextMenu>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: keyboard shortcuts for the list (see above) */}
      <div
        ref={scrollRef}
        className="relative max-h-[calc(100svh-268px)] min-h-[160px] overflow-auto rounded-lg border focus-visible:outline-2 focus-visible:outline-ring/50"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the list takes the keyboard shortcuts
        tabIndex={0}
        onKeyDown={onKeyDown}
        data-testid="torrent-table"
      >
        <table
          className="w-full min-w-[860px] table-fixed border-collapse text-sm tabular-nums"
          aria-label={m.nav_torrents()}
          aria-rowcount={rows.length}
        >
          <colgroup>
            {visibleColumns.map((c) => (
              <col key={c.id} style={c.columnDef.meta?.width ? { width: c.columnDef.meta.width } : undefined} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-[1] bg-background">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className={cn(
                      "h-10 whitespace-nowrap border-b px-2 text-left font-medium",
                      header.column.id === "select" && "pl-3",
                      header.column.columnDef.meta?.align === "right" && "text-right",
                    )}
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : undefined
                    }
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <ContextMenuTrigger asChild>
            <tbody>
              {padTop > 0 && (
                <tr aria-hidden>
                  <td colSpan={visibleColumns.length} style={{ height: padTop, padding: 0 }} />
                </tr>
              )}
              {items.map((item) => {
                const row = rows[item.index]!;
                const isSelected = row.getIsSelected();
                return (
                  <tr
                    key={row.id}
                    data-state={isSelected ? "selected" : undefined}
                    data-focused={focused === row.id || undefined}
                    aria-selected={isSelected}
                    aria-rowindex={item.index + 2}
                    style={{ height: rowHeight }}
                    className="border-b transition-colors last:border-b-0 hover:bg-muted/50 data-[state=selected]:bg-muted data-[focused]:shadow-[inset_2px_0_0_var(--ring)]"
                    onClick={(e) => onRowClick(e, row, item.index)}
                    onDoubleClick={() => onOpen(row.id)}
                    onContextMenu={() => onContextMenu(row)}
                    data-testid="torrent-row"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(
                          "overflow-hidden whitespace-nowrap px-2",
                          cell.column.id === "select" && "pl-3",
                          cell.column.columnDef.meta?.align === "right" && "text-right",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {padBottom > 0 && (
                <tr aria-hidden>
                  <td colSpan={visibleColumns.length} style={{ height: padBottom, padding: 0 }} />
                </tr>
              )}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length} className="h-32 text-center text-muted-foreground">
                    {m.no_torrents()}
                  </td>
                </tr>
              )}
            </tbody>
          </ContextMenuTrigger>
        </table>
      </div>
      <ContextMenuContent className="w-64" data-testid="torrent-context-menu">
        <TorrentMenuItems kit={contextKit} torrents={selected} />
      </ContextMenuContent>
    </ContextMenu>
  );
}
