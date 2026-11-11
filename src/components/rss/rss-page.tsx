import { useNavigate } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lazyNamed, WhenUsed } from "@/lib/lazy";
import { m } from "@/paraglide/messages.js";
import { Route } from "@/routes/rss";
import { PageHeader } from "../page-header";
import { FeedsView } from "./feeds-view";

const RulesView = lazyNamed(() => import("./rules-view"), "RulesView");

/** RSS (docs/mockup/RSS.dc.html, Regeln.dc.html): feeds and articles, and the auto-downloader. */
export function RssPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const tab = search.view ?? "feeds";
  const tabs = (
    <Tabs
      value={tab}
      onValueChange={(v) => navigate({ search: v === "rules" ? { view: "rules" } : {} })}
      className="md:w-[360px]"
    >
      <TabsList className="h-11 w-full md:h-9">
        <TabsTrigger value="feeds">{m.rss_feeds()}</TabsTrigger>
        <TabsTrigger value="rules">{m.rss_rules()}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
  return (
    <>
      <PageHeader
        crumbs={[m.nav_rss(), tab === "rules" ? m.rss_rules() : m.rss_feeds()]}
        title={m.nav_rss()}
        phoneExtra={tabs}
      />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
        <div className="hidden md:block">{tabs}</div>
        {tab === "rules" ? (
          <WhenUsed active>
            <RulesView />
          </WhenUsed>
        ) : (
          <FeedsView />
        )}
      </main>
    </>
  );
}
