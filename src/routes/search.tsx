import { createFileRoute } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { m } from "@/paraglide/messages.js";

export const Route = createFileRoute("/search")({
  component: () => <ComingSoon icon={SearchIcon} title={m.nav_search()} />,
});
