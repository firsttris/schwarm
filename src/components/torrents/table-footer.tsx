import type { Table } from "@tanstack/react-table";
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";
import type { Torrent } from "@/api/schemas";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { m } from "@/paraglide/messages.js";

export const ALL_ROWS = 100000;
const pageSizes = [25, 50, 100, 250, ALL_ROWS];

/** "2 von 10 Zeilen ausgewählt." and the pagination of shadcn's data table. */
export function TableFooter({ table }: { table: Table<Torrent> }) {
  const selected = Object.keys(table.getState().rowSelection).length;
  const total = table.getPrePaginationRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const pages = Math.max(1, table.getPageCount());
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <span className="text-[13px] text-muted-foreground tabular-nums" data-testid="row-count">
        {m.rows_selected({ selected, total })}
      </span>
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2 font-medium text-[13px]">
          <span id="rows-per-page">{m.rows_per_page()}</span>
          <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
            <SelectTrigger size="sm" className="w-[84px]" aria-labelledby="rows-per-page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size === ALL_ROWS ? m.rows_all() : size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="font-medium text-[13px] tabular-nums">{m.page_of({ page: pageIndex + 1, pages })}</span>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={m.page_first()}
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.firstPage()}
          >
            <ChevronsLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={m.page_prev()}
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={m.page_next()}
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={m.page_last()}
            disabled={!table.getCanNextPage()}
            onClick={() => table.lastPage()}
          >
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
