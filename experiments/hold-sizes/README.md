# Disposable hold-size experiment

This is an alternative to Rave Board, not a replacement. It is contained entirely in `experiments/hold-sizes` on the **experiment/hold-sizes** branch. Do not merge it to `main` unless explicitly requested.

## Isolation

- Dedicated Railway service: **hold-size-lab**, in the personal **sleechie's Projects** workspace's rave-board project. Production **raveboard** remains connected to `main`.
- The experiment uses its own root directory, Dockerfile, server, domain, browser origin, assets and code. It makes no requests to the main Rave Board service.
- Baseline modules are frozen copies from `171728a2d1334a1532f67d36ae727fb952295518`; their hashes are recorded in `baseline-manifest.json`. The lab does not import live production modules.
- Board maps are a frozen subset containing only the six Original layouts. The screw-on/bolt-on classification is deliberately not applied to Homewall Auxiliary holds.
- No localStorage, cookies, service worker, database, uploads or saved preferences. Settings exist only in this tab's memory.
- The page is unlisted and sends `noindex, nofollow, noarchive` in HTML and HTTP. This is not access control: anyone with the link can open it.
- Connecting to a real board is explicit. Disconnect the main Rave page before connecting the experiment, because both can control the same physical board.

## What it compares

Both canvases display the exact same color frame. The left reproduces the existing equal-dot drawing; the right uses larger bolt-on rings and smaller screw-on rings. The foothold-size slider affects only drawing. The default 45% diameter is a visual estimate, not a physical measurement or brightness calibration. Bolt-on shapes vary too; this deliberately uses only two approximate classes.

The **Original / Adapted** choice changes the actual colors sent to the board:

- Gravity: original current lettering vs letters built on the bolt-on grid with foot twinkles outside the text.
- Rain: original pattern vs bolt-on-anchored heads/tails and quieter foot droplets.
- Spiral: original pattern vs the same bolt-on spiral with a quieter, shifted-color foot layer.

## Run

From this directory: `npm start` (Node 24+, no dependencies), then `http://localhost:8080`.
Tests: `npm test`.

Railway root directory: `/experiments/hold-sizes`; source: `sleechie/kilter-trip`, branch `experiment/hold-sizes`; Dockerfile: `Dockerfile`; healthcheck: `/healthz`. App sleeping is enabled. Service configuration is managed directly in Railway.

## Dispose

When requested, delete only the **hold-size-lab** Railway service and the **experiment/hold-sizes** branch/worktree. Do not delete the project or production service. The whole experiment is one folder and no production file changes are needed to remove it. No cleanup of databases or user records is required.

This is not a Bluetooth hardware simulator. The controls use the same frozen sender as the main app. Preview comparisons and software checks do not establish physical-board behavior.
