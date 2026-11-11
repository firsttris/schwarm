import { createFileRoute } from "@tanstack/react-router";
import { RssPage } from "@/components/rss/rss-page";

export interface RssSearch {
  view?: "rules";
  /** Rule open in the editor. */
  rule?: string;
  /** Article title to suggest a new rule from ("Regel daraus machen"). */
  suggest?: string;
}

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

export const Route = createFileRoute("/rss")({
  validateSearch: (search: Record<string, unknown>): RssSearch => ({
    view: search.view === "rules" ? "rules" : undefined,
    rule: str(search.rule),
    suggest: str(search.suggest),
  }),
  component: RssPage,
});
