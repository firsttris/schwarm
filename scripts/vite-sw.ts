import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Plugin } from "vite";

/**
 * Emits sw.js on build: sw/service-worker.js with the list of every built file (PRECACHE) and a
 * version from their names, so a new release brings a new cache (docs/spec.md: PWA).
 */
export function serviceWorker(): Plugin {
  return {
    name: "schwarm-service-worker",
    apply: "build",
    async generateBundle(_options, bundle) {
      const files = Object.keys(bundle)
        .filter((f) => !f.endsWith(".map"))
        .sort();
      const assets = ["index.html", "favicon.svg", "manifest.json", "icons/icon-192.png", "icons/icon-512.png"];
      const precache = [...new Set([...assets, ...files])];
      const version = createHash("sha256").update(precache.join("\n")).digest("hex").slice(0, 12);
      const source = await readFile(new URL("../sw/service-worker.js", import.meta.url), "utf8");
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: `const VERSION = ${JSON.stringify(version)};\nconst PRECACHE = ${JSON.stringify(precache)};\n\n${source}`,
      });
    },
  };
}
