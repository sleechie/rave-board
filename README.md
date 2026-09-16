# Kilter Trip

A colorful Bluetooth light-show player for Kilter Boards, with thirteen animated effects and a crossfading tour.

Live app: https://holy-vision-pfqx.here.now/ (permanent here.now site).

Personal repository: https://github.com/sleechie/kilter-trip

See [the full guide](site/README.md) for laptop setup, compatibility, verification limits, and source attribution.

Run software tests: `npm test`.

Serve on the laptop that will connect: `python3 -m http.server 8080 --directory site --bind 127.0.0.1`, then open `http://localhost:8080` in Chrome/Edge.

Package the downloadable source: `python3 scripts/package.py`.
