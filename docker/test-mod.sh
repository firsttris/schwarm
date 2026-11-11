#!/usr/bin/env bash
# Checks the Docker mod against the real linuxserver/qbittorrent: puts the mod's files on top of the
# image (what DOCKER_MODS does at start), starts it, and expects qBittorrent to serve Schwarm with
# the alternative WebUI set in its config. Usage: docker/test-mod.sh [mod image]
set -euo pipefail

MOD=${1:-schwarm:ci}
BASE=${BASE_IMAGE:-ghcr.io/linuxserver/qbittorrent:latest}
# qBittorrent rejects a Host header with another port than its own (validateHostHeader)
PORT=${PORT:-18080}
NAME=schwarm-mod-test

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

# the mod loader of linuxserver applies only the first layer of a mod (/docker-mods, get_blob_sha)
layers=$(docker image inspect --format '{{len .RootFS.Layers}}' "$MOD")
if [[ "$layers" != 1 ]]; then
  echo "FAIL: the mod has $layers layers, linuxserver applies only the first"
  exit 1
fi

# the default builder (docker driver) sees the locally loaded mod image
printf 'FROM %s\nCOPY --from=%s / /\n' "$BASE" "$MOD" |
  docker buildx build --builder default --load -q -t "$NAME" - >/dev/null

docker run -d --name "$NAME" -e WEBUI_PORT="$PORT" -p "$PORT:$PORT" "$NAME" >/dev/null

for _ in $(seq 60); do
  if [[ "$(curl -fs "http://localhost:$PORT/" || true)" == *"<title>Schwarm</title>"* ]]; then
    break
  fi
  sleep 1
done

fail() {
  echo "FAIL: $1"
  docker logs "$NAME" 2>&1 | tail -30
  exit 1
}

page=$(curl -fs "http://localhost:$PORT/" || true)
[[ "$page" == *"<title>Schwarm</title>"* ]] || fail "qBittorrent does not serve Schwarm"
status=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/api/v2/app/version")
[[ "$status" == 403 ]] || fail "api/v2/app/version answered $status without a login, expected 403"
conf=$(docker exec "$NAME" cat /config/qBittorrent/qBittorrent.conf)
grep -qx 'AlternativeUIEnabled=true' <<<"$conf" || fail "AlternativeUIEnabled=true missing"
grep -qx 'RootFolder=/schwarm' <<<"$conf" || fail "RootFolder=/schwarm missing"
# into a variable first: with pipefail, grep -q stopping early would fail docker logs (SIGPIPE)
logs=$(docker logs "$NAME" 2>&1)
grep -q '\*\*\*\* Schwarm v' <<<"$logs" || fail "the mod's init did not run"
echo "OK: $(docker exec "$NAME" cat /schwarm/version.txt) served by $(docker exec "$NAME" /app/qbittorrent-nox --version)"
