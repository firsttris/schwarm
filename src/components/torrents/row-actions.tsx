import { EllipsisIcon } from "lucide-react";
import type { Torrent } from "@/api/schemas";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { m } from "@/paraglide/messages.js";
import { dropdownKit, TorrentMenuItems } from "./torrent-actions";

/** "…" at the end of a row: the same actions as the context menu, for this torrent. */
export function RowActions({ torrent }: { torrent: Torrent }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={m.actions_for({ name: torrent.name })}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <TorrentMenuItems kit={dropdownKit} torrents={[torrent]} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
