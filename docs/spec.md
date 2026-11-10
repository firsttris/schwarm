# Schwarm – specification

Schwarm is a new web UI for qBittorrent. It replaces the stock WebUI and VueTorrent with a calm,
modern interface in the shadcn/ui style. Every feature of the qBittorrent WebUI stays reachable, but
the rare ones sit one level deeper.

This file is the brief for building it. Read it fully before starting a milestone.

## How it runs

- Schwarm is a **static single-page app** that qBittorrent itself serves as its
  **"alternative WebUI"** (Options → WebUI → "Use alternative WebUI", or the preference
  `alternative_webui_enabled` / `alternative_webui_path`). There is no backend of our own.
- The app talks to the **qBittorrent WebUI API v2** on the same origin (`/api/v2/...`). The login is
  qBittorrent's own (`auth/login`, cookie `SID`). If qBittorrent bypasses auth for the client
  (localhost or a whitelisted subnet), the app works without a login screen.
- Reference: qBittorrent **5.3.0** (WebAPI 2.16.2). Clone `qbittorrent/qBittorrent` at tag
  `release-5.3.0` into the scratchpad and read the sources instead of guessing:
  - API: `src/webui/api/*controller.cpp` (every `…Action`), `src/webui/api/serialize/*`
  - What the stock WebUI does: `src/webui/www/private/` (`index.html`, `scripts/*.js`, `views/*.html`)
  - How files are served: `src/webui/webapplication.cpp`

### Constraints from qBittorrent's file serving (`webapplication.cpp`)

- The release folder must contain **`public/`** with `index.html` and all assets. qBittorrent serves
  `<root>/private/<path>` after login and falls back to `<root>/public/<path>`; a public-only build is
  enough.
- **No symlinks** inside the folder (qBittorrent refuses to serve them).
- **No SPA fallback**: an unknown path is a 404. Use **hash history** in TanStack Router
  (`/#/torrents`), and relative asset paths (Vite `base: './'`).
- Text files (`text/plain` and below, which includes HTML, JS, CSS) are run through qBittorrent's
  translator, which replaces `QBT_TR(…)QBT_TR[CONTEXT=…]`. Make sure the build output never contains
  the string `QBT_TR(` (add a check to the build).
- Caching: JS and CSS are cached for 12 h, everything else `no-store`. Use hashed file names (Vite
  default) so updates load at once.
- No CSP is sent for an alternative WebUI, but load nothing from other origins anyway: fonts are
  bundled (`@fontsource-variable/geist`, `@fontsource-variable/geist-mono`).

### Release

- A tag `vX.Y.Z` builds `schwarm-vX.Y.Z.zip` containing `schwarm/public/…` and `schwarm/version.txt`,
  and attaches it to the GitHub release (shared workflows in `firsttris/workflows`: `bump-version.yml`,
  `tested-on-main.yml`, `github-release.yml`).
- Install = unpack the folder somewhere qBittorrent can read it and set the alternative WebUI path
  to it. The README explains this, including Docker (`linuxserver/qbittorrent`: put it under
  `/config/schwarm`).

## Stack

Follow `firsttris/workflows` → `tech-stack.md`. For this project:

- React, TanStack Router (hash history, file-based routes), TanStack Query, TanStack Table,
  TanStack Virtual (the torrent list can have thousands of rows).
- Tailwind CSS 4, components in the shadcn/ui style **in the repo** (generated with the `shadcn` CLI,
  built on Radix, variants with `class-variance-authority`), icons from `lucide-react`.
- Charts: uPlot with a small wrapper that reads the colours from the CSS variables.
- Paraglide JS for German and English (`messages/de.json`, `messages/en.json`), German first,
  language follows the browser, switchable in the settings.
- PWA: installable, offline shell (the data needs the server anyway).
- Bun, Vite, Biome, TypeScript strict, Vitest, Playwright (`bun --bun playwright test`).

## Design

The mockup is the look to follow: claude.ai artifact
<https://claude.ai/artifact/DPwC4irUVMArNCA7E1Fg3Z>, page **"shadcn"** (page "Entwurf 1" is
discarded). The sources of its screens are in [`docs/mockup/`](mockup/) as `.dc.html` files (HTML
with inline styles and a small template syntax; read them for layout, spacing and copy). The
**Funktionsliste** artboard maps every qBittorrent feature to its place in Schwarm; its content is
in [`features.md`](features.md).

Rules, because the user explicitly does not want it to look like generated "AI design":

- **Real shadcn tokens** (the default `neutral` theme of shadcn for Tailwind 4): `--background`,
  `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`,
  `--muted-foreground`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--chart-1…5`,
  `--sidebar-*`, radius `0.625rem`. Light and dark, plus "system" as the default.
- **Neutral primary** (near-black in light, near-white in dark). No brand blue, no gradients, no
  glows, no coloured icon tiles, no emoji.
- Colour only where it means something: `--destructive` for errors and delete, a green for the
  "VPN connected / tracker working" state, the chart colours in charts. Status in the list is an
  icon plus a word, not a coloured pill.
- shadcn patterns as in their examples: **sidebar** (`variant="inset"`) with groups and
  `SidebarMenuBadge` counters, header with `SidebarTrigger` and breadcrumb, **data table** with
  checkboxes, sortable headers, dashed faceted filter buttons, "View" column menu, pagination
  footer ("2 of 10 row(s) selected"), **Sheet** from the right for torrent details, **Dialog** for
  adding, **ContextMenu** and **DropdownMenu** for actions, **Tabs**, **Switch**, **Checkbox**,
  **RadioGroup**, **Badge**, **Progress**, **Command** for the `/` quick search.
- Font Geist, numbers with `tabular-nums`, Geist Mono only for paths, hashes and IPs.
- Plain, friendly German texts instead of qBittorrent jargon ("Weitergeben bis Ratio 2,0" instead of
  "Share ratio limit"). The original term can go into a tooltip.
- Phone: list instead of table, bottom tab bar (Torrents, Suche, RSS, Einstellungen), details as a
  full screen, long press for the action menu. Touch targets at least 44 px.

## Data

- Live updates through **`sync/maindata?rid=…`** (incremental), polled every 1–2 s while the tab is
  visible, slower when hidden. Keep the merged state in the TanStack Query cache; never refetch the
  whole list.
- Details through `torrents/properties`, `files`, `trackers`, `webseeds`, `sync/torrentPeers`,
  `torrents/pieceStates`, polled only while the sheet is open.
- Actions are `POST` with form data; update optimistically where it is safe (start/stop, category,
  tags), then let the next `maindata` correct it.
- Wrap the API in one typed client (`src/api/`) with Zod schemas at the boundary, so the UI never
  sees raw JSON. Field names and meanings come from the qBittorrent sources, not from memory.
- The external IP and connection state come from `sync/maindata` → `server_state`
  (`last_external_address_v4`, `connection_status`, `dht_nodes`, `free_space_on_disk`). The VPN card
  shows them; it does not talk to gluetun.

## Milestones

Each milestone is one pull request with tests and screenshots (desktop and `@phone`, light and dark).

1. **Base and torrent list**
   - Repository setup: Bun, Vite, TypeScript, Biome, Tailwind 4, shadcn components, Paraglide,
     Vitest, Playwright, CI (`.github/workflows/ci.yml`: typecheck, lint, test, build, e2e) and the
     release workflow that attaches the ZIP; README (English) and `README.de.md` from the template in
     `firsttris/workflows`.
   - A **mock qBittorrent API** for development and the E2E tests (MSW or a small Bun server under
     `dev/`), seeded with the torrents from the mockup, including `sync/maindata` deltas.
   - Login screen (only shown when the API answers 403), app shell with sidebar (status filters,
     categories, tags, trackers, areas), header (speeds, "Hinzufügen"), light/dark/system.
   - Torrent table as in the mockup: selection, sorting, filter field, faceted filters, column menu,
     virtualised rows, footer; row actions menu and the full context menu (see `features.md`).
   - Details sheet with the four tabs (Übersicht with chart, Dateien with priorities, Peers,
     Tracker incl. web seeds).
   - "Torrent hinzufügen" dialog (links, files, drag & drop anywhere, category, path, start,
     sequential, "Weitere Optionen").
   - Phone layout for list and details.
2. **Categories, tags, limits, queue**: management dialog, per-torrent limits dialog, queue
   actions, speed menu with alternative limits and schedule, set location, rename (single and
   multi-file).
3. **Search**: search page, plugin management in the settings.
4. **RSS**: feeds, articles, auto-downloader rules with the live preview of matching articles
   (`rss/matchingArticles`), import/export.
5. **Settings**: the simple sections from the mockup, plus "Alle Optionen": a searchable list of
   every preference, generated from a table that covers all fields of `app/preferences`, so none
   is missing. Network interface and port show a note when they are managed from outside.
6. **The rest**: statistics, log, torrent creator, cookies, about, logout.

## Deployment on the author's server

Not part of the repository's work: the author's qBittorrent runs in Podman behind gluetun (VPN).
After a release, the ZIP is unpacked to `/home/tristan/docker/qbittorrent/schwarm` (`/config/schwarm`
in the container) and set as the alternative WebUI path. Do not try to reach that server from the
build.
