import { Link, useLocation } from "@tanstack/react-router";
import { ListIcon, RssIcon, SearchIcon, SlidersHorizontalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages.js";

/** Bottom tab bar on the phone (docs/mockup/PhoneListe.dc.html); touch targets ≥ 44 px. */
export function PhoneNav() {
  const { pathname } = useLocation();
  const items = [
    ["/torrents", ListIcon, m.nav_torrents()],
    ["/search", SearchIcon, m.nav_search()],
    ["/rss", RssIcon, m.nav_rss()],
    ["/settings", SlidersHorizontalIcon, m.nav_settings()],
  ] as const;
  return (
    <nav
      aria-label={m.main_menu()}
      className="fixed inset-x-0 bottom-0 z-20 flex border-t bg-background px-2 pb-[calc(12px+env(safe-area-inset-bottom))] md:hidden"
    >
      {items.map(([to, Icon, label]) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 pt-2 font-medium text-[11px] text-muted-foreground",
              active && "text-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
