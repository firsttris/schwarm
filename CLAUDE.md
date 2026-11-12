# Notes for Claude

Schwarm is a web UI for qBittorrent, served by qBittorrent itself as its "alternative WebUI".
Static single-page app, no backend of its own.

## Documentation

Read before starting:

- [`docs/spec.md`](docs/spec.md): what to build, constraints from qBittorrent, stack, design rules,
  milestones.
- [`docs/features.md`](docs/features.md): every qBittorrent feature and its place in Schwarm.
- [`docs/mockup/`](docs/mockup/): the screens of the design mockup (the look to follow).

## Reference implementations

Base details on the sources, not on memory. Clone them shallowly (`git clone --depth 1`) into the
scratchpad and name the source file in comments and commit messages where it settles a detail:

- **qBittorrent** (`qbittorrent/qBittorrent`, tag `release-5.3.0`): the API
  (`src/webui/api/*controller.cpp`, `src/webui/api/serialize/`), what the stock WebUI offers
  (`src/webui/www/private/`), how files are served (`src/webui/webapplication.cpp`).
- **shadcn/ui** (`shadcn-ui/ui`): components, the `neutral` theme tokens for Tailwind 4, the
  sidebar, data table and forms examples (`apps/v4`).
- **Stack conventions**: `firsttris/workflows` → `tech-stack.md`, templates in `templates/`.

## With every change

Update what the change affects, in the same pull request, and only that:

- the tests for what changed (Vitest next to the code for logic, Playwright in `e2e/` for what a user
  does, desktop and `@phone`, against the mock qBittorrent API);
- `docs/features.md` when a feature lands or moves;
- both READMEs (`README.md` English, `README.de.md` German) when a feature a user sees is added,
  changed or removed;
- the screenshots after a change to the look, then look at the new pictures.

## Checks

Green before every push, then check CI:

```sh
bun run typecheck && bun run lint && bun run test && bun run build
bun run e2e
```

## Pull requests

- One milestone or feature per pull request; it carries only its own commits.
- Before every push check whether the branch's pull request is still open. If it is merged, start
  again from the current `origin/main` and open a **new** pull request.
- Merge method: squash.

## Working rules

- The build output must work from any folder and without a server-side fallback: hash routing,
  relative asset paths, no `QBT_TR(` anywhere (see `docs/spec.md`).
- Load nothing from other origins at runtime (fonts and icons are bundled).
- Texts in German and English through Paraglide; German is the main language, plain words instead of
  qBittorrent jargon.

## Project notes

- Layout: `src/api/` (typed client, Zod schemas, maindata merge, queries), `src/lib/` (filters,
  formatting, file tree, rename, limits, stores), `src/components/ui/` (shadcn components),
  `src/routes/` (file-based, hash history), `dev/` (mock qBittorrent: `mock-api.ts`, sample data
  from the mockup in `fixtures.ts`).
- New shadcn components: `bunx --bun shadcn@latest add <name>`. The CLI adds the npm package `cn`
  and imports `{ cn } from "cn"`: remove that package and import from `@/lib/utils`. Local changes
  to the components, to keep when updating one: texts through Paraglide (dialog, sheet, sidebar,
  breadcrumb), a dash for an indeterminate checkbox, the icon gap of `ContextMenuSubTrigger`.
- Code splitting: what the first screen (the torrent list) does not need is loaded on first use
  with `lazyNamed` and `<WhenUsed>` from `src/lib/lazy.tsx` (details, dialogs); routes are split by
  the router plugin; React, TanStack, Radix and the other libraries get their own chunks
  (`vite.config.ts`). Zod is used as `zod/mini`.
- `bun run dev` starts Vite and the mock API; E2E tests build and serve `dist/public` from the mock
  like qBittorrent does (no SPA fallback). `MOCK_AUTH=1` asks for a login (admin / adminadmin).
- qBittorrent's settings: `src/lib/preferences/fields.ts` is one table of every key of
  `app/preferences` (type, section, label, unit, options); its test compares it with
  `dev/qbt-preference-keys.json` (taken from `appcontroller.cpp`). A new qBittorrent version: update
  that list, then the table and the mock's `dev/preferences-fixture.ts`.
- Docker mod (`docker/`, `docker/README.md` is the Docker Hub page): `FROM scratch` with Schwarm in
  `/schwarm` and an s6 init script for `linuxserver/qbittorrent`; `docker/test-mod.sh` starts it on
  the real image (CI job `docker-mod`). In this sandbox the build needs the proxy CA; CI does not.
- PWA: `public/manifest.json`, icons rendered from `public/icons/*.svg` by `bun run icons` (PNGs are
  committed), `sw.js` emitted at build by `scripts/vite-sw.ts` from `sw/service-worker.js`. It
  registers only in a secure context (HTTPS, localhost), so the E2E tests run with it.
- Paraglide loads its message-format plugin from `node_modules` (`project.inlang/settings.json`),
  not from a CDN, so builds need no network. Messages with numbers use plural variants.
- Versions kept back on purpose: `@tanstack/react-table` 8 (9 changed the API and is three months
  old), `@inlang/paraglide-js` 2, `@playwright/test` pinned to the version of the Playwright image
  and browser at hand.
