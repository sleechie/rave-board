# Logo artwork

- Gravity Lab: https://www.gravitylabclimbing.com/ — the flask/climber emblem is sampled from its header artwork, https://images.squarespace-cdn.com/content/v1/62e8238561251c17a86ebafa/ca9ff96c-7e00-43be-b92f-71234ad9ace7/GravityLab_Flask-blue_small.png?format=1500w (the CDN delivered WebP). Original retained as `gravity-lab.webp`. The animation alternates its emblem with custom pixel lettering in blue, white, and yellow.
- Purgatory Resort: https://www.purgatory.ski/ — original SVGs from https://www.purgatory.ski/wp-content/uploads/sites/2/2022/04/logo-purgatory-minimal.svg and https://www.purgatory.ski/wp-content/uploads/sites/2/2022/04/logo-purgatory.svg.

Retrieved September 16, 2026. Logos belong to their respective owners. This independent light-show app is not affiliated with either organization.

`logo-masks.mjs` contains categorical pixel samples of these assets, not AI recreations. Gravity Lab is cropped to [32,36,405,412] in the original 960×480 asset and sampled at 64×64; Purgatory's minimal mark is sampled at 92×50. Each cell is sampled over a 4×4 area: 0 is background, 1 is primary blue/red, 2 is yellow, 3 is white. The dark Gravity Lab background is excluded. Source originals remain bundled for inspection.
