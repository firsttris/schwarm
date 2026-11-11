import { useQuery } from "@tanstack/react-query";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatMbps, parseMbps } from "@/lib/limits";
import { field, type PreferenceField } from "@/lib/preferences";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages.js";

const NONE = "\u0000none";

function unitText(unit: string | undefined): string {
  switch (unit) {
    case "bytes/s":
      return "MB/s";
    case "seconds":
      return "s";
    case "minutes":
      return "Min";
    case "KiB/s":
    case "KiB":
    case "MiB":
    case "%":
    case "ms":
      return unit;
    default:
      return "";
  }
}

const mono = (f: PreferenceField) =>
  f.unit === "path" || f.unit === "command" || f.unit === "url" || f.type === "lines";

/** A number field that keeps what is being typed and reports only valid numbers. */
function NumberInput({
  f,
  value,
  onChange,
  disabled,
  id,
}: {
  f: PreferenceField;
  value: unknown;
  onChange: (v: number) => void;
  disabled?: boolean;
  id: string;
}) {
  const mbps = f.unit === "bytes/s";
  const shown = mbps ? formatMbps(Number(value ?? 0)) : value === undefined ? "" : String(value);
  const [text, setText] = useState(shown);
  useEffect(() => setText(shown), [shown]);
  const parsed = mbps ? parseMbps(text) : text.trim() === "" ? Number.NaN : Number(text.replace(",", "."));
  const unit = unitText(f.unit);
  return (
    <div className="relative w-full max-w-60">
      <Input
        id={id}
        inputMode="decimal"
        value={text}
        disabled={disabled}
        placeholder={mbps ? m.limit_unlimited() : undefined}
        aria-invalid={Number.isNaN(parsed)}
        onChange={(e) => {
          setText(e.target.value);
          const next = mbps ? parseMbps(e.target.value) : Number(e.target.value.replace(",", "."));
          const empty = e.target.value.trim() === "";
          // an empty speed field means unlimited (0); elsewhere wait for a number
          if (mbps ? !Number.isNaN(next) : !empty && !Number.isNaN(next)) onChange(next);
        }}
        className={cn("tabular-nums", unit && "pr-14")}
      />
      {unit && (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground text-sm">
          {unit}
        </span>
      )}
    </div>
  );
}

/** Monitored folders: path → 0 (into the folder itself), 1 (default folder) or another path. */
function ScanDirs({
  value,
  onChange,
  disabled,
}: {
  value: unknown;
  onChange: (v: Record<string, number | string>) => void;
  disabled?: boolean;
}) {
  const entries = Object.entries((value as Record<string, number | string>) ?? {});
  const update = (list: [string, number | string][]) => onChange(Object.fromEntries(list.filter(([p]) => p.trim())));
  return (
    <div className="flex w-full flex-col gap-2">
      {entries.map(([path, target], i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Input
            aria-label={m.pref_scan_folder()}
            className="font-mono text-[13px]"
            value={path}
            disabled={disabled}
            onChange={(e) => update(entries.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))}
          />
          <Select
            value={typeof target === "number" ? String(target) : "custom"}
            disabled={disabled}
            onValueChange={(v) =>
              update(entries.map((x, j) => (j === i ? [x[0], v === "custom" ? "/downloads" : Number(v)] : x)))
            }
          >
            <SelectTrigger className="w-full" aria-label={m.pref_scan_target()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">{m.pref_scan_same()}</SelectItem>
              <SelectItem value="1">{m.pref_scan_default()}</SelectItem>
              <SelectItem value="custom">{m.pref_scan_other()}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            aria-label={m.remove()}
            disabled={disabled}
            onClick={() => update(entries.filter((_, j) => j !== i))}
          >
            <Trash2Icon />
          </Button>
          {typeof target === "string" && (
            <Input
              aria-label={m.pref_scan_other()}
              className="col-span-2 font-mono text-[13px]"
              value={target}
              disabled={disabled}
              onChange={(e) => update(entries.map((x, j) => (j === i ? [x[0], e.target.value] : x)))}
            />
          )}
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        disabled={disabled}
        onClick={() => update([...entries, ["/watch", 0]])}
      >
        <PlusIcon /> {m.pref_scan_add()}
      </Button>
    </div>
  );
}

function InterfaceSelect({
  value,
  onChange,
  disabled,
  id,
}: {
  value: unknown;
  onChange: (v: string) => void;
  disabled?: boolean;
  id: string;
}) {
  const list = useQuery({ queryKey: ["preferences", "interfaces"], queryFn: api.networkInterfaces, staleTime: 60_000 });
  const current = String(value ?? "");
  const items = list.data ?? [];
  return (
    <Select value={current || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)} disabled={disabled}>
      <SelectTrigger id={id} className="w-full max-w-72">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{m.pref_iface_any()}</SelectItem>
        {current && !items.some((i) => i.value === current) && <SelectItem value={current}>{current}</SelectItem>}
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AddressSelect({
  iface,
  value,
  onChange,
  disabled,
  id,
}: {
  iface: string;
  value: unknown;
  onChange: (v: string) => void;
  disabled?: boolean;
  id: string;
}) {
  const list = useQuery({
    queryKey: ["preferences", "addresses", iface],
    queryFn: () => api.networkAddresses(iface),
    staleTime: 60_000,
  });
  const current = String(value ?? "");
  const items = list.data ?? [];
  return (
    <Select value={current || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)} disabled={disabled}>
      <SelectTrigger id={id} className="w-full max-w-72">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{m.pref_address_any()}</SelectItem>
        {current && !items.includes(current) && <SelectItem value={current}>{current}</SelectItem>}
        {items.map((a) => (
          <SelectItem key={a} value={a}>
            {a}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export interface FieldProps {
  name: string;
  value: unknown;
  onChange: (v: unknown) => void;
  /** Needed by the address field: the chosen interface. */
  readValue?: (key: string) => unknown;
  disabled?: boolean;
  description?: ReactNode;
  /** "row": label left, control right (Alle Optionen); "stack": label above (sections). */
  layout?: "row" | "stack";
}

/** One setting of qBittorrent, drawn by its type from the table in src/lib/preferences. */
export function PrefField({ name, value, onChange, readValue, disabled, description, layout = "stack" }: FieldProps) {
  const f = field(name);
  const id = useId();
  const locked = disabled || f.readOnly;
  const label = (
    <Label
      htmlFor={id}
      className="flex-col items-start gap-0.5"
      title={f.original ? `qBittorrent: ${f.original}` : undefined}
    >
      <span>{f.label()}</span>
      {layout === "row" && <span className="font-mono font-normal text-[11px] text-muted-foreground">{f.key}</span>}
    </Label>
  );
  const desc = description && <span className="text-muted-foreground text-sm">{description}</span>;

  if (f.type === "bool") {
    return (
      <div className={cn("flex items-center justify-between gap-4", layout === "row" && "py-1")} data-pref={f.key}>
        <div className="flex flex-col gap-1">
          {label}
          {desc}
        </div>
        <Switch id={id} checked={value === true} onCheckedChange={(v) => onChange(v)} disabled={locked} />
      </div>
    );
  }

  let control: ReactNode;
  switch (f.type) {
    case "number":
      control = <NumberInput f={f} id={id} value={value} onChange={onChange} disabled={locked} />;
      break;
    case "enum":
      control = (
        <Select value={JSON.stringify(value)} onValueChange={(v) => onChange(JSON.parse(v))} disabled={locked}>
          <SelectTrigger id={id} className="w-full max-w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {f.options?.map((o) => (
              <SelectItem key={String(o.value)} value={JSON.stringify(o.value)}>
                {o.label()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
      break;
    case "lines":
      control = (
        <Textarea
          id={id}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          disabled={locked}
          className="min-h-20 font-mono text-[13px]"
        />
      );
      break;
    case "password":
      control = (
        <Input
          id={id}
          type="password"
          autoComplete="new-password"
          value={String(value ?? "")}
          placeholder={m.pref_password_unchanged()}
          onChange={(e) => onChange(e.target.value)}
          disabled={locked}
          className="max-w-72"
        />
      );
      break;
    case "scan":
      control = <ScanDirs value={value} onChange={onChange} disabled={locked} />;
      break;
    case "iface":
      control = <InterfaceSelect id={id} value={value} onChange={onChange} disabled={locked} />;
      break;
    case "ifaddr":
      control = (
        <AddressSelect
          id={id}
          iface={String(readValue?.("current_network_interface") ?? "")}
          value={value}
          onChange={onChange}
          disabled={locked}
        />
      );
      break;
    default:
      control = (
        <Input
          id={id}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          disabled={locked}
          readOnly={f.readOnly}
          className={cn(mono(f) && "font-mono text-[13px]")}
        />
      );
  }

  if (layout === "row") {
    return (
      <div
        className="grid grid-cols-1 items-start gap-2 py-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:gap-6"
        data-pref={f.key}
      >
        <div className="flex flex-col gap-1 pt-1.5">
          {label}
          {desc}
        </div>
        <div className="flex min-w-0 items-center">{control}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2" data-pref={f.key}>
      {label}
      {control}
      {desc}
    </div>
  );
}
