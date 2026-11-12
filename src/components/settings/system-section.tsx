import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChartColumnIcon, ExternalLinkIcon, FilePlus2Icon, LogOutIcon, PowerIcon } from "lucide-react";
import { api } from "@/api/client";
import { useVersion } from "@/api/queries";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/format";
import { logout, openCreator, openShutdown } from "@/lib/system";
import { m } from "@/paraglide/messages.js";
import { version as schwarmVersion } from "../../../package.json";
import { ApiKeyControl } from "./api-key";
import { SectionShell } from "./pref-sections";

function Row({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value || "–"}</dd>
    </div>
  );
}

function ActionRow({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-sm">{title}</span>
        <span className="text-muted-foreground text-sm">{text}</span>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/**
 * Settings → "System": what runs (about.html: versions, app/buildInfo, app/processInfo) and
 * the things the stock WebUI has in its toolbar and menus: statistics, torrent creator,
 * logout, shutting down qBittorrent.
 */
export function SystemSection() {
  const qbt = useVersion();
  const webapi = useQuery({ queryKey: ["webapiVersion"], queryFn: api.webapiVersion, staleTime: Infinity });
  const build = useQuery({ queryKey: ["buildInfo"], queryFn: api.buildInfo, staleTime: Infinity });
  const process = useQuery({ queryKey: ["processInfo"], queryFn: api.processInfo, staleTime: 60_000 });
  const queryClient = useQueryClient();
  const b = build.data;
  const running = process.data ? formatDuration(Date.now() / 1000 - process.data.launch_time) : undefined;

  return (
    <SectionShell title={m.system_title()} text={m.system_text()}>
      <section className="flex flex-col gap-2" aria-labelledby="about-title">
        <h3 id="about-title" className="font-medium text-sm">
          {m.about_title()}
        </h3>
        {build.isPending ? (
          <Skeleton className="h-60 w-full" />
        ) : (
          <dl className="flex flex-col divide-y rounded-lg border px-4 text-sm" data-testid="about">
            <Row label="Schwarm" value={schwarmVersion} />
            <Row label="qBittorrent" value={qbt.data?.replace(/^v/, "")} />
            <Row label={m.about_webapi()} value={webapi.data} />
            <Row label={m.about_running()} value={running} />
            <Row label="libtorrent" value={b?.libtorrent} />
            <Row label="Qt" value={b?.qt} />
            <Row label="Boost" value={b?.boost} />
            <Row label="OpenSSL" value={b?.openssl} />
            <Row label="zlib" value={b?.zlib} />
            <Row
              label={m.about_platform()}
              value={b?.platform ? `${b.platform}${b.bitness ? ` · ${b.bitness} Bit` : ""}` : undefined}
            />
          </dl>
        )}
        <a
          href="https://github.com/firsttris/schwarm"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 self-start text-muted-foreground text-sm hover:underline"
        >
          {m.about_source()}
          <ExternalLinkIcon className="size-3.5" aria-hidden />
        </a>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="api-key-title">
        <h3 id="api-key-title" className="font-medium text-sm">
          {m.api_key_title()}
        </h3>
        <p className="text-muted-foreground text-sm">{m.api_key_text()}</p>
        <ApiKeyControl />
      </section>

      <section className="flex flex-col divide-y" aria-label={m.system_actions()}>
        <ActionRow title={m.nav_statistics()} text={m.system_statistics_text()}>
          <Button variant="outline" size="sm" asChild>
            <Link to="/statistics">
              <ChartColumnIcon /> {m.system_open()}
            </Link>
          </Button>
        </ActionRow>
        <ActionRow title={m.creator_title()} text={m.system_creator_text()}>
          <Button variant="outline" size="sm" onClick={openCreator}>
            <FilePlus2Icon /> {m.creator_open()}
          </Button>
        </ActionRow>
        <ActionRow title={m.logout()} text={m.system_logout_text()}>
          <Button variant="outline" size="sm" onClick={() => void logout(queryClient)}>
            <LogOutIcon /> {m.logout()}
          </Button>
        </ActionRow>
        <ActionRow title={m.shutdown_title()} text={m.system_shutdown_text()}>
          <Button variant="outline" size="sm" className="text-destructive" onClick={openShutdown}>
            <PowerIcon /> {m.shutdown_button()}
          </Button>
        </ActionRow>
      </section>
    </SectionShell>
  );
}
