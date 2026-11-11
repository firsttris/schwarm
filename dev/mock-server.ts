import { lstat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { createMockApi } from "./mock-api";

/**
 * Runs the mock qBittorrent API.
 *
 *   bun dev/mock-server.ts                       API only, for `vite` (which proxies /api)
 *   bun dev/mock-server.ts --static dist/public  also serves the build, like qBittorrent's
 *                                                alternative WebUI: no SPA fallback, unknown
 *                                                paths are a 404, symlinks are refused
 *
 * Environment: MOCK_PORT (8899), MOCK_AUTH=1 (require admin / adminadmin), MOCK_FROZEN=1.
 */

const args = process.argv.slice(2);
const staticIndex = args.indexOf("--static");
const staticDir = staticIndex >= 0 ? resolve(args[staticIndex + 1] ?? "dist/public") : undefined;
const port = Number(process.env.MOCK_PORT ?? 8899);

const mock = createMockApi({
  auth: process.env.MOCK_AUTH === "1",
  frozen: process.env.MOCK_FROZEN === "1",
});
setInterval(() => mock.tick(), 1000);

const types: Record<string, string> = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".ico": "image/x-icon",
};

async function serveStatic(pathname: string): Promise<Response> {
  if (!staticDir) return new Response("Not Found", { status: 404 });
  const rel = normalize(decodeURIComponent(pathname === "/" ? "/index.html" : pathname));
  const file = join(staticDir, rel);
  if (!file.startsWith(staticDir)) return new Response("Forbidden", { status: 403 });
  try {
    const info = await lstat(file);
    if (info.isSymbolicLink() || !info.isFile()) return new Response("Not Found", { status: 404 });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
  const ext = extname(file);
  // qBittorrent caches JS and CSS for 12 h, everything else no-store (webapplication.cpp)
  const cache = ext === ".js" || ext === ".css" ? "private, max-age=43200" : "no-store";
  return new Response(Bun.file(file), {
    headers: { "content-type": types[ext] ?? "application/octet-stream", "cache-control": cache },
  });
}

Bun.serve({
  port,
  async fetch(req) {
    const res = await mock.handle(req);
    if (res) return res;
    return serveStatic(new URL(req.url).pathname);
  },
});

console.log(`Mock qBittorrent on http://localhost:${port}${staticDir ? ` (serving ${staticDir})` : ""}`);
