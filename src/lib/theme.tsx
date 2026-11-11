import { useEffect, useSyncExternalStore } from "react";
import { createStore } from "./store";

export type Theme = "light" | "dark" | "system";

export const themeStore = createStore<Theme>("theme", "system");

const media = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : undefined;

function subscribeMedia(cb: () => void) {
  media?.addEventListener("change", cb);
  return () => media?.removeEventListener("change", cb);
}

const systemDark = () => media?.matches ?? false;

/** The chosen theme and what it resolves to; keeps the "dark" class on <html> in sync. */
export function useTheme() {
  const theme = themeStore.use();
  const prefersDark = useSyncExternalStore(subscribeMedia, systemDark, systemDark);
  const resolved: "light" | "dark" = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
  return { theme, resolved, setTheme: themeStore.set };
}

export function ThemeSync() {
  const { resolved } = useTheme();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);
  return null;
}
