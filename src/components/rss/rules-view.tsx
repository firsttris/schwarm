import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  CheckIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  CopyIcon,
  FileDownIcon,
  FileUpIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { useMaindata, useRunAction } from "@/api/queries";
import { type RssRule, rssRuleSchema } from "@/api/schemas";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { formatRelative } from "@/lib/format";
import { collectArticles, flattenRss, suggestRule } from "@/lib/rss";
import { type MatchResult, matchRule } from "@/lib/rss-match";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages.js";
import { Route } from "@/routes/rss";
import { useRssItems } from "./rss-query";

const rulesKey = ["rss", "rules"] as const;
const NONE = "\u0000none";

interface Draft {
  name: string;
  enabled: boolean;
  mustContain: string;
  mustNotContain: string;
  useRegex: boolean;
  useEpisodes: boolean;
  episodeFilter: string;
  smartFilter: boolean;
  affectedFeeds: string[];
  category: string;
  savePath: string;
  tags: string;
  ignoreDays: number;
  stopped: boolean;
}

function toDraft(name: string, rule: RssRule): Draft {
  const p = rule.torrentParams ?? {};
  return {
    name,
    enabled: rule.enabled,
    mustContain: rule.mustContain,
    mustNotContain: rule.mustNotContain,
    useRegex: rule.useRegex,
    useEpisodes: rule.episodeFilter !== "",
    episodeFilter: rule.episodeFilter,
    smartFilter: rule.smartFilter,
    affectedFeeds: rule.affectedFeeds,
    category: p.category ?? "",
    savePath: p.save_path ?? "",
    tags: (p.tags ?? []).join(", "),
    ignoreDays: rule.ignoreDays,
    stopped: p.stopped ?? false,
  };
}

/** Keeps every field qBittorrent sent (lastMatch, priority, other torrentParams) and sets ours. */
function fromDraft(draft: Draft, base?: RssRule): Partial<RssRule> {
  return {
    ...base,
    enabled: draft.enabled,
    mustContain: draft.mustContain,
    mustNotContain: draft.mustNotContain,
    useRegex: draft.useRegex,
    episodeFilter: draft.useEpisodes ? draft.episodeFilter : "",
    smartFilter: draft.smartFilter,
    affectedFeeds: draft.affectedFeeds,
    ignoreDays: draft.ignoreDays,
    torrentParams: {
      ...base?.torrentParams,
      category: draft.category,
      save_path: draft.savePath,
      tags: draft.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      stopped: draft.stopped,
    },
  };
}

const emptyDraft = (name = ""): Draft => ({
  name,
  enabled: true,
  mustContain: "",
  mustNotContain: "",
  useRegex: false,
  useEpisodes: false,
  episodeFilter: "",
  smartFilter: false,
  affectedFeeds: [],
  category: "",
  savePath: "",
  tags: "",
  ignoreDays: 0,
  stopped: false,
});

function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <span className="text-[13px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

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

/** Marks the matched words in a title. */
function Highlight({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <>{text}</>;
  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return (
    <>
      {text.split(pattern).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-[3px] bg-primary/15 text-foreground">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function reasonText(r: MatchResult): string {
  if (r.ok) return "";
  switch (r.reason) {
    case "missing":
      return m.rule_reason_missing({ word: r.detail });
    case "excluded":
      return m.rule_reason_excluded({ word: r.detail });
    case "episode":
      return m.rule_reason_episode();
    default:
      return m.rename_bad_regex();
  }
}

const dayOptions = [0, 1, 2, 7, 14, 30];

/**
 * The RSS auto-downloader (docs/mockup/Regeln.dc.html): rules on the left, the editor in the
 * middle, and a live preview of the latest articles of the chosen feeds with the reason why
 * each one does or does not match (src/lib/rss-match.ts, ported from qBittorrent). For a saved
 * rule, qBittorrent's own answer from rss/matchingArticles is shown as well.
 * Import and export use the JSON of rss/rules, the format of qBittorrent's own export.
 */
export function RulesView() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const run = useRunAction();
  const rules = useQuery({ queryKey: rulesKey, queryFn: api.rssRules });
  const items = useRssItems();
  const { data: main } = useMaindata();
  const importInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);

  const { feeds } = useMemo(() => flattenRss(items.data ?? {}), [items.data]);
  const names = Object.keys(rules.data ?? {}).sort((a, b) => a.localeCompare(b));
  const selected = search.rule && rules.data?.[search.rule] ? search.rule : undefined;
  const saved = selected ? rules.data?.[selected] : undefined;
  const key = [[...rulesKey]];

  // Load the editor from the selected rule, or from an article ("Regel daraus machen")
  // biome-ignore lint/correctness/useExhaustiveDependencies: only when the selection changes
  useEffect(() => {
    if (search.suggest && items.data) {
      const s = suggestRule(search.suggest);
      const source = feeds.find((f) => f.feed.articles.some((a) => a.title === search.suggest));
      setDraft({ ...emptyDraft(s.name), mustContain: s.mustContain, affectedFeeds: source ? [source.feed.url] : [] });
      setIsNew(true);
    } else if (selected && saved) {
      setDraft(toDraft(selected, saved));
      setIsNew(false);
    } else if (!search.suggest && !isNew) {
      setDraft(null);
    }
  }, [selected, search.suggest, rules.dataUpdatedAt, items.data === undefined]);

  const matching = useQuery({
    queryKey: ["rss", "matching", selected],
    queryFn: () => api.rssMatchingArticles(selected!),
    enabled: !!selected && !isNew,
  });

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft?.name.trim()) return;
    const name = draft.name.trim();
    const renamed = !isNew && selected && selected !== name;
    await run(
      async () => {
        if (renamed) await api.rssRenameRule(selected, name);
        await api.rssSetRule(name, fromDraft(draft, saved));
      },
      { success: m.toast_rule_saved({ name }), invalidate: [...key, ["rss", "matching"]] },
    );
    setIsNew(false);
    navigate({ search: { view: "rules", rule: name } });
  };

  const toggle = (name: string, enabled: boolean) => {
    const rule = rules.data?.[name];
    if (!rule) return;
    queryClient.setQueryData(rulesKey, { ...rules.data, [name]: { ...rule, enabled } });
    void run(() => api.rssSetRule(name, { ...rule, enabled }), { invalidate: key });
  };

  const exportRules = () => {
    const blob = new Blob([JSON.stringify(rules.data ?? {}, null, 4)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "schwarm-rss-rules.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importRules = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      const entries = Object.entries(parsed).map(([name, rule]) => [name, rssRuleSchema.parse(rule)] as const);
      await run(
        async () => {
          for (const [name, rule] of entries) await api.rssSetRule(name, rule);
        },
        { success: m.toast_rules_imported({ n: entries.length }), invalidate: key },
      );
    } catch {
      toast.error(m.rules_import_failed());
    }
  };

  const preview = useMemo(() => {
    if (!draft) return [];
    const chosen = feeds.filter((f) => draft.affectedFeeds.includes(f.feed.url));
    return collectArticles(chosen)
      .slice(0, 40)
      .map((a) => ({
        article: a,
        result: matchRule(a.title, {
          mustContain: draft.mustContain,
          mustNotContain: draft.mustNotContain,
          useRegex: draft.useRegex,
          episodeFilter: draft.useEpisodes ? draft.episodeFilter : "",
        }),
      }));
  }, [draft, feeds]);
  const hits = preview.filter((p) => p.result.ok);
  const misses = preview.filter((p) => !p.result.ok);
  const loadedNames = useMemo(
    () => new Set(Object.values(main?.torrents ?? {}).map((t) => t.name.toLowerCase())),
    [main?.torrents],
  );
  const serverCount = matching.data ? Object.values(matching.data).reduce((s, list) => s + list.length, 0) : undefined;
  const categories = Object.keys(main?.categories ?? {}).sort((a, b) => a.localeCompare(b));

  if (rules.isPending) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setDraft(emptyDraft());
            setIsNew(true);
            navigate({ search: { view: "rules" } });
          }}
        >
          <PlusIcon /> {m.rule_new()}
        </Button>
        <span className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => importInput.current?.click()}>
          <FileUpIcon /> {m.rules_import()}
        </Button>
        <input
          ref={importInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            void importRules(e.target.files?.[0]);
            e.target.value = "";
          }}
          data-testid="rules-import"
        />
        <Button variant="outline" size="sm" onClick={exportRules} disabled={!names.length}>
          <FileDownIcon /> {m.rules_export()}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="flex flex-col gap-1" data-testid="rule-list">
          {names.length === 0 && <p className="text-muted-foreground text-sm">{m.rules_none()}</p>}
          {names.map((name) => {
            const rule = rules.data![name]!;
            const last = rule.lastMatch ? Date.parse(rule.lastMatch) : Number.NaN;
            return (
              <div
                key={name}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted",
                  selected === name && !isNew && "bg-muted",
                )}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 flex-col text-left"
                  onClick={() => {
                    setIsNew(false);
                    navigate({ search: { view: "rules", rule: name } });
                  }}
                  aria-current={selected === name && !isNew ? "true" : undefined}
                >
                  <span className={cn("truncate font-medium text-sm", !rule.enabled && "text-muted-foreground")}>
                    {name}
                  </span>
                  <span className="truncate text-muted-foreground text-xs">
                    {!rule.enabled
                      ? m.off()
                      : Number.isNaN(last)
                        ? m.rule_never()
                        : m.rule_last({ time: formatRelative(last / 1000) })}
                  </span>
                </button>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(v) => toggle(name, v)}
                  aria-label={m.rule_enabled({ name })}
                />
              </div>
            );
          })}
        </div>

        {draft ? (
          <form onSubmit={save} className="flex min-w-0 flex-col gap-5" data-testid="rule-editor">
            <div className="flex items-start gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="rule-name">{m.name()}</Label>
                <Input
                  id="rule-name"
                  value={draft.name}
                  onChange={(e) => set({ name: e.target.value })}
                  autoFocus={isNew}
                />
              </div>
              {!isNew && selected && (
                <div className="flex gap-2 pt-7">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDraft({ ...draft, name: m.rule_copy_name({ name: draft.name }) });
                      setIsNew(true);
                    }}
                  >
                    <CopyIcon /> {m.rule_clone()}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    aria-label={m.delete_name({ name: selected })}
                    onClick={async () => {
                      await run(() => api.rssRemoveRule(selected), {
                        success: m.toast_rule_removed({ name: selected }),
                        invalidate: key,
                      });
                      navigate({ search: { view: "rules" } });
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              )}
            </div>
            <Separator />
            <Field
              label={m.rule_must_contain()}
              htmlFor="rule-must"
              hint={draft.useRegex ? m.rule_regex_hint() : m.rule_must_hint()}
            >
              <Input
                id="rule-must"
                className="font-mono text-[13px]"
                value={draft.mustContain}
                onChange={(e) => set({ mustContain: e.target.value })}
              />
            </Field>
            <Field label={m.rule_must_not_contain()} htmlFor="rule-mustnot">
              <Input
                id="rule-mustnot"
                className="font-mono text-[13px]"
                value={draft.mustNotContain}
                onChange={(e) => set({ mustNotContain: e.target.value })}
              />
            </Field>
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              <Check checked={draft.useRegex} onChange={(useRegex) => set({ useRegex })} label={m.filter_regex()} />
              <Check
                checked={draft.useEpisodes}
                onChange={(useEpisodes) => set({ useEpisodes })}
                label={m.rule_episodes()}
              />
              <Check
                checked={draft.smartFilter}
                onChange={(smartFilter) => set({ smartFilter })}
                label={m.rule_smart()}
              />
            </div>
            {draft.useEpisodes && (
              <Field label={m.rule_episode_filter()} htmlFor="rule-episodes" hint={m.rule_episode_hint()}>
                <Input
                  id="rule-episodes"
                  className="font-mono text-[13px]"
                  value={draft.episodeFilter}
                  onChange={(e) => set({ episodeFilter: e.target.value })}
                  placeholder="1x2;8-15;20-;"
                />
              </Field>
            )}
            <div className="flex flex-col gap-2">
              <span className="font-medium text-sm">{m.rule_feeds()}</span>
              <div className="flex flex-wrap gap-1.5">
                {feeds.map((f) => {
                  const on = draft.affectedFeeds.includes(f.feed.url);
                  return (
                    <button
                      key={f.path}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        set({
                          affectedFeeds: on
                            ? draft.affectedFeeds.filter((u) => u !== f.feed.url)
                            : [...draft.affectedFeeds, f.feed.url],
                        })
                      }
                      className={cn(
                        "inline-flex h-7 items-center gap-1 rounded-md border px-2 font-medium text-xs",
                        on ? "border-transparent bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                    >
                      {on && <CheckIcon className="size-3.5" aria-hidden />}
                      {f.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={m.category()} htmlFor="rule-category">
                <Select value={draft.category || NONE} onValueChange={(v) => set({ category: v === NONE ? "" : v })}>
                  <SelectTrigger id="rule-category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{m.category_none()}</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={m.add_save_in()} htmlFor="rule-path">
                <Input
                  id="rule-path"
                  className="font-mono text-[13px]"
                  value={draft.savePath}
                  onChange={(e) => set({ savePath: e.target.value })}
                  placeholder={m.category_path_placeholder()}
                />
              </Field>
              <Field label={m.tags()} htmlFor="rule-tags">
                <Input
                  id="rule-tags"
                  value={draft.tags}
                  onChange={(e) => set({ tags: e.target.value })}
                  placeholder={m.add_tags_placeholder()}
                />
              </Field>
              <Field label={m.rule_ignore_days()} htmlFor="rule-ignore">
                <Select value={String(draft.ignoreDays)} onValueChange={(v) => set({ ignoreDays: Number(v) })}>
                  <SelectTrigger
                    id="rule-ignore"
                    className="w-full"
                    title="Ignore subsequent matches for (0 to disable)"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...new Set([...dayOptions, draft.ignoreDays])]
                      .sort((a, b) => a - b)
                      .map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d === 0 ? m.rule_ignore_never() : m.duration_d({ d })}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Check checked={draft.stopped} onChange={(stopped) => set({ stopped })} label={m.rule_add_stopped()} />
            <div className="flex gap-2">
              <Button type="submit" disabled={!draft.name.trim()}>
                {m.save()}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (saved && selected && !isNew) setDraft(toDraft(selected, saved));
                  else {
                    setDraft(null);
                    setIsNew(false);
                    navigate({ search: { view: "rules" } });
                  }
                }}
              >
                {m.rule_discard()}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
            {m.rule_pick()}
          </div>
        )}

        {draft && (
          <aside aria-label={m.rule_preview()} className="flex min-w-0 flex-col gap-3" data-testid="rule-preview">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">{m.rule_preview()}</span>
              <span className="text-[13px] text-muted-foreground">
                {draft.affectedFeeds.length ? m.rule_preview_text() : m.rule_preview_no_feeds()}
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border text-sm">
              {preview.length === 0 && <p className="p-4 text-center text-muted-foreground">{m.rss_no_articles()}</p>}
              {[...hits, ...misses].map(({ article, result }, i) => (
                <div key={`${article.feedPath}|${article.id}`}>
                  {i === hits.length && hits.length > 0 && <div className="h-px bg-border" />}
                  <div className="flex items-start gap-2.5 border-b px-3 py-2 last:border-b-0">
                    {result.ok ? (
                      <CircleCheckIcon className="mt-0.5 size-4 shrink-0" aria-label={m.rule_matches()} />
                    ) : (
                      <CircleMinusIcon
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        aria-label={m.rule_no_match()}
                      />
                    )}
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className={cn(!result.ok && "text-muted-foreground")}>
                        <Highlight text={article.title} words={result.ok ? result.highlights : []} />
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {article.feedName} · {article.time ? formatRelative(article.time / 1000) : "–"}
                        {result.ok
                          ? loadedNames.has(article.title.toLowerCase())
                            ? ` · ${m.rule_loaded()}`
                            : ""
                          : ` · ${reasonText(result)}`}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {serverCount !== undefined && !isNew && (
              <span className="text-[13px] text-muted-foreground" data-testid="rule-server-count">
                {m.rule_server_count({ n: serverCount })}
              </span>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
