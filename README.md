<div align="center">

<img src="docs/screenshots/desktop-list-light.png" alt="Schwarm, a modern web UI for qBittorrent: torrent list with sidebar filters, progress, speed and ratio" width="900">

<h1>Schwarm: a modern web UI for qBittorrent</h1>

**A calm, modern alternative WebUI for qBittorrent, for the desktop and the phone.**<br>
Manage your torrents in a clear list with filters, details, a context menu and drag & drop.<br>
Static files that qBittorrent serves itself: no server, no container, nothing else to run.

[![CI](https://github.com/firsttris/schwarm/actions/workflows/ci.yml/badge.svg)](https://github.com/firsttris/schwarm/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/firsttris/schwarm?logo=github&label=release)](https://github.com/firsttris/schwarm/releases/latest)
[![qBittorrent 5.x](https://img.shields.io/badge/qBittorrent-5.x-2f67ba)](https://www.qbittorrent.org)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

[Install](#-install) •
[Features](#-features) •
[Screenshots](#-screenshots) •
[Alternatives](#-schwarm-and-the-alternatives) •
[FAQ](#-faq) •
[Deutsch](README.de.md)

</div>

## 💡 Why Schwarm?

qBittorrent's own web UI shows everything at once, VueTorrent is colourful and dense. Schwarm keeps
every feature of the qBittorrent WebUI within reach, but puts the common ones first and the rare
ones one level deeper.

- **Calm by design**: neutral colours, plain words instead of jargon ("Download in order" instead of
  "Sequential download"), colour only where it means something (errors, connection state).
- **Fast with thousands of torrents**: virtualised list, incremental updates from qBittorrent,
  nothing reloaded that did not change.
- **Made for the phone too**: list, full-screen details, long press for actions, bottom tab bar.
- **Nothing to run**: a folder of static files that qBittorrent serves as its alternative WebUI.

Runs wherever qBittorrent runs: Linux, Windows, macOS, a NAS, Docker (`linuxserver/qbittorrent`),
behind a VPN container such as gluetun.

## 🚀 Install

### Docker (`linuxserver/qbittorrent`)

Schwarm comes as a [Docker mod](docker/README.md): one line in the container's environment, and it
is set up and updated with every start.

```yaml
environment:
  - DOCKER_MODS=tristanteu/schwarm:latest
```

Recreate the container, open the web UI as before. The image is also at `ghcr.io/firsttris/schwarm`.
To remove it, take the line out again: qBittorrent goes back to its own web UI by itself.

### By hand

1. Download `schwarm-vX.Y.Z.zip` from the [latest release](https://github.com/firsttris/schwarm/releases/latest)
   and unpack it somewhere qBittorrent can read it. You get a folder `schwarm/` with `public/` inside.
2. In qBittorrent: **Options → Web UI → Use alternative WebUI**, and set the path to the `schwarm`
   folder (the one that contains `public/`).
3. Reload the web UI.

**Other Docker images** (e.g. `hotio/qbittorrent`): unpack into the config volume, e.g.
`/config/schwarm`, and set the alternative WebUI path to `/config/schwarm`.

```bash
cd /path/to/qbittorrent/config && curl -L -o schwarm.zip \
  "$(curl -s https://api.github.com/repos/firsttris/schwarm/releases/latest | grep -o 'https://[^"]*schwarm-v[^"]*\.zip')" \
  && unzip -o schwarm.zip && rm schwarm.zip
```

To go back, untick "Use alternative WebUI". Schwarm uses qBittorrent's own login and remembers
only its display settings (theme, language, columns) in your browser.

## ✨ Features

### 📋 Torrent list

- **Data table**: selection, sorting, 25 columns to choose from in "View", pages, row count.
- **Filters**: status, categories (with subcategories), tags and trackers in the sidebar; a filter
  field that searches the name, the save path or the info hash, also with a regular expression;
  status and category filter buttons.
- **Actions** in the context menu, the row menu and the toolbar: start, stop, force start, category,
  tags, set location, rename, queue, automatic management, sequential download, first and last
  pieces first, super seeding, recheck, reannounce, copy (name, hashes, magnet link, path),
  export .torrent, remove with or without files, and limits (speed, ratio, seeding time).
- **Queue**: move up and down from the menu, or drag rows while sorted by queue position.
- **Keyboard**: arrows, Shift and Ctrl to select, Space to start or stop, Del to remove, F2 to
  rename, Enter for the details.

### 🔎 Details

- **Overview**: speed chart of the last minutes, key figures, pieces bar, all other details folded.
- **Files**: file tree with priorities (skip, normal, high, maximum) and a filter; rename one file
  or many at once with search and replace, regular expressions and numbering, with a preview;
  download finished files straight into the browser.
- **Peers**: client, country, flags, progress and speed; add, copy and ban peers.
- **Trackers**: status, tier, seeds and peers, messages; add, edit, remove, reannounce; DHT, PeX and
  LSD; HTTP sources (web seeds).

### ➕ Adding torrents

- **Magnet links, URLs and .torrent files**, several at once, or drop them anywhere on the page.
- **See what you add**: size and file list once qBittorrent has the metadata, and choose which
  files to load before the download starts; save a magnet link as a .torrent file.
- **Folders on the server as suggestions** in every path field, and the free space where it goes.
- **Category and folder** right away; tags, name, incomplete folder, management, content layout,
  stop condition, queue position, hash check skip and limits under "More options".

### ⚙️ Organising and speed

- **Categories and tags** in one dialog: create, set the folder, subcategories, delete, remove the
  unused ones.
- **Speed menu** in the header: slow mode (alternative limits) with one click, normal and slow
  limits, and a schedule for the slow mode.
- **Start all, stop all, pause everything** from the menu behind the app name.

### 📱 Everywhere

- **Phone layout** with list, full-screen details, long press for the actions and a bottom tab bar.
- **Light, dark or system**, German and English (follows the browser).
- **Login** only when qBittorrent asks for it (not on whitelisted networks).
- **As an app** on the phone or desktop: "Add to home screen" or "Install". Over HTTPS (e.g. behind
  a reverse proxy) it also starts when qBittorrent can't be reached.

### 🔍 Search

- **Search through qBittorrent's search plugins**: one field, category, results sorted by seeds,
  filters for source, seeds and size, and "Download" opens the add dialog.
- **Plugins** in the settings: enable, update, add by URL, remove.

### 📰 RSS

- **Feeds and articles** in three columns: folders, unread counts, mark as read, refresh, rename,
  change the URL; "Download" opens the add dialog.
- **Auto-downloader** with a live preview: every recent article shows whether the rule takes it,
  and why not ("missing: desktop", "excluded: arm64"). Episode filter, each episode only once,
  category, folder, tags, pause afterwards; clone, import and export.
- **"Make a rule from it"** on any article suggests a rule from its title.

### ⚙️ Settings

- **The common options in plain words**: folders (also per category), speed limits in MB/s with the
  alternative limits and their schedule, seeding limits and queue, connection, RSS.
- **All 240 options** of qBittorrent in one searchable list, by German or English name or key.
- **API key** for programs such as Sonarr: generate, copy, replace or delete it; a test email for
  the mail notification.
- **Changes are collected** and saved together, or discarded.
- **VPN aware**: if qBittorrent runs behind a VPN interface (e.g. `tun0` in a VPN container), the
  network and port are locked so they are not changed by accident.

### 🧰 Everything else

- **Statistics**: overall speed, all-time and session figures, disk and tracker queues.
- **Log** of qBittorrent, filtered by kind and text, and the blocked peers.
- **Create torrents** from files on the server, with trackers, web seeds and piece size; download
  the `.torrent` when it is done.
- **Cookies** for private trackers and feeds, **about** with all versions, **log out** and
  **quit qBittorrent**.

## 📸 Screenshots

<table>
  <tr>
    <td><img src="docs/screenshots/desktop-details-dark.png" alt="Torrent details in dark mode with speed chart, key figures and pieces bar"></td>
    <td><img src="docs/screenshots/desktop-menu-light.png" alt="Context menu for two selected torrents with the advanced options"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/desktop-files-light.png" alt="File tree of a torrent with download priorities"></td>
    <td><img src="docs/screenshots/desktop-add-dark.png" alt="Add torrent dialog with magnet link, category and folder"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/desktop-settings-connection-light.png" alt="Connection settings with the VPN note and the save bar"></td>
    <td><img src="docs/screenshots/desktop-settings-all-dark.png" alt="All options of qBittorrent, searched for port"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/desktop-statistics-dark.png" alt="Statistics page with speed chart, all-time figures and disk cache"></td>
    <td><img src="docs/screenshots/desktop-log-light.png" alt="Log of qBittorrent with filters by kind"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/phone-list-dark.png" alt="Torrent list on a phone with status tabs and bottom navigation" width="320"></td>
    <td><img src="docs/screenshots/phone-details-light.png" alt="Torrent details on a phone" width="320"></td>
  </tr>
</table>

## 🔀 Schwarm and the alternatives

Schwarm is made for people who want a tidy, modern qBittorrent UI that works on the phone too.

| | What it is | Where Schwarm differs |
|---|---|---|
| [qBittorrent WebUI](https://github.com/qbittorrent/qBittorrent) | the built-in web UI, mirrors the desktop app | fewer things on screen at once, phone layout, plain words |
| [VueTorrent](https://github.com/VueTorrent/VueTorrent) | popular alternative WebUI with many options | calmer, neutral look in the shadcn/ui style, desktop table with keyboard |

## ❓ FAQ

### Is there a modern web UI for qBittorrent?
Yes: Schwarm replaces the stock web UI as qBittorrent's "alternative WebUI". It talks to the same
WebUI API, so nothing else needs to be installed.

### Does Schwarm work with qBittorrent in Docker?
Yes. With `linuxserver/qbittorrent` add `DOCKER_MODS=tristanteu/schwarm:latest` to the
environment ([Docker mod](docker/README.md)). With other images put the unpacked folder into the
config volume (`/config/schwarm`) and set that path as the alternative WebUI.

### Which qBittorrent version do I need?
It is built against qBittorrent 5.3 (WebUI API 2.16). qBittorrent 5.0 and newer should work; 4.x
uses older API names for start and stop.

### Does it need its own server or login?
No. qBittorrent serves the files and does the login.

## 🛠️ Development

Requires [Bun](https://bun.sh) 1.4.

```bash
git clone https://github.com/firsttris/schwarm && cd schwarm
bun install
bun run dev   # Vite on http://localhost:5173 with a mock qBittorrent (dev/mock-server.ts)
```

React, TanStack Router (hash history), Query, Table and Virtual, Tailwind CSS 4 with shadcn/ui
components, Paraglide (German, English), uPlot, Vitest and Playwright. Checks:

```bash
bun run typecheck && bun run lint && bun run test && bun run build && bun run e2e
```

`bun run screenshots` updates the pictures in `docs/screenshots/`. A release is the "Bump version"
action, which tags `vX.Y.Z`; the release workflow attaches `schwarm-vX.Y.Z.zip`.

## 🤝 Contributing

Issues and pull requests are welcome. For a bug, please name your qBittorrent version, the browser
and what you did. Please run the checks above before opening a pull request.

---

<div align="center">

⭐ Like Schwarm? A [star on GitHub](https://github.com/firsttris/schwarm) helps others find it.<br>
🐛 [Report a bug](https://github.com/firsttris/schwarm/issues/new) · 💡 [Request a feature](https://github.com/firsttris/schwarm/issues/new)

<sub>License: <a href="LICENSE">AGPL-3.0</a> · © Tristan Teufel and contributors · <a href="README.de.md">Deutsche Version</a><br>
Changed versions you pass on or run for others must offer their source code under the AGPL; a commercial license without these obligations is available via <a href="https://teufel-it.de">teufel-it.de</a>.<br>
Schwarm is not affiliated with the qBittorrent project.</sub>

</div>
