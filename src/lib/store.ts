import { useSyncExternalStore } from "react";

/**
 * A tiny persisted store for Schwarm's own settings (theme, language, density, columns).
 * They live in the browser, not in qBittorrent (features.md: Settings → "Oberfläche").
 */
export function createStore<T>(key: string, initial: T) {
  const storageKey = `schwarm.${key}`;
  let value: T = initial;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw !== null) value = typeof initial === "string" ? (raw as T) : { ...initial, ...JSON.parse(raw) };
  } catch {
    // no storage (private mode, tests): keep the default
  }
  const listeners = new Set<() => void>();
  const get = () => value;
  const set = (next: T | ((prev: T) => T)) => {
    value = typeof next === "function" ? (next as (prev: T) => T)(value) : next;
    try {
      localStorage.setItem(storageKey, typeof value === "string" ? value : JSON.stringify(value));
    } catch {
      // ignore
    }
    for (const l of listeners) l();
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  const use = () => useSyncExternalStore(subscribe, get, get);
  return { get, set, subscribe, use };
}

/** The same without persistence, for UI state shared between distant components. */
export function createMemoryStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  const get = () => value;
  const set = (next: T | ((prev: T) => T)) => {
    value = typeof next === "function" ? (next as (prev: T) => T)(value) : next;
    for (const l of listeners) l();
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  const use = () => useSyncExternalStore(subscribe, get, get);
  return { get, set, subscribe, use };
}
