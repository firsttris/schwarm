# FAQ

## Is there a modern web UI for qBittorrent?
Yes: Schwarm replaces the stock web UI as qBittorrent's *alternative WebUI*. It talks to the same
WebUI API, so nothing else needs to be installed.

## Does Schwarm work with qBittorrent in Docker?
Yes. With `linuxserver/qbittorrent` add `DOCKER_MODS=tristanteu/schwarm:latest` to the environment
([Install](install.md#docker-mod-for-linuxserverqbittorrent)). With other images put the unpacked
folder into the config volume (`/config/schwarm`) and set that path as the alternative WebUI.

## Which qBittorrent version do I need?
It is built against qBittorrent 5.3 (WebUI API 2.16). qBittorrent 5.0 and newer should work; 4.x
uses older API names for start and stop.

## Does it need its own server or login?
No. qBittorrent serves the files and does the login. Schwarm asks for a login only when qBittorrent
does (not on whitelisted networks).

## Does it work behind a VPN container such as gluetun?
Yes. If qBittorrent is bound to a VPN interface (e.g. `tun0`), Schwarm locks the network and port
settings so they are not changed by accident.

## How does it compare to the alternatives?

| | What it is | Where Schwarm differs |
|---|---|---|
| [qBittorrent WebUI](https://github.com/qbittorrent/qBittorrent) | the built-in web UI, mirrors the desktop app | fewer things on screen at once, phone layout, plain words |
| [VueTorrent](https://github.com/VueTorrent/VueTorrent) | popular alternative WebUI with many options | calmer, neutral look in the shadcn/ui style, desktop table with keyboard |

## Where do I report a bug?
In the [issues on GitHub](https://github.com/firsttris/schwarm/issues/new). Please name your
qBittorrent version, the browser and what you did.
