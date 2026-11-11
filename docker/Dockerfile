# syntax=docker/dockerfile:1

# Schwarm as a Docker mod for linuxserver/qbittorrent (docker/README.md): the built files in
# /schwarm and an init script that sets them as the alternative WebUI. The mod is unpacked over
# the running image, so it holds nothing but these files (FROM scratch, linuxserver/docker-mods).

FROM --platform=$BUILDPLATFORM oven/bun:1.4.4 AS build
WORKDIR /src
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
# vite build and the build check (no QBT_TR(, relative paths)
RUN bun run build \
    && bun -e 'console.log(`v${require("./package.json").version}`)' > dist/version.txt

FROM scratch
LABEL maintainer="firsttris" \
      org.opencontainers.image.title="Schwarm (Docker mod for linuxserver/qbittorrent)" \
      org.opencontainers.image.source="https://github.com/firsttris/schwarm" \
      org.opencontainers.image.licenses="AGPL-3.0-only"
COPY docker/root/ /
COPY --from=build /src/dist/public/ /schwarm/public/
COPY --from=build /src/dist/version.txt /schwarm/version.txt
