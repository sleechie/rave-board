# Rave Board

A colorful Bluetooth light-show player for Kilter Boards, with twelve animated effects and a crossfading tour.

Public website: https://raveboard.up.railway.app/

Personal repository: https://github.com/sleechie/kilter-trip

Three public pages: Home (`/`), About (`/about`), Rave (`/rave`). Built-in effects only; no accounts, database, uploads, marketplace, or playlist builder.

The browser sends Bluetooth commands directly to a chosen board. The server only serves the site. iPhone/iPad are preview-only for this release, including specialist browsers. Android Chrome connections are quietly enabled when the API is available; they remain experimental and aren't marketed on the landing page.

See [the technical guide](site/README.md) for protocol notes and verification limits. The original prototype remains at https://holy-vision-pfqx.here.now/; Railway is the public website.

Run software tests: `npm test`.

Run locally with Node 24+: `npm start`, then open `http://localhost:8080`. `PORT` is configurable. The static server exposes only the three pages and intentional assets. Repository docs, source archives, and dotfiles are not served.

Railway uses the root Dockerfile and `railway.json`, with `/healthz` for readiness. The project is **rave-board**, service **raveboard**, in the personal **sleechie's Projects** workspace (never AMA). GitHub source is `sleechie/kilter-trip`, branch `main`.

Software checks cover packet formatting and cancellation, mobile connection policy, and HTTP routing. The latest stop/switch changes still need a physical-board retest; mobile layout checks are not Bluetooth hardware validation.

Kilter Original now defaults to adapted patterns and traced hold shapes. Original patterns and the dot viewer remain selectable. Animation and pattern-version controls stay pinned on mobile. Climber is a 32-second climb, fall and ground-up burst, also included in Cycle effects. Homewall retains its original patterns and dots.
