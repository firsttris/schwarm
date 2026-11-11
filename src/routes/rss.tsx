import { createFileRoute } from "@tanstack/react-router";
import { RssIcon } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { m } from "@/paraglide/messages.js";

export const Route = createFileRoute("/rss")({
  component: () => <ComingSoon icon={RssIcon} title={m.nav_rss()} />,
});
