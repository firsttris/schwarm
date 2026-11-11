import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "@tanstack/react-router";
import {
  ChartColumnIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  CircleAlertIcon,
  CircleArrowDownIcon,
  CircleArrowUpIcon,
  CirclePauseIcon,
  CirclePlayIcon,
  FolderIcon,
  ListIcon,
  LogOutIcon,
  type LucideIcon,
  MonitorIcon,
  MoonIcon,
  PauseIcon,
  PlayIcon,
  RssIcon,
  SearchIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
  SunIcon,
  TagsIcon,
} from "lucide-react";
import { useMemo } from "react";
import { api } from "@/api/client";
import { authState, resetMaindata, useMaindata, useRunAction, useVersion } from "@/api/queries";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { statusLabel } from "@/lib/labels";
import { type Theme, useTheme } from "@/lib/theme";
import {
  categoryTree,
  countBy,
  mainStatusFilters,
  matchesCategory,
  matchesStatus,
  matchesTag,
  type StatusFilter,
  statusFilters,
  TRACKER_ERROR,
  TRACKER_WARNING,
  TRACKERLESS,
  trackerHosts,
  UNCATEGORIZED,
} from "@/lib/torrents";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages.js";
import type { TorrentsSearch } from "@/routes/torrents";
import { openManage } from "./categories-dialog";
import { ConnectionCard } from "./connection";
import { Logo } from "./logo";

const statusIcons: Partial<Record<StatusFilter, LucideIcon>> = {
  all: ListIcon,
  downloading: CircleArrowDownIcon,
  seeding: CircleArrowUpIcon,
  stopped: CirclePauseIcon,
  errored: CircleAlertIcon,
};

function AppMenu() {
  const version = useVersion();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const run = useRunAction();
  const { data } = useMaindata();
  const paused = data?.serverState.session_state ?? false;
  const logout = async () => {
    await api.logout().catch(() => undefined);
    resetMaindata();
    queryClient.clear();
    authState.set(true);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent" data-testid="app-menu">
          <Logo />
          <span className="grid flex-1 text-left leading-tight">
            <span className="font-semibold">Schwarm</span>
            <span className="truncate text-muted-foreground text-xs">
              {version.data ? `qBittorrent ${version.data.replace(/^v/, "")}` : "qBittorrent"}
            </span>
          </span>
          <ChevronsUpDownIcon className="ml-auto text-muted-foreground" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60" align="start">
        <DropdownMenuLabel className="text-muted-foreground text-xs">{m.nav_torrents()}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => run(() => api.start(["all"]), { success: m.toast_all_started() })}>
          <CirclePlayIcon /> {m.start_all()}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(() => api.stop(["all"]), { success: m.toast_all_stopped() })}>
          <CirclePauseIcon /> {m.stop_all()}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => run(() => (paused ? api.resumeSession() : api.pauseSession()))}
          title={m.pause_session_hint()}
        >
          {paused ? <PlayIcon /> : <PauseIcon />} {paused ? m.resume_session() : m.pause_session()}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openManage("categories")}>
          <TagsIcon /> {m.manage_menu()}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground text-xs">{m.appearance()}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)}>
          <DropdownMenuRadioItem value="light">
            <SunIcon /> {m.theme_light()}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <MoonIcon /> {m.theme_dark()}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <MonitorIcon /> {m.theme_system()}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <SlidersHorizontalIcon /> {m.nav_settings()}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={logout}>
          <LogOutIcon /> {m.logout()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Count({ n }: { n: number }) {
  return <SidebarMenuBadge className="text-muted-foreground tabular-nums">{n}</SidebarMenuBadge>;
}

export function AppSidebar() {
  const { data } = useMaindata();
  const { pathname } = useLocation();
  const search = useSearch({ strict: false }) as TorrentsSearch;
  const { setOpenMobile } = useSidebar();
  const onTorrents = pathname === "/torrents";
  const status = search.status ?? "all";
  const close = () => setOpenMobile(false);

  const torrents = useMemo(() => Object.values(data?.torrents ?? {}), [data?.torrents]);
  const categories = useMemo(() => categoryTree(Object.keys(data?.categories ?? {})), [data?.categories]);
  const hosts = useMemo(() => trackerHosts(data?.trackers ?? {}), [data?.trackers]);
  const moreStatus = statusFilters.filter((f) => !mainStatusFilters.includes(f));
  const moreActive = onTorrents && moreStatus.includes(status);

  const statusLink = (filter: StatusFilter) => {
    const Icon = statusIcons[filter];
    const active = onTorrents && status === filter;
    return (
      <SidebarMenuItem key={filter}>
        <SidebarMenuButton asChild isActive={active} className={cn(filter === "errored" && "")}>
          <Link
            to="/torrents"
            search={(prev: TorrentsSearch) => ({
              ...prev,
              status: filter === "all" ? undefined : filter,
              torrent: undefined,
            })}
            onClick={close}
            aria-current={active ? "page" : undefined}
          >
            {Icon && <Icon />}
            <span>{statusLabel(filter)}</span>
          </Link>
        </SidebarMenuButton>
        <Count n={countBy(torrents, (t) => matchesStatus(t, filter))} />
      </SidebarMenuItem>
    );
  };

  const toggle =
    <K extends "category" | "tag" | "tracker">(key: K, value: string) =>
    (prev: TorrentsSearch) => ({ ...prev, [key]: prev[key] === value ? undefined : value, torrent: undefined });

  const uncategorized = countBy(torrents, (t) => t.category === "");
  const trackerError = countBy(torrents, (t) => t.has_tracker_error);
  const trackerWarning = countBy(torrents, (t) => t.has_tracker_warning);
  const trackerless = countBy(torrents, (t) => t.trackers_count === 0);

  return (
    <Sidebar variant="inset" collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <AppMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{m.nav_torrents()}</SidebarGroupLabel>
          <SidebarMenu aria-label={m.status()}>
            {mainStatusFilters.map(statusLink)}
            <Collapsible asChild defaultOpen={moreActive} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton className="text-muted-foreground">
                    <ChevronRightIcon className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    <span>{m.more()}</span>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {moreStatus.map((filter) => (
                      <SidebarMenuSubItem key={filter}>
                        <SidebarMenuSubButton asChild isActive={onTorrents && status === filter}>
                          <Link
                            to="/torrents"
                            search={(prev: TorrentsSearch) => ({ ...prev, status: filter, torrent: undefined })}
                            onClick={close}
                          >
                            <span>{statusLabel(filter)}</span>
                            <span className="ml-auto text-muted-foreground text-xs tabular-nums">
                              {countBy(torrents, (t) => matchesStatus(t, filter))}
                            </span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{m.categories()}</SidebarGroupLabel>
          <SidebarGroupAction title={m.manage_categories()} onClick={() => openManage("categories")}>
            <Settings2Icon />
            <span className="sr-only">{m.manage_categories()}</span>
          </SidebarGroupAction>
          <SidebarMenu aria-label={m.categories()}>
            {categories.map((c) => (
              <SidebarMenuItem key={c.name}>
                <SidebarMenuButton asChild isActive={onTorrents && search.category === c.name}>
                  <Link to="/torrents" search={toggle("category", c.name)} onClick={close} title={c.name}>
                    <FolderIcon style={{ marginLeft: c.depth * 12 }} />
                    <span>{c.label}</span>
                  </Link>
                </SidebarMenuButton>
                <Count n={countBy(torrents, (t) => matchesCategory(t, c.name))} />
              </SidebarMenuItem>
            ))}
            {uncategorized > 0 && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={onTorrents && search.category === UNCATEGORIZED}>
                  <Link to="/torrents" search={toggle("category", UNCATEGORIZED)} onClick={close}>
                    <FolderIcon className="text-muted-foreground" />
                    <span className="text-muted-foreground">{m.uncategorized()}</span>
                  </Link>
                </SidebarMenuButton>
                <Count n={uncategorized} />
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>

        {(data?.tags.length ?? 0) > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{m.tags()}</SidebarGroupLabel>
            <SidebarGroupAction title={m.manage_tags()} onClick={() => openManage("tags")}>
              <Settings2Icon />
              <span className="sr-only">{m.manage_tags()}</span>
            </SidebarGroupAction>
            <ul className="flex flex-wrap gap-1.5 px-2" aria-label={m.tags()}>
              {data?.tags.map((tag) => {
                const active = onTorrents && search.tag === tag;
                return (
                  <li key={tag}>
                    <Link
                      to="/torrents"
                      search={toggle("tag", tag)}
                      onClick={close}
                      aria-current={active ? "true" : undefined}
                      title={m.tag_count({ n: countBy(torrents, (t) => matchesTag(t, tag)) })}
                      className={cn(
                        "inline-flex h-[22px] items-center rounded-md border px-2 font-medium text-xs transition-colors hover:bg-sidebar-accent",
                        active && "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
                      )}
                    >
                      {tag}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>{m.trackers()}</SidebarGroupLabel>
          <SidebarMenu aria-label={m.trackers()}>
            {[...hosts.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([host, set]) => (
                <SidebarMenuItem key={host}>
                  <SidebarMenuButton asChild isActive={onTorrents && search.tracker === host}>
                    <Link to="/torrents" search={toggle("tracker", host)} onClick={close} title={host}>
                      <span>{host}</span>
                    </Link>
                  </SidebarMenuButton>
                  <Count n={set.size} />
                </SidebarMenuItem>
              ))}
            {trackerless > 0 && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={onTorrents && search.tracker === TRACKERLESS}>
                  <Link to="/torrents" search={toggle("tracker", TRACKERLESS)} onClick={close}>
                    <span className="text-muted-foreground">{m.trackerless()}</span>
                  </Link>
                </SidebarMenuButton>
                <Count n={trackerless} />
              </SidebarMenuItem>
            )}
            {trackerWarning > 0 && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={onTorrents && search.tracker === TRACKER_WARNING}>
                  <Link to="/torrents" search={toggle("tracker", TRACKER_WARNING)} onClick={close}>
                    <span>{m.tracker_warning()}</span>
                  </Link>
                </SidebarMenuButton>
                <Count n={trackerWarning} />
              </SidebarMenuItem>
            )}
            {trackerError > 0 && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={onTorrents && search.tracker === TRACKER_ERROR}
                  className="text-destructive hover:text-destructive data-[active=true]:text-destructive"
                >
                  <Link to="/torrents" search={toggle("tracker", TRACKER_ERROR)} onClick={close}>
                    <span>{m.tracker_error()}</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuBadge className="text-destructive tabular-nums">{trackerError}</SidebarMenuBadge>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{m.areas()}</SidebarGroupLabel>
          <SidebarMenu>
            {(
              [
                ["/search", SearchIcon, m.nav_search()],
                ["/rss", RssIcon, m.nav_rss()],
                ["/statistics", ChartColumnIcon, m.nav_statistics()],
                ["/settings", SlidersHorizontalIcon, m.nav_settings()],
              ] as const
            ).map(([to, Icon, label]) => (
              <SidebarMenuItem key={to}>
                <SidebarMenuButton asChild isActive={pathname === to}>
                  <Link to={to} onClick={close}>
                    <Icon />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <ConnectionCard />
      </SidebarFooter>
    </Sidebar>
  );
}
