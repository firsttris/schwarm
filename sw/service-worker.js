// Schwarm's service worker (built into sw.js by scripts/vite-sw.ts, which puts VERSION and
// PRECACHE in front). It keeps the app shell for when qBittorrent can't be reached, and never
// touches the API: torrents, settings and the login always come from qBittorrent.
//
// qBittorrent serves the folder under any path (src/webui/webapplication.cpp), so every URL is
// resolved against the worker's scope. Service workers need a secure context (HTTPS or
// localhost); over plain http the app works the same, just without this.

/* global VERSION, PRECACHE */
const CACHE = `schwarm-${VERSION}`;
const scope = self.registration.scope;
const url = (path) => new URL(path, scope).href;
const shell = new Set(PRECACHE.map(url));
const index = url("index.html");

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([...shell]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith("schwarm-") && k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || !request.url.startsWith(scope)) return;
  // the API is qBittorrent's: never from a cache
  if (request.url.startsWith(url("api/"))) return;

  // the page: from qBittorrent while it answers, so an update shows at once; the copy offline
  if (request.mode === "navigate" || request.url === index || request.url === scope) {
    event.respondWith(fetch(request).catch(async () => (await caches.match(index)) ?? Response.error()));
    return;
  }

  // assets have hashed names: the copy is always right
  const plain = request.url.split(/[?#]/)[0];
  if (shell.has(plain)) {
    event.respondWith(caches.match(plain).then((hit) => hit ?? fetch(request)));
  }
});
