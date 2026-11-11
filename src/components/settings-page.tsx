import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { type Density, defaultColumns, preferencesStore, usePreferences } from "@/lib/preferences";
import { type Theme, useTheme } from "@/lib/theme";
import { m } from "@/paraglide/messages.js";
import { getLocale, locales, setLocale } from "@/paraglide/runtime.js";
import { PageHeader } from "./page-header";

const optionalColumns: [string, () => string][] = [
  ["status", m.col_status],
  ["progress", m.col_progress],
  ["speed", m.col_speed],
  ["eta", m.col_eta],
  ["ratio", m.col_ratio],
  ["size", m.col_size],
  ["completed", m.col_completed],
  ["dlspeed", m.col_dlspeed],
  ["upspeed", m.col_upspeed],
  ["seeds", m.col_seeds],
  ["peers", m.col_peers],
  ["category", m.col_category],
  ["tags", m.col_tags],
  ["added_on", m.col_added_on],
  ["completion_on", m.col_completion_on],
  ["save_path", m.col_save_path],
  ["tracker", m.col_tracker],
  ["downloaded", m.col_downloaded],
  ["uploaded", m.col_uploaded],
  ["availability", m.col_availability],
  ["priority", m.col_queue],
  ["time_active", m.col_time_active],
  ["dl_limit", m.col_dl_limit],
  ["up_limit", m.col_up_limit],
  ["last_activity", m.col_last_activity],
];

function Choice({ value, label, hint }: { value: string; label: string; hint?: string }) {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <RadioGroupItem id={id} value={value} className="mt-0.5" />
      <Label htmlFor={id} className="flex flex-col items-start gap-1 font-normal">
        <span>{label}</span>
        {hint && <span className="text-muted-foreground text-sm">{hint}</span>}
      </Label>
    </div>
  );
}

/**
 * Settings → "Oberfläche": Schwarm's own options, stored in the browser (features.md).
 * The qBittorrent preferences follow in milestone 5.
 */
export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const prefs = usePreferences();
  const locale = getLocale();

  const toggleColumn = (id: string, on: boolean) =>
    preferencesStore.set((p) => ({
      ...p,
      columns: on ? [...new Set([...p.columns, id])] : p.columns.filter((c) => c !== id),
    }));

  return (
    <>
      <PageHeader crumbs={[m.nav_settings(), m.settings_ui()]} title={m.nav_settings()} />
      <main className="flex flex-col gap-6 px-4 py-5 md:px-10 md:py-8">
        <div className="hidden flex-col gap-1 md:flex">
          <h1 className="font-semibold text-2xl tracking-tight">{m.nav_settings()}</h1>
          <p className="text-muted-foreground">{m.settings_intro()}</p>
        </div>
        <Separator className="hidden md:block" />
        <div className="flex flex-wrap items-start gap-12">
          <nav aria-label={m.settings_sections()} className="hidden w-[200px] flex-col gap-1 md:flex">
            <span className="flex h-9 items-center rounded-md bg-muted px-3 font-medium text-sm" aria-current="page">
              {m.settings_ui()}
            </span>
            <span className="px-3 py-2 text-muted-foreground text-sm">{m.settings_more_later()}</span>
          </nav>
          <form className="flex max-w-[640px] flex-[999_1_420px] flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col gap-1">
              <h2 className="font-medium text-lg">{m.settings_ui()}</h2>
              <p className="text-muted-foreground">{m.settings_ui_text()}</p>
            </div>
            <Separator />

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 font-medium text-sm">{m.appearance()}</legend>
              <RadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)} className="gap-3">
                <Choice value="light" label={m.theme_light()} />
                <Choice value="dark" label={m.theme_dark()} />
                <Choice value="system" label={m.theme_system()} hint={m.theme_system_hint()} />
              </RadioGroup>
            </fieldset>

            <div className="flex flex-col gap-2">
              <Label htmlFor="language">{m.language()}</Label>
              <Select value={locale} onValueChange={(v) => setLocale(v as (typeof locales)[number])}>
                <SelectTrigger id="language" className="w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locales.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l === "de" ? "Deutsch" : "English"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground text-sm">{m.language_hint()}</span>
            </div>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 font-medium text-sm">{m.density()}</legend>
              <RadioGroup
                value={prefs.density}
                onValueChange={(v) => preferencesStore.set((p) => ({ ...p, density: v as Density }))}
                className="gap-3"
              >
                <Choice value="comfortable" label={m.density_comfortable()} />
                <Choice value="compact" label={m.density_compact()} hint={m.density_compact_hint()} />
              </RadioGroup>
            </fieldset>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 font-medium text-sm">{m.columns()}</legend>
              <p className="mb-2 text-muted-foreground text-sm">{m.columns_hint()}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {optionalColumns.map(([id, label]) => (
                  <ColumnToggle
                    key={id}
                    label={label()}
                    checked={prefs.columns.includes(id)}
                    onChange={(v) => toggleColumn(id, v)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="mt-1 self-start text-muted-foreground text-sm underline-offset-4 hover:underline"
                onClick={() => preferencesStore.set((p) => ({ ...p, columns: defaultColumns }))}
              >
                {m.columns_reset()}
              </button>
            </fieldset>
          </form>
        </div>
      </main>
    </>
  );
}

function ColumnToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  );
}
