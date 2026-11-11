import { type FormEvent, useEffect, useId, useState } from "react";
import { api } from "@/api/client";
import { useRunAction } from "@/api/queries";
import {
  NO_LIMIT,
  type ShareLimitAction,
  type ShareLimitsMode,
  shareLimitActions,
  type Torrent,
  USE_GLOBAL_LIMIT,
} from "@/api/schemas";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatMbps, parseMbps } from "@/lib/limits";
import { m } from "@/paraglide/messages.js";

type ShareMode = "global" | "none" | "custom";

export function shareActionLabel(action: ShareLimitAction): string {
  switch (action) {
    case "Stop":
      return m.share_action_stop();
    case "Remove":
      return m.share_action_remove();
    case "RemoveWithContent":
      return m.share_action_remove_files();
    case "EnableSuperSeeding":
      return m.share_action_super_seeding();
    default:
      return m.share_action_default();
  }
}

function LimitField({
  label,
  value,
  onChange,
  hint,
  unit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  unit: string;
}) {
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
          {unit}
        </span>
      </div>
      {hint && <span className="text-muted-foreground text-sm">{hint}</span>}
    </div>
  );
}

function OptionalNumber({
  checked,
  onChecked,
  label,
  value,
  onChange,
  unit,
}: {
  checked: boolean;
  onChecked: (v: boolean) => void;
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
}) {
  const id = useId();
  return (
    <div className="grid grid-cols-[1fr_140px] items-center gap-3">
      <div className="flex items-center gap-2">
        <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChecked(v === true)} />
        <Label htmlFor={id} className="font-normal">
          {label}
        </Label>
      </div>
      <div className="relative">
        <Input
          aria-label={label}
          inputMode="decimal"
          value={value}
          disabled={!checked}
          onChange={(e) => onChange(e.target.value)}
          className="pr-12"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground text-sm">
          {unit}
        </span>
      </div>
    </div>
  );
}

/**
 * "Limits …" for one or more torrents: speed limits (torrents/setDownloadLimit,
 * setUploadLimit) and when to stop sharing (torrents/setShareLimits, as shareratio.html of
 * the stock WebUI: global, none or custom ratio / seeding time / inactive time).
 */
export function LimitsDialog({ torrents, open, onClose }: { torrents: Torrent[]; open: boolean; onClose: () => void }) {
  const run = useRunAction();
  const first = torrents[0];
  const [dl, setDl] = useState("");
  const [up, setUp] = useState("");
  const [mode, setMode] = useState<ShareMode>("global");
  const [useRatio, setUseRatio] = useState(true);
  const [ratio, setRatio] = useState("2");
  const [useTime, setUseTime] = useState(false);
  const [time, setTime] = useState("1440");
  const [useInactive, setUseInactive] = useState(false);
  const [inactive, setInactive] = useState("60");
  const [action, setAction] = useState<ShareLimitAction>("Default");
  const [matchAll, setMatchAll] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: fill the form when it opens
  useEffect(() => {
    if (!open || !first) return;
    setDl(formatMbps(first.dl_limit));
    setUp(formatMbps(first.up_limit));
    const r = first.ratio_limit;
    const st = first.seeding_time_limit;
    const it = first.inactive_seeding_time_limit;
    const isGlobal = r === USE_GLOBAL_LIMIT && st === USE_GLOBAL_LIMIT && it === USE_GLOBAL_LIMIT;
    const isNone = r === NO_LIMIT && st === NO_LIMIT && it === NO_LIMIT;
    setMode(isGlobal ? "global" : isNone ? "none" : "custom");
    setUseRatio(r >= 0 || isGlobal);
    setRatio(r >= 0 ? String(Math.round(r * 100) / 100) : "2");
    setUseTime(st >= 0);
    setTime(st >= 0 ? String(st) : "1440");
    setUseInactive(it >= 0);
    setInactive(it >= 0 ? String(it) : "60");
    setAction(
      (shareLimitActions as readonly string[]).includes(first.share_limit_action)
        ? (first.share_limit_action as ShareLimitAction)
        : "Default",
    );
    setMatchAll(first.share_limits_mode === "MatchAll");
  }, [open]);

  const hashes = torrents.map((t) => t.hash);
  const num = (v: string) => Number(v.replace(",", "."));
  const invalid =
    (mode === "custom" &&
      ((useRatio && !(num(ratio) >= 0)) || (useTime && !(num(time) >= 0)) || (useInactive && !(num(inactive) >= 0)))) ||
    Number.isNaN(parseMbps(dl)) ||
    Number.isNaN(parseMbps(up));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (invalid) return;
    onClose();
    const pick = (on: boolean, v: string) => (on ? num(v) : NO_LIMIT);
    const limits =
      mode === "global"
        ? {
            ratioLimit: USE_GLOBAL_LIMIT,
            seedingTimeLimit: USE_GLOBAL_LIMIT,
            inactiveSeedingTimeLimit: USE_GLOBAL_LIMIT,
          }
        : mode === "none"
          ? { ratioLimit: NO_LIMIT, seedingTimeLimit: NO_LIMIT, inactiveSeedingTimeLimit: NO_LIMIT }
          : {
              ratioLimit: pick(useRatio, ratio),
              seedingTimeLimit: Math.round(pick(useTime, time)),
              inactiveSeedingTimeLimit: Math.round(pick(useInactive, inactive)),
            };
    await run(
      () =>
        Promise.all([
          api.setDownloadLimit(hashes, parseMbps(dl)),
          api.setUploadLimit(hashes, parseMbps(up)),
          api.setShareLimits(hashes, {
            ...limits,
            shareLimitAction: mode === "custom" ? action : "Default",
            shareLimitsMode: (mode === "custom" ? (matchAll ? "MatchAll" : "MatchAny") : "Default") as ShareLimitsMode,
          }),
        ]),
      { success: m.toast_limits_saved() },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{m.limits_title()}</DialogTitle>
            <DialogDescription className="break-all">
              {torrents.length === 1 ? first?.name : m.n_torrents({ n: torrents.length })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <LimitField label={m.limits_download()} value={dl} onChange={setDl} unit="MB/s" />
            <LimitField label={m.limits_upload()} value={up} onChange={setUp} unit="MB/s" />
          </div>
          <p className="-mt-2 text-muted-foreground text-sm">{m.limits_speed_hint()}</p>

          <Separator />

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-medium text-sm" title="Share ratio limit">
              {m.limits_share_title()}
            </legend>
            <p className="mb-1 text-muted-foreground text-sm">{m.limits_share_text()}</p>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as ShareMode)} className="gap-3">
              {(
                [
                  ["global", m.limits_share_global()],
                  ["none", m.limits_share_none()],
                  ["custom", m.limits_share_custom()],
                ] as const
              ).map(([value, label]) => (
                <div key={value} className="flex items-center gap-2.5">
                  <RadioGroupItem id={`share-${value}`} value={value} />
                  <Label htmlFor={`share-${value}`} className="font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {mode === "custom" && (
              <div className="mt-1 flex flex-col gap-3 rounded-lg border p-3">
                <OptionalNumber
                  checked={useRatio}
                  onChecked={setUseRatio}
                  label={m.limits_ratio()}
                  value={ratio}
                  onChange={setRatio}
                  unit=""
                />
                <OptionalNumber
                  checked={useTime}
                  onChecked={setUseTime}
                  label={m.limits_seeding_time()}
                  value={time}
                  onChange={setTime}
                  unit="Min"
                />
                <OptionalNumber
                  checked={useInactive}
                  onChecked={setUseInactive}
                  label={m.limits_inactive_time()}
                  value={inactive}
                  onChange={setInactive}
                  unit="Min"
                />
                <div className="flex items-center gap-2">
                  <Checkbox id="share-match-all" checked={matchAll} onCheckedChange={(v) => setMatchAll(v === true)} />
                  <Label htmlFor="share-match-all" className="font-normal">
                    {m.limits_match_all()}
                  </Label>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="share-action">{m.limits_then()}</Label>
                  <Select value={action} onValueChange={(v) => setAction(v as ShareLimitAction)}>
                    <SelectTrigger id="share-action" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {shareLimitActions.map((a) => (
                        <SelectItem key={a} value={a}>
                          {shareActionLabel(a)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </fieldset>

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
