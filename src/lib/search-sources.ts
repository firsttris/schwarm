import type { SearchPlugin } from "@/api/schemas";

/**
 * The plugins a search runs with. The choice is kept in the browser; a plugin that was
 * disabled or uninstalled since then drops out, and an empty choice means every enabled
 * plugin ("enabled" for search/start, searchcontroller.cpp startAction).
 */
export function chosenSources(selected: readonly string[], enabled: readonly SearchPlugin[]): string[] {
  const names = new Set(enabled.map((p) => p.name));
  return selected.filter((name) => names.has(name));
}

/**
 * The categories the chosen plugins support (all enabled ones when none are chosen),
 * without "all", sorted by name. A category counts when one of them supports it.
 */
export function sourceCategories(enabled: readonly SearchPlugin[], chosen: readonly string[]): [string, string][] {
  const plugins = chosen.length ? enabled.filter((p) => chosen.includes(p.name)) : enabled;
  const map = new Map<string, string>();
  for (const p of plugins) for (const c of p.supportedCategories) if (c.id !== "all") map.set(c.id, c.name);
  return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
}

/** Toggles one plugin in the choice; choosing every enabled plugin is the same as none. */
export function toggleSource(chosen: readonly string[], name: string, enabledCount: number): string[] {
  const next = chosen.includes(name) ? chosen.filter((n) => n !== name) : [...chosen, name];
  return next.length >= enabledCount ? [] : next;
}
