import { useQueryClient } from "@tanstack/react-query";
import { ExternalLinkIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { api } from "@/api/client";
import { useRunAction } from "@/api/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { m } from "@/paraglide/messages.js";
import { useSearchPlugins } from "./search-page";

/**
 * Settings → "Suche & RSS": the search plugins of qBittorrent (search/plugins,
 * installPlugin, uninstallPlugin, enablePlugin, updatePlugins). Installing and updating
 * happen in the background in qBittorrent, so the list is reloaded a moment later.
 */
export function SearchPluginsSection() {
  const plugins = useSearchPlugins();
  const run = useRunAction();
  const queryClient = useQueryClient();
  const [source, setSource] = useState("");
  const key = [["searchPlugins"]];
  const reloadSoon = () => {
    void queryClient.invalidateQueries({ queryKey: ["searchPlugins"] });
    setTimeout(() => void queryClient.invalidateQueries({ queryKey: ["searchPlugins"] }), 2000);
  };

  const install = async (event: FormEvent) => {
    event.preventDefault();
    const sources = source
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!sources.length) return;
    setSource("");
    await run(() => api.installSearchPlugins(sources), { success: m.toast_plugin_installing() });
    reloadSoon();
  };

  return (
    <div className="flex max-w-[640px] flex-[999_1_420px] flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium text-lg">{m.settings_search()}</h2>
        <p className="text-muted-foreground">{m.plugins_text()}</p>
      </div>
      <Separator />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-sm">{m.plugins_title()}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await run(() => api.updateSearchPlugins(), { success: m.toast_plugins_updating() });
              reloadSoon();
            }}
          >
            <RefreshCwIcon /> {m.plugins_update()}
          </Button>
        </div>
        {plugins.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="overflow-hidden rounded-lg border text-sm" data-testid="plugin-list">
            {plugins.data?.length === 0 && (
              <p className="p-4 text-center text-muted-foreground">{m.search_no_plugins()}</p>
            )}
            {plugins.data?.map((p) => (
              <div key={p.name} className="flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0">
                <Switch
                  checked={p.enabled}
                  aria-label={m.plugin_enable({ name: p.fullName })}
                  onCheckedChange={(enable) =>
                    run(() => api.enableSearchPlugins([p.name], enable), { invalidate: key })
                  }
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{p.fullName}</span>
                    <Badge variant="secondary" className="font-mono">
                      {p.version}
                    </Badge>
                  </span>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 truncate text-muted-foreground text-xs hover:underline"
                  >
                    {p.url}
                    <ExternalLinkIcon className="size-3" aria-hidden />
                  </a>
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={m.delete_name({ name: p.fullName })}
                  onClick={() =>
                    run(() => api.uninstallSearchPlugins([p.name]), {
                      invalidate: key,
                      success: m.toast_plugin_removed({ name: p.fullName }),
                    })
                  }
                >
                  <Trash2Icon className="text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={install} className="flex flex-col gap-2">
        <Label htmlFor="plugin-source">{m.plugins_install()}</Label>
        <div className="flex gap-2">
          <Input
            id="plugin-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="https://…/plugin.py"
            className="font-mono text-[13px]"
          />
          <Button type="submit" disabled={!source.trim()}>
            {m.plugins_install_button()}
          </Button>
        </div>
        <span className="text-muted-foreground text-sm">{m.plugins_install_hint()}</span>
      </form>
    </div>
  );
}
