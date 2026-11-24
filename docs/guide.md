# Features

Every feature of qBittorrent's WebUI, the common ones first, the rare ones one level deeper. For
where each one lives compared with the stock WebUI, see the [feature map](features.md).


## Torrent list

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

## Details

- **Overview**: speed chart of the last minutes, key figures, pieces bar, all other details folded.
- **Files**: file tree with priorities (skip, normal, high, maximum) and a filter; rename one file
  or many at once with search and replace, regular expressions and numbering, with a preview;
  download finished files straight into the browser.
- **Peers**: client, country, flags, progress and speed; add, copy and ban peers.
- **Trackers**: status, tier, seeds and peers, messages; add, edit, remove, reannounce; DHT, PeX and
  LSD; HTTP sources (web seeds).

## Adding torrents

- **Magnet links, URLs and .torrent files**, several at once, or drop them anywhere on the page.
- **See what you add**: size and file list once qBittorrent has the metadata, and choose which
  files to load before the download starts; save a magnet link as a .torrent file.
- **Folders on the server as suggestions** in every path field, and the free space where it goes.
- **Category and folder** right away; tags, name, incomplete folder, management, content layout,
  stop condition, queue position, hash check skip and limits under "More options".

## Organising and speed

- **Categories and tags** in one dialog: create, set the folder, subcategories, delete, remove the
  unused ones.
- **Speed menu** in the header: slow mode (alternative limits) with one click, normal and slow
  limits, and a schedule for the slow mode.
- **Start all, stop all, pause everything** from the menu behind the app name.

## Everywhere

- **Phone layout** with list, full-screen details, long press for the actions and a bottom tab bar.
- **Light, dark or system**, German and English (follows the browser).
- **Login** only when qBittorrent asks for it (not on whitelisted networks).
- **As an app** on the phone or desktop: "Add to home screen" or "Install". Over HTTPS (e.g. behind
  a reverse proxy) it also starts when qBittorrent can't be reached.

## Search

- **Search through qBittorrent's search plugins**: one field, category, results sorted by seeds,
  filters for source, seeds and size, and "Download" opens the add dialog.
- **Choose the sources**: search all enabled plugins or only some of them; the choice is kept in
  the browser.
- **Plugins** in the settings: enable, update, add by URL, remove.

## RSS

- **Feeds and articles** in three columns: folders, unread counts, mark as read, refresh, rename,
  change the URL; "Download" opens the add dialog.
- **Auto-downloader** with a live preview: every recent article shows whether the rule takes it,
  and why not ("missing: desktop", "excluded: arm64"). Episode filter, each episode only once,
  category, folder, tags, pause afterwards; clone, import and export.
- **"Make a rule from it"** on any article suggests a rule from its title.

## Settings

- **The common options in plain words**: folders (also per category), speed limits in MB/s with the
  alternative limits and their schedule, seeding limits and queue, connection, RSS.
- **All 240 options** of qBittorrent in one searchable list, by German or English name or key.
- **API key** for programs such as Sonarr: generate, copy, replace or delete it; a test email for
  the mail notification.
- **Changes are collected** and saved together, or discarded.
- **VPN aware**: if qBittorrent runs behind a VPN interface (e.g. `tun0` in a VPN container), the
  network and port are locked so they are not changed by accident.

## Everything else

- **Statistics**: overall speed, all-time and session figures, disk and tracker queues.
- **Log** of qBittorrent, filtered by kind and text, and the blocked peers.
- **Create torrents** from files on the server, with trackers, web seeds and piece size; download
  the `.torrent` when it is done.
- **Cookies** for private trackers and feeds, **about** with all versions, **log out** and
  **quit qBittorrent**.

