# Schwarm – Docker mod for linuxserver/qbittorrent

[Schwarm](https://github.com/firsttris/schwarm) is a modern web UI for qBittorrent: a clear torrent
list, details with charts, search, RSS with a live preview of the auto-downloader, every setting
in plain words, light and dark, desktop and phone. German and English.

This image is a [Docker mod](https://github.com/linuxserver/docker-mods) for
[linuxserver/qbittorrent](https://docs.linuxserver.io/images/docker-qbittorrent/). It holds only
Schwarm's files: qBittorrent stays the image you already run, with your config, volumes and VPN.

## Use

Add one line to the container's environment:

```yaml
services:
  qbittorrent:
    image: lscr.io/linuxserver/qbittorrent:latest
    environment:
      - DOCKER_MODS=tristanteu/schwarm:latest
      # … PUID, PGID, TZ, WEBUI_PORT as before
```

Recreate the container. At start the mod puts Schwarm into `/schwarm` and sets qBittorrent's
alternative WebUI to it (`[WebUI] AlternativeUIEnabled=true`, `RootFolder=/schwarm` in
`/config/qBittorrent/qBittorrent.conf`). Open the WebUI as before and log in with qBittorrent's
user.

The same image is at `ghcr.io/firsttris/schwarm`. Several mods are joined with `|`, e.g.
`DOCKER_MODS=tristanteu/schwarm:latest|linuxserver/mods:universal-package-install`.

## Update

Schwarm is updated when the container is recreated (`:latest`), or pin a version, e.g.
`tristanteu/schwarm:0.1.1`.

## Options

| Variable | Default | |
|---|---|---|
| `SCHWARM_WEBUI` | `true` | `false`: only put the files into `/schwarm`, leave the WebUI setting as it is |

## Remove

Remove the `DOCKER_MODS` entry and recreate the container. qBittorrent finds no Schwarm in
`/schwarm` any more and turns the alternative WebUI off by itself: the first page load shows an
error, after a reload its own WebUI is back.

## Podman Quadlet

```ini
[Container]
Image=lscr.io/linuxserver/qbittorrent:latest
Environment=DOCKER_MODS=tristanteu/schwarm:latest
```

Source, issues and the release ZIP for other setups: https://github.com/firsttris/schwarm
