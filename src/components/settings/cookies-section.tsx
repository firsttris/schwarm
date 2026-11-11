import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { api } from "@/api/client";
import { useRunAction } from "@/api/queries";
import type { Cookie } from "@/api/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages.js";
import { SectionShell } from "./pref-sections";

const cookiesKey = ["cookies"];

/** <input type="date"> works in local days; qBittorrent wants seconds. */
function toDateInput(seconds: number): string {
  if (!(seconds > 0)) return "";
  const d = new Date(seconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromDateInput(value: string): number {
  if (!value) return 0;
  const [y, mo, d] = value.split("-").map(Number);
  return Math.floor(new Date(y!, mo! - 1, d!, 23, 59, 59).getTime() / 1000);
}

function CookieRow({
  cookie,
  index,
  onChange,
  onRemove,
}: {
  cookie: Cookie;
  index: number;
  onChange: (c: Cookie) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const field = (key: "domain" | "path" | "name" | "value", label: string, mono = false) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${id}-${key}`} className="font-normal text-muted-foreground text-xs">
        {label}
      </Label>
      <Input
        id={`${id}-${key}`}
        value={cookie[key]}
        onChange={(e) => onChange({ ...cookie, [key]: e.target.value })}
        className={mono ? "font-mono text-[13px]" : undefined}
      />
    </div>
  );
  return (
    <fieldset className="grid gap-3 p-4 sm:grid-cols-2" aria-label={cookie.name || m.cookie_n({ n: index + 1 })}>
      {field("domain", m.cookie_domain())}
      {field("path", m.cookie_path())}
      {field("name", m.cookie_name())}
      {field("value", m.cookie_value(), true)}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-expires`} className="font-normal text-muted-foreground text-xs">
          {m.cookie_expires()}
        </Label>
        <Input
          id={`${id}-expires`}
          type="date"
          value={toDateInput(cookie.expirationDate ?? 0)}
          onChange={(e) => onChange({ ...cookie, expirationDate: fromDateInput(e.target.value) })}
        />
      </div>
      <div className="flex items-end justify-end">
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <Trash2Icon /> {m.remove()}
        </Button>
      </div>
    </fieldset>
  );
}

/**
 * Settings → "Cookies": cookies qBittorrent sends when it downloads .torrent files and RSS
 * feeds (app/cookies, app/setCookies replaces the whole list; www/private/views/cookies.html).
 */
export function CookiesSection() {
  const query = useQuery({ queryKey: cookiesKey, queryFn: api.cookies });
  const queryClient = useQueryClient();
  const run = useRunAction();
  const [draft, setDraft] = useState<Cookie[] | undefined>();
  useEffect(() => {
    if (query.data && draft === undefined) setDraft(query.data);
  }, [query.data, draft]);
  const list = draft ?? [];
  const changed = draft !== undefined && JSON.stringify(draft) !== JSON.stringify(query.data);

  const save = async () => {
    // a cookie without name or domain does not reach anyone
    // without a date it lives as long as qBittorrent runs; 0 would mean 1970, already expired
    const clean = list
      .filter((c) => c.name.trim() && c.domain.trim())
      .map(({ expirationDate, ...c }) => (expirationDate && expirationDate > 0 ? { ...c, expirationDate } : c));
    await run(() => api.setCookies(clean), { success: m.toast_cookies_saved() });
    await queryClient.invalidateQueries({ queryKey: cookiesKey });
    setDraft(undefined);
  };

  return (
    <SectionShell title={m.cookies_title()} text={m.cookies_text()}>
      {query.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col divide-y rounded-lg border" data-testid="cookie-list">
            {list.length === 0 && <p className="p-4 text-center text-muted-foreground text-sm">{m.cookies_empty()}</p>}
            {list.map((cookie, i) => (
              <CookieRow
                key={i}
                cookie={cookie}
                index={i}
                onChange={(c) => setDraft(list.map((x, j) => (j === i ? c : x)))}
                onRemove={() => setDraft(list.filter((_, j) => j !== i))}
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDraft([...list, { domain: "", path: "/", name: "", value: "" }])}
            >
              <PlusIcon /> {m.cookie_add()}
            </Button>
            <div className="flex gap-2">
              {changed && (
                <Button variant="outline" size="sm" onClick={() => setDraft(query.data)}>
                  {m.rule_discard()}
                </Button>
              )}
              <Button size="sm" disabled={!changed} onClick={() => void save()}>
                {m.save()}
              </Button>
            </div>
          </div>
        </div>
      )}
    </SectionShell>
  );
}
