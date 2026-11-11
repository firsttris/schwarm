# syntax=docker/dockerfile:1

# Schwarm as a Docker mod for linuxserver/qbittorrent (docker/README.md): the built files in
# /schwarm and an init script that sets them as the alternative WebUI. The mod is unpacked over
# the running image, so it holds nothing but these files (FROM scratch, linuxserver/docker-mods).

FROM --platform=$BUILDPLATFORM oven/bun:1.4.4 AS build
WORKDIR /src
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
# vite build and the build check (no QBT_TR(, relative paths), then the mod's tree in /out
RUN bun run build \
    && mkdir -p /out/schwarm \
    && cp -r docker/root/. /out/ \
    && cp -r dist/public /out/schwarm/public \
    && bun -e 'console.log(`v${require("./package.json").version}`)' > /out/schwarm/version.txt

FROM scratch
LABEL maintainer="firsttris" \
      org.opencontainers.image.title="Schwarm (Docker mod for linuxserver/qbittorrent)" \
      org.opencontainers.image.source="https://github.com/firsttris/schwarm" \
      org.opencontainers.image.licenses="AGPL-3.0-only"
# One COPY, one layer: the mod loader of linuxserver applies only the first layer of a mod
# (/docker-mods, get_blob_sha: .layers[0].digest)
COPY --from=build /out/ /
