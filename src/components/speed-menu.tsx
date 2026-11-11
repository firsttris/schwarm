import { useQuery } from "@tanstack/react-query";
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon, GaugeIcon } from "lucide-react";
import { type FormEvent, useEffect, useId, useState } from "react";
import { api } from "@/api/client";
import { useMaindata, useRunAction } from "@/api/queries";
import type { SpeedPreferences } from "@/api/schemas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { formatSpeed } from "@/lib/format";
import {
  formatLimitPair,
  formatMbps,
  formatSchedule,
  parseMbps,
  schedulerDays,
  schedulerDaysLabel,
} from "@/lib/limits";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages.js";

const speedKey = ["preferences", "speed"] as const;

export function useSpeedPreferences(enabled = true) {
  return useQuery({ queryKey: speedKey, queryFn: api.speedPreferences, enabled, staleTime: 10_000 });
}

/**
 * The speeds in the header open the speed menu (docs/mockup/Kontextmenue.dc.html): the
 * "Langsamer Modus" switch is qBittorrent's alternative speed limits
 * (transfer/toggleSpeedLimitsMode), the limits and the schedule are app/preferences.
 */
export function SpeedMenu() {
  const { data } = useMaindata();
  const run = useRunAction();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const prefs = useSpeedPreferences(open || editing);
  const s = data?.serverState ?? {};
  const slow = s.use_alt_speed_limits ?? false;
  const p = prefs.data ?? {};

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={slow ? "outline" : "ghost"}
            size="sm"
            className={cn("gap-3 tabular-nums", !slow && "text-muted-foreground")}
            data-testid="global-speeds"
            aria-label={m.speed_menu()}
          >
            {slow && (
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <GaugeIcon aria-hidden />
                {m.slow_mode_short()}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <ArrowDownIcon className="size-3.5" aria-label={m.download()} />
              {formatSpeed(s.dl_info_speed ?? 0)}
            </span>
            <span className="inline-flex items-center gap-1">
              <ArrowUpIcon className="size-3.5" aria-label={m.upload()} />
              {formatSpeed(s.up_info_speed ?? 0)}
            </span>
            <ChevronDownIcon className="text-muted-foreground" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[300px]">
          <DropdownMenuLabel className="text-muted-foreground text-xs">{m.speed()}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="items-start gap-3 py-2"
            onSelect={(e) => {
              e.preventDefault();
              void run(() => api.toggleSpeedLimitsMode());
            }}
            title="Alternative speed limits"
          >
            <span className="flex flex-1 flex-col">
              <span className="font-medium">{m.slow_mode()}</span>
              <span className="text-[13px] text-muted-foreground">{m.slow_mode_hint()}</span>
            </span>
            <Switch checked={slow} aria-label={m.slow_mode()} className="pointer-events-none mt-0.5" tabIndex={-1} />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="flex h-8 items-center px-2 text-sm">
            {m.speed_normal()}
            <DropdownMenuShortcut className="tracking-normal">
              {formatLimitPair(p.dl_limit ?? 0, p.up_limit ?? 0)}
            </DropdownMenuShortcut>
          </div>
          <div className="flex h-8 items-center px-2 text-sm">
            {m.speed_slow()}
            <DropdownMenuShortcut className="tracking-normal">
              {formatLimitPair(p.alt_dl_limit ?? 0, p.alt_up_limit ?? 0)}
            </DropdownMenuShortcut>
          </div>
          <div className="flex h-8 items-center px-2 text-sm">
            {m.schedule()}
            <DropdownMenuShortcut className="tracking-normal">
              {p.scheduler_enabled ? formatSchedule(p) : m.off()}
            </DropdownMenuShortcut>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setEditing(true)}>{m.speed_edit()}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SpeedLimitsDialog open={editing} prefs={prefs.data} onClose={() => setEditing(false)} />
    </>
  );
}

function MbpsInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={m.limit_unlimited()}
          className="pr-14"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground text-sm">
          MB/s
        </span>
      </div>
    </div>
  );
}

const toTime = (h = 0, min = 0) => `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
const fromTime = (v: string) => {
  const [h = "0", min = "0"] = v.split(":");
  return { h: Number(h), min: Number(min) };
};

/** Normal and slow limits plus the schedule for the slow mode. */
function SpeedLimitsDialog({ open, prefs, onClose }: { open: boolean; prefs?: SpeedPreferences; onClose: () => void }) {
  const run = useRunAction();
  const [dl, setDl] = useState("");
  const [up, setUp] = useState("");
  const [altDl, setAltDl] = useState("");
  const [altUp, setAltUp] = useState("");
  const [scheduled, setScheduled] = useState(false);
  const [from, setFrom] = useState("08:00");
  const [to, setTo] = useState("18:00");
  const [days, setDays] = useState("0");

  // biome-ignore lint/correctness/useExhaustiveDependencies: fill the form when it opens
  useEffect(() => {
    if (!open || !prefs) return;
    setDl(formatMbps(prefs.dl_limit ?? 0));
    setUp(formatMbps(prefs.up_limit ?? 0));
    setAltDl(formatMbps(prefs.alt_dl_limit ?? 0));
    setAltUp(formatMbps(prefs.alt_up_limit ?? 0));
    setScheduled(prefs.scheduler_enabled ?? false);
    setFrom(toTime(prefs.schedule_from_hour, prefs.schedule_from_min));
    setTo(toTime(prefs.schedule_to_hour, prefs.schedule_to_min));
    setDays(String(prefs.scheduler_days ?? 0));
  }, [open, prefs === undefined]);

  const values = [dl, up, altDl, altUp].map(parseMbps);
  const invalid = values.some(Number.isNaN);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (invalid) return;
    onClose();
    const f = fromTime(from);
    const t = fromTime(to);
    const [dlLimit = 0, upLimit = 0, altDlLimit = 0, altUpLimit = 0] = values;
    await run(
      () =>
        api.setPreferences({
          dl_limit: dlLimit,
          up_limit: upLimit,
          alt_dl_limit: altDlLimit,
          alt_up_limit: altUpLimit,
          scheduler_enabled: scheduled,
          schedule_from_hour: f.h,
          schedule_from_min: f.min,
          schedule_to_hour: t.h,
          schedule_to_min: t.min,
          scheduler_days: Number(days),
        }),
      { success: m.toast_limits_saved(), invalidate: [[...speedKey]] },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{m.speed_edit_title()}</DialogTitle>
            <DialogDescription>{m.speed_edit_text()}</DialogDescription>
          </DialogHeader>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 font-medium text-sm">{m.speed_normal()}</legend>
            <div className="grid grid-cols-2 gap-4">
              <MbpsInput label={m.limits_download()} value={dl} onChange={setDl} />
              <MbpsInput label={m.limits_upload()} value={up} onChange={setUp} />
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 font-medium text-sm" title="Alternative speed limits">
              {m.slow_mode()}
            </legend>
            <div className="grid grid-cols-2 gap-4">
              <MbpsInput label={m.limits_download()} value={altDl} onChange={setAltDl} />
              <MbpsInput label={m.limits_upload()} value={altUp} onChange={setAltUp} />
            </div>
          </fieldset>
          <Separator />
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="schedule-switch" className="flex flex-col items-start gap-1">
              <span>{m.schedule_enable()}</span>
              <span className="font-normal text-muted-foreground text-sm">{m.schedule_hint()}</span>
            </Label>
            <Switch id="schedule-switch" checked={scheduled} onCheckedChange={setScheduled} />
          </div>
          {scheduled && (
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="schedule-from">{m.schedule_from()}</Label>
                <Input id="schedule-from" type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="schedule-to">{m.schedule_to()}</Label>
                <Input id="schedule-to" type="time" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="schedule-days">{m.schedule_days()}</Label>
                <Select value={days} onValueChange={setDays}>
                  <SelectTrigger id="schedule-days" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {schedulerDays.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {schedulerDaysLabel(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {m.cancel()}
            </Button>
            <Button type="submit" disabled={invalid}>
              {m.save()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
