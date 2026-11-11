import type { Table } from "@tanstack/react-table";
import {
  CirclePauseIcon,
  CirclePlayIcon,
  EllipsisIcon,
  SearchIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import type { Torrent } from "@/api/schemas";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { isStopped, type TextFilter } from "@/lib/torrents";
import { m } from "@/paraglide/messages.js";
import { FacetedFilter, type FacetOption } from "./faceted-filter";
import { dropdownKit, TorrentMenuItems, useTorrentActions } from "./torrent-actions";

interface Facet {
  title: string;
  options: FacetOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}

/** Filter field with options, faceted filters, bulk actions and the column menu. */
export function Toolbar({
  table,
  text,
  onText,
  selected,
  facets,
}: {
  table: Table<Torrent>;
  text: TextFilter;
  onText: (f: TextFilter) => void;
  selected: Torrent[];
  facets: Facet[];
}) {
  const actions = useTorrentActions();
  const anyRunning = selected.some((t) => !isStopped(t));
  const filtered = text.text || facets.some((f) => f.selected.length);
  const placeholder =
    text.field === "path"
      ? m.filter_placeholder_path()
      : text.field === "hash"
        ? m.filter_placeholder_hash()
        : m.filter_placeholder();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-[260px]">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={text.text}
          onChange={(e) => onText({ ...text, text: e.target.value })}
          placeholder={placeholder}
          aria-label={m.filter_label()}
          className="h-8 pr-9 pl-8"
          data-testid="torrent-filter"
          aria-invalid={text.regex && !isValidRegex(text.text)}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="absolute top-1/2 right-1.5 -translate-y-1/2"
              aria-label={m.filter_options()}
            >
              <SlidersHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-muted-foreground text-xs">{m.filter_search_in()}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={text.field}
              onValueChange={(v) => onText({ ...text, field: v as TextFilter["field"] })}
            >
              <DropdownMenuRadioItem value="name">{m.col_name()}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="path">{m.col_save_path()}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="hash">{m.info_hash()}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={text.regex} onCheckedChange={(v) => onText({ ...text, regex: v })}>
              {m.filter_regex()}
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {facets.map((f) => (
        <FacetedFilter key={f.title} {...f} />
      ))}
      {filtered && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onText({ ...text, text: "" });
            for (const f of facets) f.onChange([]);
          }}
        >
          {m.reset()}
          <XIcon />
        </Button>
      )}
      <div className="ml-auto flex items-center gap-2">
        {selected.length > 0 && (
          <>
            <span className="text-[13px] text-muted-foreground tabular-nums" data-testid="selection-count">
              {m.n_selected({ n: selected.length })}
            </span>
            {anyRunning ? (
              <Button variant="outline" size="sm" onClick={() => actions.stop(selected.map((t) => t.hash))}>
                <CirclePauseIcon />
                {m.action_stop()}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => actions.start(selected.map((t) => t.hash))}>
                <CirclePlayIcon />
                {m.action_start()}
              </Button>
            )}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label={m.more_actions()}>
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <TorrentMenuItems kit={dropdownKit} torrents={selected} />
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2Icon />
              {m.view()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[70vh] w-52 overflow-y-auto">
            <DropdownMenuLabel className="text-muted-foreground text-xs">{m.columns()}</DropdownMenuLabel>
            {table
              .getAllLeafColumns()
              .filter((c) => c.getCanHide())
              .map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={c.getIsVisible()}
                  onCheckedChange={(v) => c.toggleVisibility(v)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {c.columnDef.meta?.label?.() ?? c.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function isValidRegex(text: string): boolean {
  try {
    new RegExp(text);
    return true;
  } catch {
    return false;
  }
}
