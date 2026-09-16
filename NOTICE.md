# Licenses, data and attribution

The root [MIT License](LICENSE) applies to original Rave Board code and documentation. It does not replace third-party licenses or grant rights to third-party artwork, names or trademarks. This applies to the original experiment code as well as the main application.

| Material | Source and terms |
| --- | --- |
| Board coordinates in `site/boards.json` and associated import/protocol references | Derived from [Grip Connect](https://github.com/Stevie-Ray/hangtime-grip-connect), revision `861a0640630ee7edd349833a822e0c6626633fd9`. Preserve the [BSD 2-Clause notice](site/THIRD-PARTY-LICENSE.txt). |
| Traced hold polygons in `site/holds/*.json` | Converted from [Boardsesh](https://github.com/boardsesh/boardsesh), revision `cd54e96b5e9483688525afd6d349c96ff9ff6266`, under its [Apache-2.0 license](site/BOARDSESH-LICENSE.txt). Conversion and provenance are documented in [HOLD-SHAPES-NOTICE.txt](site/HOLD-SHAPES-NOTICE.txt). |
| Underlying Kilter/Aurora hold artwork and trademarks | Retain their owners' rights. The upstream repository licenses do not establish a separate manufacturer permission grant for the underlying artwork. The app uses image-derived outlines, not factory CAD or measured light output. |
| `site/assets/gravity-lab.webp` | Third-party Gravity Lab color-reference artwork, not covered by the MIT grant. It is not used by the current lettering effect. See [the asset note](site/assets/SOURCES.md). Historical prototype commits also contain third-party logo references; those are not included in the MIT grant. |
| `docs/assets/preview.gif` | A browser-rendered Rave Board animation preview, using the traced hold data above. It is not footage of the physical board. |

The archived experiment branch carries frozen copies of the earlier protocol and animation modules. Preserve its baseline manifest and the accompanying third-party notices when reusing it.

The fewer-replies policy was independently implemented after examining the behavior of [Off The Wall](https://thurley.com/offthewall/). Its application code is not included in this repository and this project makes no claim to license it.

Rave Board is independent of Kilter, Aurora Climbing, Gravity Lab, Grip Connect, Boardsesh and Off The Wall. Compatibility references do not imply endorsement.
