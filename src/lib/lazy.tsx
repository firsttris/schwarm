import { type ComponentType, lazy, type ReactNode, Suspense, useState } from "react";

/**
 * Code that is not needed for the first screen (details with the chart, dialogs, other pages)
 * is loaded on first use. `whenUsed` mounts it the first time `active` is true and keeps it
 * mounted afterwards, so closing animations still play.
 */
// biome-ignore lint/suspicious/noExplicitAny: any props, kept by the return type
export function lazyNamed<M extends Record<K, ComponentType<any>>, K extends keyof M & string>(
  load: () => Promise<M>,
  name: K,
): M[K] {
  return lazy(async () => ({ default: (await load())[name] })) as unknown as M[K];
}

export function WhenUsed({ active, children }: { active: boolean; children: ReactNode }) {
  const [used, setUsed] = useState(active);
  if (active && !used) setUsed(true);
  if (!used && !active) return null;
  return <Suspense fallback={null}>{children}</Suspense>;
}
