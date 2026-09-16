# Contributing

You can work on Rave Board without owning a climbing board. The preview uses the same animation frames as the Bluetooth sender, and the tests run without Bluetooth hardware.

## Start here

Use Node.js 24 or newer, then run `npm start` and open http://localhost:8080. There is no dependency install or environment-file setup. Run `npm test` before sending a pull request.

Keep changes focused. For a substantial new feature or a new board/controller family, open an issue first so the scope and evidence are clear. New effects can usually fit into the existing modules without a framework or extra service.

## Changes to animations

- Use real mapped hold positions, including the selected hold sets.
- For Kilter Original, account for the smaller screw-ons; they should have a useful part in the animation.
- Keep Original and Adapted versions selectable. Homewall Auxiliary sets must not be classified as Original screw-on footholds.
- Respect motion speed, brightness, pause and clear.
- Check readability on the traced-shape preview and a narrow mobile viewport.
- Add meaningful checks for new behavior, such as valid protocol output or a scene's visible movement. Avoid tests that just repeat a formula.

## Changes to Bluetooth

Read [the sender design](docs/architecture.md#sending-and-cancellation) first. Preserve serialized writes, complete packet boundaries, latest-selection behavior, clear commands and immediate disconnect. A faster resolved promise is not proof of faster visible lights.

Describe which properties and API versions your change supports, how unsupported devices fall back, and whether you tested it on real hardware. Use [the hardware test checklist](docs/validation.md#hardware-test-checklist) for field reports. Never test on a wall someone is climbing.

## Before a pull request

1. Run `npm test` and `git diff --check`.
2. Exercise the changed action in the browser, including mobile if it affects controls.
3. Include a screenshot or short browser recording for visual changes.
4. State the physical-board testing status plainly. No board available is fine; mark it as untested.
5. Preserve third-party licenses and provenance. Independently implement ideas from other apps unless their code has an appropriate reuse license.

Please leave credentials, account data, Bluetooth device serial numbers and unrelated personal information out of commits and public reports.

For a security vulnerability, use [private vulnerability reporting](https://github.com/sleechie/rave-board/security/advisories/new) instead of a public issue.
