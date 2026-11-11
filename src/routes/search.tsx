import { createFileRoute } from "@tanstack/react-router";
import { SearchPage } from "@/components/search/search-page";

export const Route = createFileRoute("/search")({ component: SearchPage });
