# Disposable hold-size experiment

This is an alternative to Rave Board, not a replacement. It is contained entirely in `experiments/hold-sizes` on the **experiment/hold-sizes** branch. Do not merge it to `main` unless explicitly requested.

Live test page: https://raveboard-hold-lab.up.railway.app/
Railway service ID: `6a6447b5-0b82-4e9c-aaf3-5d19b67e8581`.

## Isolation

- Dedicated Railway service: **hold-size-lab**, in the personal **sleechie's Projects** workspace's rave-board project. Production **raveboard** remains connected to `main`.
- The experiment uses its own root directory, Dockerfile, server, domain, browser origin, assets and code. It makes no requests to the main Rave Board service.
- Baseline modules are frozen copies from `171728a2d1334a1532f67d36ae727fb952295518`; their hashes are recorded in `baseline-manifest.json`. The lab does not import live production modules.
- Board maps are a frozen subset containing only the six Original layouts. The screw-on/bolt-on classification is deliberately not applied to Homewall Auxiliary holds.
- No localStorage, cookies, service worker, database, uploads or saved preferences. Settings exist only in this tab's memory.
- The page is unlisted and sends `noindex, nofollow, noarchive` in HTML and HTTP. This is not access control: anyone with the link can open it.
- Connecting to a real board is explicit. Disconnect the main Rave page before connecting the experiment, because both can control the same physical board.

## What it compares

Three canvases compare the previews:

1. **Uniform dots** shows the selected Original or Adapted animation with the existing equal-dot drawing.
2. **Two-size rings** shows the same selected frame, using larger bolt-on rings and smaller screw-on rings. The foothold-size slider affects only this canvas; the default 45% diameter remains a visual estimate.
3. **Hold shapes** always shows the Adapted animation, using individual silhouettes traced from board artwork. These preserve each hold's relative size, orientation and installed location. The glow is approximate, not a measurement of the LED rim.

All three share the selected effect, speed, brightness, time, pause, restart, clear and installed hold sets. Test corners is displayed across all three. The Original / Adapted choice still controls the first two previews and actual Bluetooth output. During board playback the shaped preview uses the adapted frame from the same animation instant as the completed transmitted frame.

On mobile, the single animation dropdown moves into the fixed bottom controls so effects can be changed while watching any preview. It returns to the settings section on larger screens. No duplicate dropdown or separate selection state is used.

Shapes load only for the selected board, from this service. All 476 holds on the 12×12-with-kickboard have outlines. The 7×10, 8×12, 12×12 without kickboard and 16×12 layouts also have complete shape maps. The 12×14 source is missing 51 outlines; those use approximate rings and the caption reports that count. A failed shape download leaves the existing previews usable and displays a message in the third panel.

Geometry sources, pinned revisions, changes and limitations: `site/HOLD-SHAPES-NOTICE.txt`. The Apache-2.0 license accompanies the assets. The runtime uses only static data and cached Canvas paths, without third-party requests or the Boardsesh runtime. Regenerate the data with `node scripts/import-hold-shapes.mjs /path/to/boardsesh /path/to/grip-connect`.

The **Original / Adapted** choice changes the actual colors sent to the board:

Every one of the 12 production animations is available in both versions, plus the automatic cycle. **Original** calls the frozen production animation directly, including custom scrolling text. **Adapted** gives both hold sets a deliberate part in the pattern; it does not apply a blanket brightness reduction to screw-ons.

| Animation | Adapted use of the smaller screw-ons |
| --- | --- |
| Gravity Lab | Colored stitching and highlights around the main letters, plus twinkles |
| Scrolling text | Colored edges on tall letters, with an editable message |
| Make it rain | Independent bright droplets and connecting trails |
| Laser cathedral | Thin moving beams between the broader bolt-on beams |
| Hyperspace | More stars and fine, fast trails |
| Fireworks | Smaller sparks and trailing rings around the bursts |
| Rainbow vortex | A tighter spiral moving against the main spiral |
| Acid plasma | Bright filaments inside broad color fields |
| Kaleidoscope | Finer mirrored spokes and rings |
| Cosmic tunnel | Moving beads between the broad tunnel rings |
| Neon tide | Narrow ribbons among the wider curtains |
| Liquid dream | Contours moving through the larger color pools |

Cycle effects preserves the production sequence and timing, switching the whole sequence between Original and Adapted. Scrolling text is selected separately, as it is in production.

## Run

From this directory: `npm start` (Node 24+, no dependencies), then `http://localhost:8080`.
Tests: `npm test`.

Railway root directory: `/experiments/hold-sizes`; source: `sleechie/kilter-trip`, branch `experiment/hold-sizes`; Dockerfile: `Dockerfile`; healthcheck: `/healthz`. App sleeping is enabled. Service configuration is managed directly in Railway.

## Dispose

When requested, delete only the **hold-size-lab** Railway service and the **experiment/hold-sizes** branch/worktree. Do not delete the project or production service. The whole experiment is one folder and no production file changes are needed to remove it. No cleanup of databases or user records is required.

This is not a Bluetooth hardware simulator. The controls use the same frozen sender as the main app. Preview comparisons and software checks do not establish physical-board behavior.
