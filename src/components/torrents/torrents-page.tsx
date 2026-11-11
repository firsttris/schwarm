import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { FilterIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMaindata } from "@/api/queries";
import type { Torrent } from "@/api/schemas";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { kindLabel, statusLabel } from "@/lib/labels";
import { lazyNamed, WhenUsed } from "@/lib/lazy";
import {
  countBy,
  filterTorrents,
  matchesStatus,
  type StatusKind,
  statusKind,
  type TextFilter,
  TRACKER_ERROR,
  TRACKER_WARNING,
  TRACKERLESS,
  textMatcher,
  UNCATEGORIZED,
} from "@/lib/torrents";
import { preferencesStore, usePreferences } from "@/lib/ui-preferences";
import { m } from "@/paraglide/messages.js";
import { Route, type TorrentsSearch } from "@/routes/torrents";
import { PageHeader } from "../page-header";
import { torrentColumns } from "./columns";
import { PhoneList } from "./phone-list";
import { RowActions } from "./row-actions";
import { TableFooter } from "./table-footer";
import { Toolbar } from "./toolbar";
import { TorrentDialogs } from "./torrent-dialogs";
import { TorrentTable } from "./torrent-table";

function crumbFor(search: TorrentsSearch): string {
  if (search.category) return search.category === UNCATEGORIZED ? m.uncategorized() : search.category;
  if (search.tag) return search.tag;
  if (search.tracker) {
    if (search.tracker === TRACKERLESS) return m.trackerless();
    if (search.tracker === TRACKER_ERROR) return m.tracker_error();
    if (search.tracker === TRACKER_WARNING) return m.tracker_warning();
    return search.tracker;
  }
  return statusLabel(search.status ?? "all");
}

/** "3 laden, 4 seeden, 2 gestoppt, 1 mit Fehler." */
function summary(torrents: Torrent[]): string {
  if (!torrents.length) return m.summary_empty();
  const parts = [
    [countBy(torrents, (t) => matchesStatus(t, "downloading")), m.summary_downloading],
    [countBy(torrents, (t) => matchesStatus(t, "seeding")), m.summary_seeding],
    [countBy(torrents, (t) => matchesStatus(t, "stopped")), m.summary_stopped],
    [countBy(torrents, (t) => matchesStatus(t, "errored")), m.summary_errored],
  ] as const;
  const text = parts
    .filter(([n]) => n > 0)
    .map(([n, msg]) => msg({ n }))
    .join(", ");
  return text ? `${text}.` : m.summary_count({ n: torrents.length });
}

// The details (with uPlot) load when a torrent is opened for the first time
const TorrentDetails = lazyNamed(() => import("../details/torrent-details"), "TorrentDetails");

export function TorrentsPage() {
  const search = useSearch({ from: Route.id });
  const navigate = useNavigate({ from: Route.fullPath });
  const { data } = useMaindata();
  const prefs = usePreferences();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();

  const [text, setText] = useState<TextFilter>({ text: "", field: "name", regex: false });
  const [statusFacet, setStatusFacet] = useState<string[]>([]);
  const [categoryFacet, setCategoryFacet] = useState<string[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pageIndexState, setPageIndex] = useState(0);

  const all = useMemo(() => Object.values(data?.torrents ?? {}), [data?.torrents]);
  // Sidebar filters (status, category, tag, tracker) from the URL
  const scoped = useMemo(
    () =>
      data
        ? filterTorrents(data, {
            status: search.status ?? "all",
            category: search.category,
            tag: search.tag,
            tracker: search.tracker,
          })
        : [],
    [data, search.status, search.category, search.tag, search.tracker],
  );
  // Filter field and faceted filters of the toolbar
  const rows = useMemo(() => {
    const match = textMatcher(text);
    const kinds = new Set(statusFacet);
    const cats = new Set(categoryFacet);
    return scoped.filter(
      (t) =>
        match(t) &&
        (!kinds.size || kinds.has(statusKind(t.state))) &&
        (!cats.size || cats.has(t.category || UNCATEGORIZED)),
    );
  }, [scoped, text, statusFacet, categoryFacet]);

  const openDetails = useCallback(
    (hash: string) => navigate({ search: (prev) => ({ ...prev, torrent: hash }) }),
    [navigate],
  );

  const columns = useMemo(
    () => torrentColumns({ onOpen: openDetails, actions: (t) => <RowActions torrent={t} /> }),
    [openDetails],
  );

  const columnVisibility = useMemo<VisibilityState>(() => {
    const visible = new Set(prefs.columns);
    return Object.fromEntries(
      columns.filter((c) => c.enableHiding !== false).map((c) => [c.id as string, visible.has(c.id as string)]),
    );
  }, [columns, prefs.columns]);

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (t) => t.hash,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      pagination: { pageIndex: pageIndexState, pageSize: prefs.pageSize },
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnVisibility) : updater;
      preferencesStore.set((p) => ({
        ...p,
        columns: columns.map((c) => c.id as string).filter((id) => next[id] ?? id === "name"),
      }));
    },
    onPaginationChange: (updater) => {
      const prev = { pageIndex: pageIndexState, pageSize: prefs.pageSize };
      const next = typeof updater === "function" ? updater(prev) : updater;
      setPageIndex(next.pageIndex);
      if (next.pageSize !== prefs.pageSize) preferencesStore.set((p) => ({ ...p, pageSize: next.pageSize }));
    },
    autoResetPageIndex: false,
    enableSortingRemoval: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Forget selected torrents that are gone
  useEffect(() => {
    const keys = Object.keys(rowSelection);
    if (keys.some((h) => !data?.torrents[h])) {
      setRowSelection(Object.fromEntries(keys.filter((h) => data?.torrents[h]).map((h) => [h, true])));
    }
  }, [data?.torrents, rowSelection]);

  // Back to the first page when the filters change
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on filter change only
  useEffect(
    () => setPageIndex(0),
    [search.status, search.category, search.tag, search.tracker, text, statusFacet, categoryFacet],
  );

  const selected = useMemo(
    () =>
      Object.keys(rowSelection)
        .map((h) => data?.torrents[h])
        .filter((t): t is Torrent => !!t),
    [rowSelection, data?.torrents],
  );

  const statusOptions = useMemo(() => {
    const counts = new Map<StatusKind, number>();
    for (const t of scoped) counts.set(statusKind(t.state), (counts.get(statusKind(t.state)) ?? 0) + 1);
    return [...counts.entries()].map(([kind, count]) => ({ value: kind, label: kindLabel(kind), count }));
  }, [scoped]);

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of scoped) counts.set(t.category || UNCATEGORIZED, (counts.get(t.category || UNCATEGORIZED) ?? 0) + 1);
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, label: value === UNCATEGORIZED ? m.uncategorized() : value, count }));
  }, [scoped]);

  const crumb = crumbFor(search);
  const phoneStatus = search.status ?? "all";

  return (
    <>
      <PageHeader
        crumbs={[m.nav_torrents(), crumb]}
        title={m.nav_torrents()}
        phoneActions={
          <Button
            variant="outline"
            size="icon"
            className="size-11"
            aria-label={m.filters()}
            onClick={() => setOpenMobile(true)}
          >
            <FilterIcon />
          </Button>
        }
        phoneExtra={
          <Tabs
            value={["all", "downloading", "seeding", "errored"].includes(phoneStatus) ? phoneStatus : ""}
            onValueChange={(v) =>
              navigate({
                search: (prev) => ({ ...prev, status: v === "all" ? undefined : (v as TorrentsSearch["status"]) }),
              })
            }
          >
            <TabsList className="h-11 w-full">
              {(["all", "downloading", "seeding", "errored"] as const).map((f) => (
                <TabsTrigger key={f} value={f} className="tabular-nums">
                  {f === "all" ? statusLabel(f) : `${statusLabel(f)} ${countBy(all, (t) => matchesStatus(t, f))}`}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />
      {isMobile ? (
        <PhoneList table={table} onOpen={openDetails} />
      ) : (
        <main className="flex min-w-0 flex-1 flex-col gap-4 px-6 py-5">
          <div className="flex flex-col gap-1">
            <h1 className="font-semibold text-2xl tracking-tight">{m.nav_torrents()}</h1>
            <p className="text-muted-foreground" data-testid="summary">
              {summary(scoped)}
            </p>
          </div>
          <Toolbar
            table={table}
            text={text}
            onText={setText}
            selected={selected}
            facets={[
              { title: m.col_status(), options: statusOptions, selected: statusFacet, onChange: setStatusFacet },
              {
                title: m.col_category(),
                options: categoryOptions,
                selected: categoryFacet,
                onChange: setCategoryFacet,
              },
            ]}
          />
          <TorrentTable table={table} selected={selected} onOpen={openDetails} />
          <TableFooter table={table} />
        </main>
      )}
      <WhenUsed active={!!search.torrent}>
        <TorrentDetails hash={search.torrent} />
      </WhenUsed>
      <TorrentDialogs
        onRemoved={(hashes) => {
          if (search.torrent && hashes.includes(search.torrent))
            navigate({ search: (prev) => ({ ...prev, torrent: undefined }) });
        }}
      />
    </>
  );
}
