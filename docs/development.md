# Development

Requires [Bun](https://bun.sh) 1.4.

```bash
git clone https://github.com/firsttris/schwarm && cd schwarm
bun install
bun run dev   # Vite on http://localhost:5173 with a mock qBittorrent (dev/mock-server.ts)
```

`MOCK_AUTH=1 bun run dev` asks for a login (admin / adminadmin).

## Stack

React, TanStack Router (hash history), Query, Table and Virtual, Tailwind CSS 4 with shadcn/ui
components, Paraglide (German, English), uPlot, Vitest and Playwright.

The build output works from any folder and without a server-side fallback: hash routing, relative
asset paths, nothing loaded from other origins (fonts and icons are bundled). Details in the
[specification](spec.md).

## Checks

```bash
bun run typecheck && bun run lint && bun run test && bun run build && bun run e2e
```

`bun run screenshots` updates the pictures in `docs/screenshots/`.

## Documentation

This site is built from `docs/` with [Zensical](https://zensical.org) (`zensical.toml`) and
published to GitHub Pages on every push to `main` (`.github/workflows/docs.yml`).

```bash
pip install -r requirements-docs.txt
zensical serve   # http://localhost:8000
```

## Releases

A release is the *Bump version* action, which tags `vX.Y.Z`; the release workflow attaches
`schwarm-vX.Y.Z.zip` and publishes the Docker mod.

## Contributing

Issues and pull requests are welcome. Please run the checks above before opening a pull request.
