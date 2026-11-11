import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownUpIcon,
  ArrowDownWideNarrowIcon,
  ArrowUpNarrowWideIcon,
  CheckIcon,
  CircleAlertIcon,
  CirclePlusIcon,
  DownloadIcon,
  LoaderCircleIcon,
  PuzzleIcon,
  SearchIcon,
  SquareIcon,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { ApiError, api } from "@/api/client";
import { authState, useMaindata } from "@/api/queries";
import type { SearchPlugin, SearchResult } from "@/api/schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { openAddDialog } from "@/lib/add-dialog";
import { formatBytes, formatNumber, formatRelative } from "@/lib/format";
import { createMemoryStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages.js";
import { PageHeader } from "../page-header";
import { FacetedFilter } from "../torrents/faceted-filter";

/** The running or last search; kept while the user visits other pages. */
interface SearchState {
  id?: number;
  pattern: string;
  category: string;
  /** Plugin names to search with; empty means the enabled ones. */
  plugins: string[];
  error?: "python" | "failed";
}
const searchStore = createMemoryStore<SearchState>({ pattern: "", category: "all", plugins: [] });

interface Accumulated {
  status: string;
  results: SearchResult[];
}

/** search/results is fetched from the last offset, every second while the search runs. */
function useSearchResults(id: number | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["search", id],
    queryFn: async (): Promise<Accumulated> => {
      const prev = queryClient.getQueryData<Accumulated>(["search", id]);
      const res = await api.searchResults(id!, prev?.results.length ?? 0);
      return { status: res.status, results: [...(prev?.results ?? []), ...res.results] };
    },
    enabled: id !== undefined,
    refetchInterval: (q) => (q.state.data?.status === "Stopped" ? false : 1000),
    structuralSharing: false,
    gcTime: Number.POSITIVE_INFINITY,
  });
}

export function useSearchPlugins() {
  return useQuery({ queryKey: ["searchPlugins"], queryFn: api.searchPlugins, staleTime: 30_000 });
}

type SortKey = "name" | "size" | "seeds" | "peers" | "engine" | "date";

function SortButton({
  label,
  k,
  sort,
  onSort,
  right,
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; desc: boolean } | null;
  onSort: (k: SortKey) => void;
  right?: boolean;
}) {
  const active = sort?.key === k;
  const Icon = !active ? ArrowDownUpIcon : sort.desc ? ArrowDownWideNarrowIcon : ArrowUpNarrowWideIcon;
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-mx-3 h-8", right && "flex-row-reverse", !active && "[&_svg]:opacity-0 hover:[&_svg]:opacity-100")}
      onClick={() => onSort(k)}
      aria-label={m.sort_by({ column: label })}
    >
      {label}
      <Icon className="size-3.5 text-muted-foreground" aria-hidden />
    </Button>
  );
}

/** Mind. Seeds and size range, client-side filters of the results. */
function NumberFilter({
  title,
  value,
  onChange,
  presets,
  format,
}: {
  title: string;
  value: number;
  onChange: (v: number) => void;
  presets: number[];
  format: (v: number) => string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed">
          <CirclePlusIcon />
          {title}
          {value > 0 && (
            <>
              <Separator orientation="vertical" className="mx-0.5 data-[orientation=vertical]:h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                {format(value)}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        {[0, ...presets].map((p) => (
          <button
            key={p}
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => onChange(p)}
          >
            <CheckIcon className={cn("size-4", value !== p && "invisible")} aria-hidden />
            {p === 0 ? m.search_filter_any() : format(p)}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/**
 * The search page (docs/mockup/Suche.dc.html): search/start with the chosen plugins and
 * category, results polled with search/results, filtered by source, seeds and size, and
 * "Laden" opens the add dialog with the link and the plugin as downloader (as search.js).
 */
export function SearchPage() {
  const state = searchStore.use();
  const plugins = useSearchPlugins();
  const results = useSearchResults(state.id);
  const { data: main } = useMaindata();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [pattern, setPattern] = useState(state.pattern);
  const [busy, setBusy] = useState(false);
  const [engineFilter, setEngineFilter] = useState<string[]>([]);
  const [minSeeds, setMinSeeds] = useState(0);
  const [maxSize, setMaxSize] = useState(0);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean } | null>({ key: "seeds", desc: true });

  const allPlugins: SearchPlugin[] = plugins.data ?? [];
  const enabled = allPlugins.filter((p) => p.enabled);
  const running = results.data?.status === "Running" || (state.id !== undefined && results.isPending);
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of enabled) for (const c of p.supportedCategories) if (c.id !== "all") map.set(c.id, c.name);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [enabled]);

  const start = async (event?: FormEvent, override: Partial<SearchState> = {}) => {
    event?.preventDefault();
    const next = { ...state, ...override, pattern: (override.pattern ?? pattern).trim() };
    if (!next.pattern) return;
    setBusy(true);
    try {
      if (state.id !== undefined) {
        await api.searchDelete(state.id).catch(() => undefined);
        queryClient.removeQueries({ queryKey: ["search", state.id] });
      }
      const id = await api.searchStart(next.pattern, next.category, next.plugins.length ? next.plugins : "enabled");
      searchStore.set({ ...next, id, error: undefined });
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) authState.set(true);
      searchStore.set({
        ...next,
        id: undefined,
        error: error instanceof ApiError && error.status === 409 ? "python" : "failed",
      });
    } finally {
      setBusy(false);
    }
  };

  const stop = () => {
    if (state.id === undefined) return;
    void api.searchStop(state.id).then(() => queryClient.invalidateQueries({ queryKey: ["search", state.id] }));
  };

  const inList = useMemo(() => {
    const names = new Set(Object.values(main?.torrents ?? {}).map((t) => t.name.toLowerCase()));
    const hashes = new Set(Object.keys(main?.torrents ?? {}));
    return (r: SearchResult) => {
      const hash = /btih:([0-9a-f]{40})/i.exec(r.fileUrl)?.[1]?.toLowerCase();
      return (hash !== undefined && hashes.has(hash)) || names.has(r.fileName.toLowerCase());
    };
  }, [main?.torrents]);

  const rows = useMemo(() => {
    const list = (results.data?.results ?? []).filter(
      (r) =>
        (!engineFilter.length || engineFilter.includes(r.engineName)) &&
        (minSeeds === 0 || r.nbSeeders >= minSeeds) &&
        (maxSize === 0 || (r.fileSize >= 0 && r.fileSize <= maxSize)),
    );
    if (!sort) return list;
    const value = (r: SearchResult): number | string =>
      sort.key === "name"
        ? r.fileName.toLowerCase()
        : sort.key === "size"
          ? r.fileSize
          : sort.key === "seeds"
            ? r.nbSeeders
            : sort.key === "peers"
              ? r.nbLeechers
              : sort.key === "engine"
                ? r.engineName
                : r.pubDate;
    return [...list].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      const c = typeof x === "string" ? x.localeCompare(String(y)) : x - (y as number);
      return sort.desc ? -c : c;
    });
  }, [results.data, engineFilter, minSeeds, maxSize, sort]);

  const onSort = (key: SortKey) =>
    setSort((prev) =>
      prev?.key === key ? (prev.desc ? { key, desc: false } : null) : { key, desc: key !== "name" && key !== "engine" },
    );

  const download = (r: SearchResult) => {
    const plugin = allPlugins.find((p) => p.fullName === r.engineName || p.name === r.engineName);
    openAddDialog({ links: r.fileUrl, downloader: r.fileUrl.startsWith("magnet:") ? undefined : plugin?.name });
  };

  const engineOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of results.data?.results ?? []) counts.set(r.engineName, (counts.get(r.engineName) ?? 0) + 1);
    return [...counts.entries()].map(([value, count]) => ({ value, label: value, count }));
  }, [results.data]);

  const total = results.data?.results.length ?? 0;
  const GB = 1000 * 1000 * 1000;

  const action = (r: SearchResult) =>
    inList(r) ? (
      <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <CheckIcon className="size-4" aria-hidden />
        {m.search_in_list()}
      </span>
    ) : (
      <Button
        variant="outline"
        size="sm"
        onClick={() => download(r)}
        aria-label={m.search_download_name({ name: r.fileName })}
      >
        <DownloadIcon />
        {m.search_download()}
      </Button>
    );

  const nameCell = (r: SearchResult) => (
    <span className="flex min-w-0 flex-col gap-0.5">
      {r.descrLink ? (
        <a
          href={r.descrLink}
          target="_blank"
          rel="noreferrer noopener"
          className="truncate font-medium hover:underline"
          title={m.search_open_description()}
        >
          {r.fileName}
        </a>
      ) : (
        <span className="truncate font-medium">{r.fileName}</span>
      )}
      <span className="text-[13px] text-muted-foreground">{formatRelative(r.pubDate)}</span>
    </span>
  );

  return (
    <>
      <PageHeader crumbs={[m.nav_search()]} title={m.nav_search()} />
      <main className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
        <div className="hidden flex-col gap-1 md:flex">
          <h1 className="font-semibold text-2xl tracking-tight">{m.nav_search()}</h1>
          <p className="text-muted-foreground">{m.search_intro()}</p>
        </div>

        {plugins.isSuccess && allPlugins.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
            <PuzzleIcon className="size-6 text-muted-foreground" aria-hidden />
            <h2 className="font-semibold">{m.search_no_plugins()}</h2>
            <p className="max-w-md text-muted-foreground text-sm">{m.search_no_plugins_text()}</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/settings" search={{ section: "search" }}>
                {m.search_manage_plugins()}
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <search>
              <form onSubmit={start} className="flex max-w-[720px] flex-wrap gap-2">
                <div className="relative min-w-[220px] flex-1">
                  <SearchIcon
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    placeholder={m.search_placeholder()}
                    aria-label={m.search_term()}
                    className="pl-9"
                    autoFocus={!isMobile}
                  />
                </div>
                <Select
                  value={state.category}
                  onValueChange={(category) => {
                    searchStore.set((s) => ({ ...s, category }));
                    if (state.pattern) void start(undefined, { category });
                  }}
                >
                  <SelectTrigger className="w-44" aria-label={m.category()}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{m.search_all_categories()}</SelectItem>
                    {categories.map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {running ? (
                  <Button type="button" variant="outline" onClick={stop}>
                    <SquareIcon /> {m.search_stop()}
                  </Button>
                ) : (
                  <Button type="submit" disabled={busy || !pattern.trim()}>
                    {m.search_submit()}
                  </Button>
                )}
              </form>
            </search>

            {state.error && (
              <p role="alert" className="flex items-center gap-2 text-destructive text-sm">
                <CircleAlertIcon className="size-4" aria-hidden />
                {state.error === "python" ? m.search_python() : m.search_failed()}
              </p>
            )}

            {state.id !== undefined && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <FacetedFilter
                    title={m.search_sources()}
                    options={engineOptions}
                    selected={engineFilter}
                    onChange={setEngineFilter}
                  />
                  <NumberFilter
                    title={m.search_min_seeds()}
                    value={minSeeds}
                    onChange={setMinSeeds}
                    presets={[1, 10, 50, 100]}
                    format={(v) => `≥ ${formatNumber(v)}`}
                  />
                  <NumberFilter
                    title={m.search_max_size()}
                    value={maxSize}
                    onChange={setMaxSize}
                    presets={[GB, 5 * GB, 10 * GB, 50 * GB]}
                    format={(v) => `≤ ${formatBytes(v)}`}
                  />
                  <span
                    className="ml-auto inline-flex items-center gap-2 text-[13px] text-muted-foreground tabular-nums"
                    data-testid="search-status"
                  >
                    {running && <LoaderCircleIcon className="size-4 animate-spin" aria-hidden />}
                    {running ? m.search_status_running({ n: total }) : m.search_status_done({ n: total })}
                    {rows.length !== total && ` · ${m.search_status_shown({ n: rows.length })}`}
                  </span>
                </div>

                {isMobile ? (
                  <div className="-mx-4 border-t" data-testid="search-results">
                    {rows.map((r) => (
                      <div key={r.fileUrl + r.engineName} className="flex flex-col gap-2 border-b px-4 py-3">
                        {nameCell(r)}
                        <div className="flex items-center justify-between gap-3 text-[13px] tabular-nums">
                          <span className="text-muted-foreground">
                            {formatBytes(r.fileSize)} ·{" "}
                            {m.search_seeds_peers({
                              seeds: formatNumber(Math.max(0, r.nbSeeders)),
                              peers: formatNumber(Math.max(0, r.nbLeechers)),
                            })}{" "}
                            · {r.engineName}
                          </span>
                          {action(r)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[760px] text-sm tabular-nums" data-testid="search-results">
                      <thead>
                        <tr className="border-b">
                          <th className="h-10 px-3 text-left font-medium">
                            <SortButton label={m.col_name()} k="name" sort={sort} onSort={onSort} />
                          </th>
                          <th className="h-10 w-24 px-2 text-right font-medium">
                            <SortButton label={m.col_size()} k="size" sort={sort} onSort={onSort} right />
                          </th>
                          <th className="h-10 w-24 px-2 text-right font-medium">
                            <SortButton label={m.col_seeds()} k="seeds" sort={sort} onSort={onSort} right />
                          </th>
                          <th className="h-10 w-24 px-2 text-right font-medium">
                            <SortButton label={m.col_peers()} k="peers" sort={sort} onSort={onSort} right />
                          </th>
                          <th className="h-10 w-44 px-2 text-left font-medium">
                            <SortButton label={m.search_source()} k="engine" sort={sort} onSort={onSort} />
                          </th>
                          <th className="h-10 w-32 px-3">
                            <span className="sr-only">{m.actions()}</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.fileUrl + r.engineName} className="border-b last:border-b-0 hover:bg-muted/50">
                            <td className="max-w-0 px-3 py-2">{nameCell(r)}</td>
                            <td className="px-2 text-right">{r.fileSize >= 0 ? formatBytes(r.fileSize) : "–"}</td>
                            <td className="px-2 text-right font-medium">
                              {r.nbSeeders >= 0 ? formatNumber(r.nbSeeders) : "–"}
                            </td>
                            <td className="px-2 text-right text-muted-foreground">
                              {r.nbLeechers >= 0 ? formatNumber(r.nbLeechers) : "–"}
                            </td>
                            <td className="px-2">
                              <Badge variant="outline">{r.engineName}</Badge>
                            </td>
                            <td className="px-3 text-right">{action(r)}</td>
                          </tr>
                        ))}
                        {rows.length === 0 && (
                          <tr>
                            <td colSpan={6} className="h-24 text-center text-muted-foreground">
                              {running ? m.search_waiting() : m.no_results()}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {state.id === undefined && !state.error && (
              <p className="text-muted-foreground text-sm">
                {m.search_sources_hint({ n: enabled.length })}{" "}
                <Link
                  to="/settings"
                  search={{ section: "search" }}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {m.search_manage_plugins()}
                </Link>
              </p>
            )}
          </>
        )}
      </main>
    </>
  );
}
