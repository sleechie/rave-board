# Development

## Local workflow

Use Node.js 24 or newer. Run `npm start`, then open http://localhost:8080. There is no transpilation or bundle step; edit the modules in `site/` and reload. The browser caches assets briefly, so disable cache in DevTools while iterating.

Run `npm test` and `git diff --check`. The server test starts its own temporary server on an available port and stops it afterward. It does not use a physical board.

## Public files

The server serves `/`, `/about`, `/rave`, `/healthz` and allowed static assets under `site/`. It excludes Markdown, dotfiles and source archives. Keep private notes and local credentials outside the public assets directory.

## Updating board data

The app bundles the data it needs and makes no runtime requests to third-party board services.

- LED maps: `python3 scripts/import-boards.py /path/to/hangtime-grip-connect`.
- Original hold outlines: `node scripts/import-hold-shapes.mjs /path/to/boardsesh /path/to/hangtime-grip-connect`.

The shape importer uses pinned revisions. Review provenance, licensing and the generated LED joins when changing those revisions; preserve all notices. Do not apply Original screw-on classification to Homewall Auxiliary sets.

## Deployment

The production site is hosted on Railway. The repository contains a Dockerfile and `railway.json`; the readiness endpoint is `/healthz`.

For your own Railway service, connect your fork's `main` branch, use the repository root, and expose the service's `PORT` (8080 by default). No application secrets or database are required. Use HTTPS for browser Bluetooth access.

With Docker:

```sh
docker build -t rave-board .
docker run --rm -p 8080:8080 rave-board
```

The server also works on another Node/Docker host. It does not relay Bluetooth to a remote board; the person using the site must be near the physical board with a supported browser.

## Source archive

GitHub's source ZIP is sufficient. `python3 scripts/package.py` creates `dist/rave-board-source.zip` from the last committed revision for an offline copy. Uncommitted local files are not included.

## Disposable comparison lab

The `experiment/hold-sizes` branch contains a separate app under `experiments/hold-sizes`, with its own Railway service and browser origin. Its sender and baseline effects are frozen from an earlier revision. The branch is kept for comparisons and is not automatically merged into production.

Do not change its frozen baseline files when modifying the main app. The lab is not a substitute for hardware validation.
