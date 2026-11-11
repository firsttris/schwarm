import { CheckIcon, CirclePlusIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages.js";

export interface FacetOption {
  value: string;
  label: string;
  icon?: ReactNode;
  count: number;
}

/** The dashed filter button of shadcn's data table example (tasks), with counts. */
export function FacetedFilter({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: FacetOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const set = new Set(selected);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed">
          <CirclePlusIcon />
          {title}
          {set.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-0.5 data-[orientation=vertical]:h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                {set.size}
              </Badge>
              <div className="hidden gap-1 lg:flex">
                {set.size > 2 ? (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {m.n_selected({ n: set.size })}
                  </Badge>
                ) : (
                  options
                    .filter((o) => set.has(o.value))
                    .map((o) => (
                      <Badge variant="secondary" key={o.value} className="rounded-sm px-1 font-normal">
                        {o.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>{m.no_results()}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const isSelected = set.has(o.value);
                return (
                  <CommandItem
                    key={o.value}
                    value={o.label}
                    onSelect={() => {
                      const next = new Set(set);
                      if (isSelected) next.delete(o.value);
                      else next.add(o.value);
                      onChange([...next]);
                    }}
                  >
                    <div
                      className={cn(
                        "flex size-4 items-center justify-center rounded-[4px] border",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input [&_svg]:invisible",
                      )}
                    >
                      <CheckIcon className="size-3.5 text-primary-foreground" />
                    </div>
                    {o.icon}
                    <span className="truncate">{o.label}</span>
                    <span className="ml-auto font-mono text-muted-foreground text-xs">{o.count}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {set.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onChange([])} className="justify-center text-center">
                    {m.clear_filters()}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
