# Feature map: qBittorrent 5.3.0 WebUI → Schwarm

Everything the stock WebUI of qBittorrent 5.3.0 can do (from `src/webui/www/private` and
`src/webui/api`), and where it goes in Schwarm. "Milestone" refers to [`spec.md`](spec.md).

Done: milestones 1–6. "7" marks what a comparison of the 5.3 API with the stock WebUI
(`src/webui/www/private`) found missing afterwards.

## Torrent list

| qBittorrent | Place in Schwarm | Milestone |
|---|---|---|
| Start, stop, force start | Bulk actions in the toolbar, context menu, row menu, `Space` | 1 |
| Remove, with or without files | Context menu and toolbar; confirmation dialog with "Dateien auch löschen" | 1 |
| Set location, rename, rename files (several, with pattern) | Context menu; set location and the torrent name in a simple dialog, file renaming as its own dialog | 1 (menu, location, name), 2 (files) |
| Category and tags | Context menu with submenus, bulk actions | 1 |
| Automatic torrent management, super seeding, sequential download, first/last piece first | Context menu → "Erweitert" as checkbox items | 1 |
| Per-torrent limits: download, upload, ratio and seeding time | Context menu → "Limits …" (one dialog for all) | 2 |
| Force recheck, force reannounce | Context menu | 1 |
| Queue: top, up, down, bottom | Context menu → "Warteschlange" (shown when queueing is on); drag rows while sorted by the "Warteschlange" column | 1 (menu), 2 (drag) |
| Copy: name, info hash v1/v2, magnet, torrent ID, comment, content path | Context menu → "Kopieren" | 1 |
| Export .torrent | Context menu | 1 |
| Start all / stop all, pause/resume session | Menu behind the app name in the sidebar ("Alles anhalten" / "Weitermachen") | 2 |
| Select all, invert selection | `Ctrl+A`, header checkbox | 1 |
| Status filters (all, downloading, seeding, completed, running, stopped, active, inactive, stalled, stalled up/down, checking, moving, errored) | Sidebar: the five common ones, the rest under "Mehr" | 1 |
| Categories with subcategories | Sidebar, indented | 1 |
| Tags and trackers as filters | Sidebar groups | 1 |
| Filter by name, save path, info hash, regex | Filter field with options | 1 |
| 36 columns, selectable and sortable | 6 default columns, "Ansicht" column menu | 1 |

## Torrent details

| qBittorrent | Place in Schwarm | Milestone |
|---|---|---|
| General: ~30 fields (sizes, time active, wasted, connections, created by/on, hashes, comment …) | Tab "Übersicht": key figures, the rest collapsible | 1 |
| Pieces bar and availability | Tab "Übersicht" below the progress | 1 |
| Content: file tree, priority (do not download, normal, high, maximum), rename, filter | Tab "Dateien" | 1 |
| Download a finished file (`torrents/downloadFile`, 5.3) | Tab "Dateien": download icon at finished files | 7 |
| Peers: country, client, flags, progress, speed, relevance; add, ban, copy IP:port | Tab "Peers" | 1 |
| Trackers: status, tier, seeds/peers, message; add, edit, remove, copy, reannounce | Tab "Tracker" | 1 |
| HTTP sources (web seeds): add, edit, remove, copy | Tab "Tracker", own section | 1 |

## Adding torrents

| qBittorrent | Place in Schwarm | Milestone |
|---|---|---|
| .torrent files, links (several; magnet, HTTP, info hash) | Dialog, drag & drop anywhere | 1 |
| Category, save path, start | Dialog, visible | 1 |
| Free space at the save path (`app/getFreeSpaceAtPath`) | Below "Speichern in", a warning when the torrent does not fit | 7 |
| Save the .torrent of a magnet link (`torrents/saveMetadata`) | Download icon in the preview once the metadata is in | 7 |
| Path suggestions (`app/getDirectoryContent`, pathAutofill.js) | Every path field (add dialog, location, categories, RSS rules, settings, torrent creator): folders of the typed folder | 7 |
| Tags, rename, incomplete path, management mode, content layout, stop condition, add to top of queue, skip hash check, limits, first/last piece | Dialog → "Weitere Optionen" | 1 |
| Choose files before start (after metadata) | Dialog, second step with the file tree of the "Dateien" tab | 2 |

## Other areas

| qBittorrent | Place in Schwarm | Milestone |
|---|---|---|
| Search: start/stop, filter results (size, seeds), download, open description | Page "Suche": category, sources, min. seeds, max. size, sorting; "Laden" opens the add dialog with the plugin as downloader | 3 |
| Search plugins: install (URL or path), update, enable, uninstall | Settings → "Suche & RSS" | 3 |
| RSS: feeds and folders, articles, mark read, refresh, edit feed URL | Page "RSS" → "Feeds": three columns (phone: list), "Laden" opens the add dialog, "Regel daraus machen"; unread count in the navigation | 4 |
| RSS auto-downloader: rules, episode filter, smart filter, preview of matching articles, clone, import/export | Page "RSS" → "Auto-Downloader": live preview with reasons (matching ported from qBittorrent), qBittorrent's own count from `rss/matchingArticles` after saving | 4 |
| Create, edit, delete categories and tags, remove unused | Dialog "Kategorien und Tags" from the sidebar group buttons and the app menu | 2 |
| Global speed limits and alternative limits (turtle), schedule | Header: speed button with a menu ("Langsamer Modus"), "Limits bearbeiten …" dialog with the schedule | 2 |
| Connection status, external IP, DHT nodes, free disk space | Sidebar card; badge on the phone | 1 |
| Log (execution log, banned peers) | Settings → "Protokoll": messages (`log/main`, only what is new per poll) filtered by kind and text, newest first; tab "Gesperrte Peers" (`log/peers`) | 6 |
| Statistics | Page "Statistik": overall speed of the last minutes, all-time and session figures, disk cache and queue, tracker announces (`server_state` of `sync/maindata`), running time (`app/processInfo`) | 6 |
| Torrent creator | Dialog "Torrent erstellen" from the app menu and Settings → "System": source path, trackers with tiers, private, start seeding; piece size, format (libtorrent 2) or alignment (1.2), web seeds, comment, source, save path; task list with progress, download of the .torrent, delete (`torrentcreator/*`) | 6 |
| Cookies for downloads | Settings → "Cookies" (`app/cookies`, `app/setCookies`); without a date a cookie lasts the session | 6 |
| About, logout, shut down qBittorrent | Settings → "System" (versions from `app/version`, `app/webapiVersion`, `app/buildInfo`); app menu: "Über Schwarm", "Abmelden", "qBittorrent beenden …" with a confirmation, then a page that says qBittorrent has quit | 6 |

## Settings (249 fields in 8 tabs in qBittorrent)

| qBittorrent | Place in Schwarm | Milestone |
|---|---|---|
| Behaviour, downloads, connection, speed, BitTorrent, RSS, WebUI, advanced | Simple sections with plain texts for the common options: "Downloads" (folders, folder per category, incomplete folder, .torrent files), "Tempo" (limits, alternative limits, scheduler), "Seeding" (ratio/time limits, queue), "Verbindung", "Suche & RSS"; changes collect in a save bar and go out in one `app/setPreferences` | 5 |
| Every option | "Alle Optionen": searchable (German, English, key) list from `src/lib/preferences/fields.ts`, a table covering all 240 keys of `app/preferences` / `app/setPreferences` in 5.3.0 (checked against `dev/qbt-preference-keys.json`) | 5 |
| Network interface, listening port | Locked with a note when the interface looks like a VPN (`tun`, `wg`, …), "Trotzdem ändern" unlocks; interfaces and addresses from `app/networkInterfaceList` / `app/networkInterfaceAddressList` | 5 |
| WebUI API key: generate, rotate, delete (`app/rotateAPIKey`, `app/deleteAPIKey`) | Settings → "System" and "Alle Optionen": shown masked, copy, each change after a confirmation | 7 |
| Test email for the mail notification (`app/sendTestEmail`) | "Alle Optionen" at "E-Mail, wenn ein Download fertig ist"; only with saved mail settings | 7 |
| Schwarm's own: light/dark/system, language, list density, columns | Settings → "Oberfläche" (stored in the browser) | 1 |
