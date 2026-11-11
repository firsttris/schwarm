import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/api/client";
import { pollInterval } from "@/api/queries";
import type { LogMessage, LogPeer } from "@/api/schemas";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { appendLog, countLevels, filterLog, type LogLevel, logLevel, logLevels } from "@/lib/log";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

// Kept while the page is open in the browser; each poll asks only for what is new.
let messages: LogMessage[] = [];
let peers: LogPeer[] = [];

function useLog() {
  return useQuery({
    queryKey: ["log", "main"],
    queryFn: async () => {
      messages = appendLog(messages, await api.logMain(messages.at(-1)?.id ?? -1));
      return messages;
    },
    structuralSharing: false,
    refetchInterval: pollInterval(2000),
  });
}

function usePeerLog() {
  return useQuery({
    queryKey: ["log", "peers"],
    queryFn: async () => {
      peers = appendLog(peers, await api.logPeers(peers.at(-1)?.id ?? -1));
      return peers;
    },
    structuralSharing: false,
    refetchInterval: pollInterval(2000),
  });
}

/** The log shows seconds: "11.11., 08:14:03". */
function formatTime(unixSeconds: number): string {
  return new Intl.DateTimeFormat(getLocale(), {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(unixSeconds * 1000));
}

function levelLabel(level: LogLevel): string {
  switch (level) {
    case "normal":
      return m.log_normal();
    case "info":
      return m.log_info();
    case "warning":
      return m.log_warning();
    case "critical":
      return m.log_critical();
  }
}

/** Shown at most, newest first; the search finds older ones. */
const SHOW = 500;

function Messages() {
  const log = useLog();
  const [levels, setLevels] = useState<LogLevel[]>([...logLevels]);
  const [query, setQuery] = useState("");
  const list = log.data ?? [];
  const counts = countLevels(list);
  const shown = filterLog(list, levels, query);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={m.log_search()}
          aria-label={m.log_search()}
          className="h-8 w-full sm:w-56"
        />
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          value={levels}
          onValueChange={(v) => setLevels(v as LogLevel[])}
          aria-label={m.log_levels()}
        >
          {logLevels.map((level) => (
            <ToggleGroupItem key={level} value={level} className="gap-1.5 px-2.5">
              {levelLabel(level)}
              <span className="text-muted-foreground tabular-nums">{counts[level]}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {log.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <ol className="flex flex-col divide-y rounded-lg border text-sm" data-testid="log-list">
          {shown.length === 0 && <li className="p-4 text-center text-muted-foreground">{m.log_empty()}</li>}
          {shown.slice(0, SHOW).map((msg) => {
            const level = logLevel(msg.type);
            return (
              <li
                key={msg.id}
                className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 px-3 py-2 sm:grid-cols-[124px_80px_1fr] sm:items-start"
                data-level={level}
              >
                <time
                  className="text-muted-foreground tabular-nums"
                  dateTime={new Date(msg.timestamp * 1000).toISOString()}
                >
                  {formatTime(msg.timestamp)}
                </time>
                <span>
                  <Badge variant={level === "critical" ? "destructive" : level === "warning" ? "outline" : "secondary"}>
                    {levelLabel(level)}
                  </Badge>
                </span>
                <span className="col-span-2 min-w-0 break-words sm:col-span-1">{msg.message}</span>
              </li>
            );
          })}
        </ol>
      )}
      {shown.length > SHOW && <p className="text-muted-foreground text-sm">{m.log_more({ total: shown.length })}</p>}
    </div>
  );
}

function Peers() {
  const log = usePeerLog();
  const list = [...(log.data ?? [])].reverse();
  if (log.isPending) return <Skeleton className="h-40 w-full" />;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">{m.log_peers_text()}</p>
      <ol className="flex flex-col divide-y rounded-lg border text-sm" data-testid="peer-log">
        {list.length === 0 && <li className="p-4 text-center text-muted-foreground">{m.log_peers_empty()}</li>}
        {list.map((peer) => (
          <li
            key={peer.id}
            className="grid grid-cols-1 gap-x-3 gap-y-1 px-3 py-2 sm:grid-cols-[124px_minmax(0,1fr)_auto]"
          >
            <time className="text-muted-foreground tabular-nums">{formatTime(peer.timestamp)}</time>
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-mono text-[13px]">{peer.ip}</span>
              {peer.reason && <span className="text-muted-foreground text-xs">{peer.reason}</span>}
            </span>
            <span>
              <Badge variant="secondary">{peer.blocked ? m.log_peer_blocked() : m.log_peer_banned()}</Badge>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Settings → "Protokoll": qBittorrent's log (log/main) and the blocked and banned peers
 * (log/peers), as in the stock WebUI (www/private/views/log.html).
 */
export function LogSection() {
  return (
    <div className="flex max-w-[900px] flex-[999_1_420px] flex-col gap-6 pb-20">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium text-lg">{m.log_title()}</h2>
        <p className="text-muted-foreground">{m.log_text()}</p>
      </div>
      <Separator />
      <Tabs defaultValue="main">
        <TabsList>
          <TabsTrigger value="main">{m.log_messages()}</TabsTrigger>
          <TabsTrigger value="peers">{m.log_peers()}</TabsTrigger>
        </TabsList>
        <TabsContent value="main" className="mt-3">
          <Messages />
        </TabsContent>
        <TabsContent value="peers" className="mt-3">
          <Peers />
        </TabsContent>
      </Tabs>
    </div>
  );
}
