import { useQuery } from "@tanstack/react-query";
import { type ComponentProps, useEffect, useId, useState } from "react";
import { api } from "@/api/client";
import { Input } from "@/components/ui/input";
import { folderOf, suggestPaths } from "@/lib/paths";

/** What was typed, a moment later: no request per key press. */
function useSettled<T>(value: T, ms = 250): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

/**
 * An input for a path on qBittorrent's machine, with the folders there as suggestions
 * (app/getDirectoryContent, like pathAutofill.js of the stock WebUI). Used like <Input>.
 */
export function PathInput({
  onChange,
  files = false,
  ...props
}: ComponentProps<typeof Input> & { /** Also suggest files (torrent creator). */ files?: boolean }) {
  const listId = useId();
  const [typed, setTyped] = useState(String(props.value ?? props.defaultValue ?? ""));
  useEffect(() => {
    if (props.value !== undefined) setTyped(String(props.value));
  }, [props.value]);
  const [focused, setFocused] = useState(false);
  const text = useSettled(typed);
  const folder = focused ? folderOf(text) : undefined;
  const list = useQuery({
    queryKey: ["directory", folder, files],
    queryFn: () => api.directoryContent(folder ?? "/", files ? "all" : "dirs"),
    enabled: folder !== undefined,
    staleTime: 30_000,
    retry: false,
  });
  // with files the list mixes both, so no separator is added
  const suggestions = list.data ? suggestPaths(text, list.data, 25, !files) : [];
  return (
    <>
      <Input
        {...props}
        list={listId}
        autoComplete="off"
        onChange={(e) => {
          setTyped(e.target.value);
          onChange?.(e);
        }}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
      />
      <datalist id={listId}>
        {suggestions.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </>
  );
}
