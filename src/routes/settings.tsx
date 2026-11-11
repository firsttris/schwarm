import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/components/settings-page";

export const settingsSections = [
  "downloads",
  "speed",
  "seeding",
  "connection",
  "search",
  "ui",
  "log",
  "cookies",
  "system",
  "all",
] as const;
export type SettingsSection = (typeof settingsSections)[number];

export const Route = createFileRoute("/settings")({
  validateSearch: (search: Record<string, unknown>): { section?: SettingsSection } => ({
    section: settingsSections.includes(search.section as SettingsSection)
      ? (search.section as SettingsSection)
      : undefined,
  }),
  component: SettingsPage,
});
