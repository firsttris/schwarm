import { createFileRoute } from "@tanstack/react-router";
import { ChartColumnIcon } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { m } from "@/paraglide/messages.js";

export const Route = createFileRoute("/statistics")({
  component: () => <ComingSoon icon={ChartColumnIcon} title={m.nav_statistics()} />,
});
