import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeftIcon,
  CircleAlertIcon,
  DownloadIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  FolderPlusIcon,
  PlusIcon,
  RefreshCwIcon,
  RssIcon,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { api } from "@/api/client";
import { useRunAction } from "@/api/queries";
import type { RssTree } from "@/api/schemas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { openAddDialog } from "@/lib/add-dialog";
import { formatDate, formatRelative } from "@/lib/format";
import {
  type ArticleEntry,
  collectArticles,
  type FeedEntry,
  flattenRss,
  markReadInTree,
  plainText,
  RSS_SEPARATOR,
} from "@/lib/rss";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages.js";
import { InputDialog, type InputDialogState } from "../details/input-dialog";
import { rssItemsKey, useRssItems } from "./rss-query";

const ALL = "\u0000all";
const ROOT = "\u0000root";

function AddFeedDialog({ open, folders, onClose }: { open: boolean; folders: string[]; onClose: () => void }) {
  const run = useRunAction();
  const [url, setUrl] = useState("");
  const [folder, setFolder] = useState(ROOT);
  const [name, setName] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!url.trim()) return;
    const title = name.trim() || url.trim();
    const path = folder === ROOT ? title : `${folder}${RSS_SEPARATOR}${title}`;
    onClose();
    setUrl("");
    setName("");
    await run(() => api.rssAddFeed(url.trim(), path), {
      success: m.toast_feed_added(),
      invalidate: [[...rssItemsKey]],
    });
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{m.rss_add_feed_title()}</DialogTitle>
            <DialogDescription>{m.rss_add_feed_text()}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="feed-url">{m.url()}</Label>
            <Input
              id="feed-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…/rss"
              className="font-mono text-[13px]"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="feed-name">{m.name()}</Label>
              <Input
                id="feed-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={m.rss_name_optional()}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="feed-folder">{m.rss_folder()}</Label>
              <Select value={folder} onValueChange={setFolder}>
                <SelectTrigger id="feed-folder" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROOT}>{m.rss_folder_none()}</SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f.replaceAll(RSS_SEPARATOR, " / ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {m.cancel()}
            </Button>
            <Button type="submit" disabled={!url.trim()}>
              {m.add()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Feeds, articles and the open article (docs/mockup/RSS.dc.html). Descriptions are shown as
 * plain text, since they are HTML from other sites. "Laden" opens the add dialog with the
 * article's torrent link; "Regel daraus machen" starts a rule from the title.
 */
export function FeedsView() {
  const { data, isPending, dataUpdatedAt } = useRssItems();
  const queryClient = useQueryClient();
  const run = useRunAction();
  const isMobile = useIsMobile();
  const [selectedFeed, setSelectedFeed] = useState<string>(ALL);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [addingFeed, setAddingFeed] = useState(false);
  const [dialog, setDialog] = useState<InputDialogState | null>(null);
  const key = [[...rssItemsKey]];

  const { feeds, folders } = useMemo(() => flattenRss(data ?? {}), [data]);
  const shownFeeds = selectedFeed === ALL ? feeds : feeds.filter((f) => f.path === selectedFeed);
  const articles = useMemo(() => collectArticles(shownFeeds), [shownFeeds]);
  const article = articles.find((a) => `${a.feedPath}|${a.id}` === selectedArticle);
  const totalUnread = feeds.reduce((s, f) => s + f.unread, 0);

  const markRead = (feedPath: string, articleId?: string) => {
    queryClient.setQueryData<RssTree>(rssItemsKey, (tree) => (tree ? markReadInTree(tree, feedPath, articleId) : tree));
    void api.rssMarkAsRead(feedPath, articleId).catch(() => queryClient.invalidateQueries({ queryKey: rssItemsKey }));
  };

  const open = (a: ArticleEntry) => {
    setSelectedArticle(`${a.feedPath}|${a.id}`);
    if (!a.isRead) markRead(a.feedPath, a.id);
  };

  const rename = (path: string, current: string) =>
    setDialog({
      title: m.rss_rename_title(),
      label: m.name(),
      initial: current,
      submit: m.save(),
      onSubmit: (name) => {
        const parent = path.split(RSS_SEPARATOR).slice(0, -1).join(RSS_SEPARATOR);
        const dest = parent ? `${parent}${RSS_SEPARATOR}${name}` : name;
        if (selectedFeed === path) setSelectedFeed(dest);
        void run(() => api.rssMoveItem(path, dest), { invalidate: key });
      },
    });

  const feedMenu = (f: FeedEntry) => (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="size-7 opacity-0 group-hover/feed:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
          aria-label={m.actions_for({ name: f.name })}
        >
          <EllipsisIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() =>
            run(() => api.rssRefreshItem(f.path), { success: m.toast_feed_refreshing(), invalidate: key })
          }
        >
          {m.rss_refresh()}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => markRead(f.path)}>{m.rss_mark_all_read()}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => rename(f.path, f.name)}>{m.action_rename()}</DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            setDialog({
              title: m.rss_edit_url_title(),
              label: m.url(),
              initial: f.feed.url,
              submit: m.save(),
              onSubmit: (url) => run(() => api.rssSetFeedUrl(f.path, url), { invalidate: key }),
            })
          }
        >
          {m.rss_edit_url()}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            if (selectedFeed === f.path) setSelectedFeed(ALL);
            void run(() => api.rssRemoveItem(f.path), {
              success: m.toast_feed_removed({ name: f.name }),
              invalidate: key,
            });
          }}
        >
          {m.remove()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (isPending) return <Skeleton className="h-96 w-full" />;

  const folderNames = [...new Set(feeds.map((f) => f.folder))];
  const emptyFolders = folders.filter((f) => !folderNames.includes(f));

  const nav = (
    <nav aria-label={m.rss_feeds()} className="flex flex-col gap-0.5 text-sm" data-testid="feed-list">
      <button
        type="button"
        onClick={() => {
          setSelectedFeed(ALL);
          setSelectedArticle(null);
        }}
        aria-current={selectedFeed === ALL ? "true" : undefined}
        className={cn(
          "flex h-8 items-center rounded-md px-2 text-left hover:bg-muted",
          selectedFeed === ALL && "bg-muted font-medium",
        )}
      >
        {m.rss_all_articles()}
        <span className="ml-auto text-muted-foreground text-xs tabular-nums">{totalUnread || ""}</span>
      </button>
      {[...folderNames, ...emptyFolders].map((folder) => (
        <div key={folder || ROOT} className="flex flex-col gap-0.5">
          {folder && (
            <div className="group/feed flex h-8 items-center px-2 font-medium text-muted-foreground text-xs">
              <span className="flex-1 truncate">{folder.replaceAll(RSS_SEPARATOR, " / ")}</span>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="size-6 opacity-0 group-hover/feed:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                    aria-label={m.actions_for({ name: folder })}
                  >
                    <EllipsisIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => markRead(folder)}>{m.rss_mark_all_read()}</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => rename(folder, folder.split(RSS_SEPARATOR).pop() ?? folder)}>
                    {m.action_rename()}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => run(() => api.rssRemoveItem(folder), { invalidate: key })}
                  >
                    {m.remove()}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          {feeds
            .filter((f) => f.folder === folder)
            .map((f) => (
              <div
                key={f.path}
                className={cn(
                  "group/feed flex items-center rounded-md hover:bg-muted",
                  selectedFeed === f.path && "bg-muted",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFeed(f.path);
                    setSelectedArticle(null);
                  }}
                  aria-current={selectedFeed === f.path ? "true" : undefined}
                  className={cn(
                    "flex h-8 min-w-0 flex-1 items-center gap-2 px-2 text-left",
                    selectedFeed === f.path && "font-medium",
                    f.feed.hasError && "text-muted-foreground",
                  )}
                  title={f.feed.hasError ? m.rss_feed_error() : f.feed.url}
                >
                  {f.feed.hasError && <CircleAlertIcon className="size-4 shrink-0" aria-label={m.rss_feed_error()} />}
                  <span className="truncate">{f.name}</span>
                  <span className="ml-auto text-muted-foreground text-xs tabular-nums">{f.unread || ""}</span>
                </button>
                {feedMenu(f)}
              </div>
            ))}
        </div>
      ))}
      <div className="mt-2 flex gap-2 px-1">
        <Button variant="outline" size="sm" onClick={() => setAddingFeed(true)}>
          <PlusIcon /> {m.rss_feed()}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setDialog({
              title: m.rss_add_folder_title(),
              label: m.name(),
              submit: m.add(),
              onSubmit: (name) => run(() => api.rssAddFolder(name), { invalidate: key }),
            })
          }
        >
          <FolderPlusIcon /> {m.rss_folder()}
        </Button>
      </div>
    </nav>
  );

  const list = (
    <section aria-label={m.rss_articles()} className="flex min-w-0 flex-col">
      <div className="flex h-10 items-center justify-between gap-2 border-b px-3">
        <span className="truncate font-medium text-sm">
          {selectedFeed === ALL ? m.rss_all_articles() : selectedFeed.split(RSS_SEPARATOR).pop()}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => markRead(selectedFeed === ALL ? "" : selectedFeed)}
        >
          {m.rss_mark_all_read()}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto" data-testid="article-list">
        {articles.length === 0 && (
          <p className="p-6 text-center text-muted-foreground text-sm">{m.rss_no_articles()}</p>
        )}
        {articles.map((a) => {
          const id = `${a.feedPath}|${a.id}`;
          return (
            <button
              key={id}
              type="button"
              onClick={() => open(a)}
              aria-current={selectedArticle === id ? "true" : undefined}
              className={cn(
                "flex w-full flex-col gap-1 border-b px-3 py-2.5 text-left hover:bg-muted/50",
                selectedArticle === id && "bg-muted hover:bg-muted",
              )}
            >
              <span className="flex items-start gap-2">
                {!a.isRead && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground" aria-hidden />}
                <span className={cn("text-sm", !a.isRead && "font-medium")}>
                  {a.title}
                  {!a.isRead && <span className="sr-only"> ({m.rss_unread()})</span>}
                </span>
              </span>
              <span className={cn("text-muted-foreground text-xs", !a.isRead && "pl-3.5")}>
                {a.feedName} · {a.time ? formatRelative(a.time / 1000) : "–"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );

  const view = article ? (
    <article className="flex min-w-0 flex-col gap-3 p-4 md:p-5" data-testid="article-view">
      <span className="text-muted-foreground text-sm">
        {article.feedName} · {article.time ? formatDate(article.time / 1000) : "–"}
      </span>
      <h2 className="font-semibold text-lg leading-snug">{article.title}</h2>
      {article.description && (
        <p className="whitespace-pre-line text-sm leading-relaxed">{plainText(article.description)}</p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {(article.torrentURL || article.link) && (
          <Button onClick={() => openAddDialog({ links: article.torrentURL || article.link })}>
            <DownloadIcon /> {m.search_download()}
          </Button>
        )}
        {article.link && (
          <Button variant="outline" asChild>
            <a href={article.link} target="_blank" rel="noreferrer noopener">
              <ExternalLinkIcon /> {m.rss_website()}
            </a>
          </Button>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-1 rounded-lg border p-3 text-sm">
        <span className="font-medium">{m.rss_rule_cta()}</span>
        <span className="text-muted-foreground">{m.rss_rule_cta_text()}</span>
        <Link
          to="/rss"
          search={{ view: "rules", suggest: article.title }}
          className="mt-1 self-start font-medium underline underline-offset-4"
        >
          {m.rss_rule_create()}
        </Link>
      </div>
    </article>
  ) : (
    <div className="hidden flex-1 items-center justify-center p-8 text-center text-muted-foreground text-sm md:flex">
      {m.rss_pick_article()}
    </div>
  );

  const header = (
    <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
      <RssIcon className="size-4" aria-hidden />
      <span>{m.rss_updated({ time: formatRelative(dataUpdatedAt / 1000) })}</span>
      <Button
        variant="outline"
        size="sm"
        className="ml-auto"
        onClick={() => run(() => api.rssRefreshItem(""), { success: m.toast_feed_refreshing(), invalidate: key })}
      >
        <RefreshCwIcon /> {m.rss_refresh()}
      </Button>
    </div>
  );

  const dialogs = (
    <>
      <AddFeedDialog open={addingFeed} folders={folders} onClose={() => setAddingFeed(false)} />
      <InputDialog state={dialog} onClose={() => setDialog(null)} />
    </>
  );

  if (isMobile) {
    return (
      <div className="-mx-4 flex flex-col">
        {article ? (
          <>
            <Button variant="ghost" className="mx-2 self-start" onClick={() => setSelectedArticle(null)}>
              <ChevronLeftIcon /> {m.back()}
            </Button>
            {view}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 pb-3">
              <Select value={selectedFeed} onValueChange={setSelectedFeed}>
                <SelectTrigger className="w-full" aria-label={m.rss_feeds()}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{m.rss_all_articles()}</SelectItem>
                  {feeds.map((f) => (
                    <SelectItem key={f.path} value={f.path}>
                      {f.name}
                      {f.unread ? ` (${f.unread})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                aria-label={m.rss_add_feed_title()}
                onClick={() => setAddingFeed(true)}
              >
                <PlusIcon />
              </Button>
            </div>
            <div className="border-t">{list}</div>
          </>
        )}
        {dialogs}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {header}
      <div className="grid min-h-[480px] flex-1 grid-cols-[220px_minmax(0,1fr)_minmax(0,1.2fr)] overflow-hidden rounded-lg border">
        <div className="overflow-y-auto border-r p-2">{nav}</div>
        <div className="flex min-h-0 flex-col overflow-hidden border-r">{list}</div>
        <div className="min-h-0 overflow-y-auto">{view}</div>
      </div>
      {dialogs}
    </div>
  );
}
