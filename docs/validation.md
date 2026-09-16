# Validation and known limits

## What has been checked

| Area | Evidence | Limit |
| --- | --- | --- |
| Physical playback | User-reported animation playback and scrolling Gravity Lab text on a gym Kilter Original board | Not a complete controller/OS compatibility matrix |
| Bluetooth throughput | A gym session reported about 1.2 completed sends/sec for Laser cathedral | Lit-hold count and controller details were not captured; not a measured hardware ceiling |
| Sender behavior | Independent packet decoding and asynchronous tests for clear, cancellation, latest selection, response failures and disconnects | Test doubles verify software behavior, not radio or firmware performance |
| Layouts and patterns | All bundled layouts produce valid frames for API 2/3; adapted Original effects retain useful screw-on output after color quantization | Appearance and readability still depend on the installation |
| Traced geometry | Exact LED/position/set joins for the six Original layouts | Not measured CAD or calibrated light footprints; 12×14 has 51 fallback rings |
| Browser UI | Deployed desktop/mobile checks for previews, version/style switching, pinned controls and clear | Mobile viewport checks do not establish hardware Bluetooth support |

## Fewer-replies experiment

Introduced in `3c38119`. For the same dense 476-hold API 3 frame, software tests confirm **1,590 bytes in 80 writes** in both modes. On a controller supporting both write types, explicit reply requests change from **27 to 1**.

Those are code-level counts, not a measured speedup. As of the initial public release, the fewer-replies policy and physical Stop/switch response still need a comparison on the gym board. Conservative mode preserves the previous reply policy for that comparison.

## Hardware test checklist

Get permission and use an empty wall. Stop and disconnect other controlling apps first.

Record:

- Board family, size, installed hold sets and approximate controller age if known.
- Advertised API level and write capabilities; omit device serial numbers from public reports.
- OS/browser versions, app commit, effect, Original/Adapted version, brightness, motion speed and connection settings.
- Completed-send rate, visible behavior, Stop/clear response, disconnects or missed changes.

For a useful comparison, keep the image and settings constant and change one sender setting at a time. Compare sparse patterns with dense ones. Stop, disconnect, change the reply mode, reconnect, and repeat the baseline after the alternate mode.

Keep these results separate:

1. Time to resolve individual Bluetooth writes.
2. Time to finish sending a complete image.
3. Time and cadence at which the physical LEDs visibly change.

A video helps when it includes an unambiguous moving marker and is recorded in real time. Label time-lapses, edited footage and browser previews clearly.

## Current unknowns

The tested gym controller's exact firmware, negotiated transfer limits and maximum stable visible refresh rate have not been measured. No universal Kilter FPS ceiling is claimed. Older API 2 controllers may have additional power and throughput constraints.

Report results through the [hardware bug template](https://github.com/sleechie/rave-board/issues/new?template=bug-report.yml), including whether the behavior also occurs with Conservative replies and the dot preview.
