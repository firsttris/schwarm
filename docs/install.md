# Install

Schwarm is a folder of static files. qBittorrent serves it as its **alternative WebUI**; it talks to
the same WebUI API and uses qBittorrent's own login. In your browser it only remembers its display
settings (theme, language, columns).

Requires qBittorrent 5.0 or newer (built against 5.3, WebUI API 2.16).

## Docker mod for `linuxserver/qbittorrent`

One line in the container's environment: Schwarm is set up and updated with every start.

=== "Docker Compose"

    ```yaml
    services:
      qbittorrent:
        image: lscr.io/linuxserver/qbittorrent:latest
        environment:
          - DOCKER_MODS=tristanteu/schwarm:latest
          # … PUID, PGID, TZ, WEBUI_PORT as before
    ```

=== "Podman Quadlet"

    ```ini
    [Container]
    Image=lscr.io/linuxserver/qbittorrent:latest
    Environment=DOCKER_MODS=tristanteu/schwarm:latest
    ```

Recreate the container and open the web UI as before. At start the mod puts Schwarm into
`/schwarm` and sets qBittorrent's alternative WebUI to it (`[WebUI] AlternativeUIEnabled=true`,
`RootFolder=/schwarm` in `/config/qBittorrent/qBittorrent.conf`).

- The same image is at `ghcr.io/firsttris/schwarm`.
- Several mods are joined with `|`, e.g.
  `DOCKER_MODS=tristanteu/schwarm:latest|linuxserver/mods:universal-package-install`.
- **Update**: recreate the container (`:latest`), or pin a version, e.g. `tristanteu/schwarm:0.1.5`.

| Variable | Default | |
|---|---|---|
| `SCHWARM_WEBUI` | `true` | `false`: only put the files into `/schwarm`, leave the WebUI setting as it is |

**Remove**: take the `DOCKER_MODS` entry out and recreate the container. qBittorrent finds no
Schwarm any more and turns the alternative WebUI off by itself: the first page load shows an
error, after a reload its own WebUI is back.

## By hand

1. Download `schwarm-vX.Y.Z.zip` from the
   [latest release](https://github.com/firsttris/schwarm/releases/latest) and unpack it somewhere
   qBittorrent can read it. You get a folder `schwarm/` with `public/` inside.
2. In qBittorrent: **Options → Web UI → Use alternative WebUI**, and set the path to the `schwarm`
   folder (the one that contains `public/`).
3. Reload the web UI.

To go back, untick *Use alternative WebUI*.

## Other Docker images

For example `hotio/qbittorrent`: unpack into the config volume, e.g. `/config/schwarm`, and set the
alternative WebUI path to `/config/schwarm`.

```bash
cd /path/to/qbittorrent/config && curl -L -o schwarm.zip \
  "$(curl -s https://api.github.com/repos/firsttris/schwarm/releases/latest | grep -o 'https://[^"]*schwarm-v[^"]*\.zip')" \
  && unzip -o schwarm.zip && rm schwarm.zip
```

## As an app

On the phone or desktop: *Add to home screen* or *Install* in the browser. Over HTTPS (e.g. behind a
reverse proxy) it also starts when qBittorrent can't be reached.
