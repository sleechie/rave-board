# Rave Board

A browser-based psychedelic light show for Kilter Original and Homewall LED boards. Thirteen effects plus an automatic tour: green Matrix-style rain, Gravity Lab, laser cathedral, hyperspace, fireworks, a custom scrolling message, rainbow vortex, acid plasma, kaleidoscope, cosmic tunnel, neon tide, liquid dream, and a green stick-figure climber with a fall and ground-up explosion. Works through the existing Bluetooth controller; no firmware changes or extra hardware.

## At the gym (laptop recommended)

1. Open the hosted app in **Chrome or Edge on a Windows or Mac laptop**. Turn on Bluetooth. On Linux, Web Bluetooth availability depends on browser/platform configuration; Windows or Mac is the easier route.
2. Select **Kilter Original** and your actual size. The default is **12 x 12 with kickboard** with both bolt-ons and screw-ons selected. Wall angle does not change LED addresses. A 12 x 14 or 16 x 12 board needs its own size mapping.
3. Disconnect the official Kilter app and any other device controlling the wall. Use the lights with the gym's permission and nobody climbing.
4. Click **Connect board**, choose the nearby board, and allow Bluetooth. Connecting does not send any lights.
5. Click **Test corners**. Expect pink top left, cyan top right, yellow bottom left, green bottom right. If the pattern is wrong, Stop & clear, disconnect, and correct the size/hold sets.
6. Choose **Cycle effects** or an individual effect, then **Play on board**. One **0.1×–32× speed slider** controls every animation, including the Gravity Lab sequence. Speed 1× and brightness 85% are the defaults. Click an effect to start its on-screen preview. Keep the tab visible, Bluetooth in range, and the laptop awake.
7. **Stop & clear lights** discards the unfinished frame after its current short packet and sends a clear command. It shows how long sending took. **Disconnect now** immediately releases Bluetooth, including during a stalled write; it does not guarantee the lights are cleared. Stop & clear first when possible, then disconnect and return to the Kilter app.

Android Chrome board connections are quietly enabled when Web Bluetooth is available, but remain experimental. iPhone and iPad are preview-only in this public release, including specialist browsers. The Rave page explains that policy and does not offer a board connection on iOS.

## Patterns and hold shapes

Kilter Original defaults to **Adapted**, which gives bolt-ons and smaller screw-ons distinct roles. Switch to **Original** to compare the existing designs, including on the hold-shape viewer. The preview style selector switches between traced hold shapes and dots; it changes only the drawing, not the board output. Homewall keeps its original patterns and dots. The animation dropdown and version toggle stay pinned on mobile.

Original hold shapes come from Boardsesh artwork traces, with complete coverage for the default 476-hold board. The 12×14 source lacks 51 outlines, explicitly shown as approximate rings. Glow remains an estimate. Shape-source attribution and Apache-2.0 licensing are bundled in `HOLD-SHAPES-NOTICE.txt` and `BOARDSESH-LICENSE.txt`.

## New effects and speed

- **Climber:** a green stick figure climbs for 18 seconds, hangs for 2, falls for 2, then sets off a rising burst and fading embers. The 32-second scene follows the speed slider and is included in Cycle effects.
- **Make it rain:** staggered falling green heads and fading tails.
- **Gravity Lab:** large, thick GRAVITY LAB letters scroll for 20 seconds at 1x, followed by a 12-second two-line display with GRAVITY scrolling on top and a large LAB fixed below. The blue/white/yellow faces have darker edges and an offset shadow. A few twinkles stay outside the text. Both handholds and selected screw-ons contribute to the lettering. The global speed slider scales the whole sequence.
- **Laser cathedral / Hyperspace / Send fireworks:** moving neon beams, outward streaks, and colored bursts.
- **Scrolling text:** enter up to 40 letters/numbers or basic punctuation for your own scrolling sign.

The **0.1×–32×** slider controls visual motion, independently of Bluetooth throughput. Logo lettering may be difficult to read at high speeds; the same slider lets you slow it down. The original colorful effects remain available. The Gravity Lab palette is based on the gym's blue, white, and yellow branding.

## Quick Controls update (003)

- Stop takes over after the current complete packet of at most 60 bytes, rather than a complete wall image. An empty ONLY packet clears the receiver; an effect change begins a new FIRST/ONLY packet. We never cut a packet in half.
- Rapid effect, brightness, speed, and text edits supersede obsolete work; only the latest selection continues. A sleeping animation loop wakes for the change.
- On API 3 controllers exposing both modern write methods, the default **Fewer replies** mode acknowledges the final chunk of each complete image instead of every short packet. Clears still request a reply, and cancellation still finishes at a short packet boundary. A reply confirms a GATT write, not visible LED output. API 2, write-only, and legacy clients retain the previous behavior; no-response-only devices continue with no-response writes.
- A stalled packet fails after a 1.5-second sending budget instead of allowing a five-second wait for each individual write. Disconnect now bypasses the clear queue and closes the connection immediately. A dropped connection can leave the last image lit.
- The preview goes dark on Stop and avoids repeatedly drawing an unchanged transmitted frame, leaving more browser time for input.
- Change/clear timings in the status line measure sending from the laptop, not physical LED latency. Smaller packets add about 9% framing overhead on a dense 476-hold frame.

## If it does not work

- No board in the chooser: get closer, turn on laptop Bluetooth, and release the connection in the Kilter app/other phones.
- Connected but dark: open Connection settings after disconnecting. Auto reads a trailing `@2` or `@3` in the board name and defaults to API 2 when absent. Try API 3 if the controller doesn't advertise a version. Unknown versions are refused.
- Wrong positions: select the exact layout, size, LED kit and installed hold sets. Hardware discovery cannot automatically identify your layout.
- Partial/glitchy frames: disconnect and try **Connection settings → Bluetooth replies → Conservative (previous sender)**. Bluetooth pacing can also be changed to Gentle; every GATT write is still awaited.
- Slow animations: the controller receives a full board each frame, in 20-byte writes. The default target is 30 frames/sec, but the measured rate may be much lower. Turn Speed down for a slower evolving show. The connected preview displays the last completely transmitted frame.
- Switching tabs automatically attempts to stop and clear. Closing the browser or losing Bluetooth can leave the last image lit because no clear command can be guaranteed. Reconnect with the Kilter app and send a climb to replace it.

## Verification and limits

Animation playback and scrolling Gravity Lab text have been reported working on a physical Kilter Original board. Stop and effect changes were reported sluggish; the Quick Controls update addresses those paths but still needs a physical board retest. Existing lightweight software checks cover reference packets, all bundled maps/effects, packet-boundary cancellation, latest-selection behavior, acknowledgement placement, and disconnect handling. No separate simulator is required or added. Bluetooth hardware, firmware, operating system and radio conditions determine actual response time.

Older API 2 controllers have 2 bits per RGB channel; API 3 uses 3/3/2 bits. The preview quantizes colors accordingly. These are rolling color patterns, with no explicit strobe effect, but the low-color LED hardware still produces discrete color changes.

The site has no account system, board telemetry, microphone, or cloud control. The page sends light commands only to the Bluetooth device explicitly chosen by the user. Settings are saved in local browser storage. The site host receives ordinary website requests; assets and fonts require no third-party requests.

## Sources and prior work

Research found existing building blocks, but no verified ready-to-use full-wall psychedelic player for an unmodified gym controller:

- [Grip Connect](https://github.com/Stevie-Ray/hangtime-grip-connect) supplies the public board geometry tables and Aurora API 2/3 protocol reference. Source revision is recorded in `boards.json`. Its existing [Aurora demo](https://grip-connect-aurora.vercel.app/) sends images to a board. The derived coordinate dataset and protocol implementation retain its [license and attribution](THIRD-PARTY-LICENSE.txt).
- [Boardsesh light controls](https://github.com/boardsesh/boardsesh/blob/main/docs/ui/12-bluetooth.md) document disco colors on loaded hand holds and letter animations. That is a simpler existing alternative.
- [Kilterboard 12x12 Lightshow with WLED](https://www.youtube.com/watch?v=Wp1poSZMEEQ) is an existing video lead for WLED-based shows; this app does not require a WLED controller.
- [Bluefy's official listing](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055) documents its iOS Web Bluetooth support.

## Run or develop from source

Use the personal GitHub repository with Node 24 or later. No npm dependencies are required to run the site or tests.

```sh
cd kilter-trip
npm start
```

Open `http://localhost:8080` in Chrome/Edge on the same computer. Web Bluetooth requires HTTPS or localhost. Production is https://raveboard.up.railway.app/ and uses the Dockerfile on Railway. The original here.now prototype is a separate earlier deployment.

```sh
npm test
```

Regenerate the bundled LED maps from a current Grip Connect checkout with `python3 scripts/import-boards.py /path/to/hangtime-grip-connect`. Only public geometry is extracted; no accounts, climbs or login data are bundled.

## Fewer replies trial

The default sender now requests one acknowledgement per complete image on compatible API 3 controllers. It keeps the existing 55-byte packet-body limit and 20-byte BLE chunks, so only the reply policy changes. This is an independent implementation informed by comparing Off The Wall’s public sender; no third-party implementation is copied. An interrupted packet requests a reply at its ending if the interruption is already known; a subsequent clear always requests one when supported. The sender still serializes writes and waits for the final response before starting another image.

For the same dense 476-hold API 3 image, software checks confirm identical 1,590 bytes in 80 writes, with explicit reply requests reduced from 27 to 1. This is a write-policy count, not measured hardware throughput. Fewer intermediate replies may allow more buffering below the browser, so physical Stop latency must be checked along with frame rate.

At the gym, compare **Fewer replies** with **Conservative (previous sender)** using the same effect, version, brightness, motion speed and pacing. Stop, disconnect, change the reply setting, and reconnect between trials. Compare the reported sending rate and visible motion, then check Stop & clear and effect switching. The existing sender remains available if the new policy gives no improvement or worsens control response. The isolated hold-size lab retains its frozen sender.
