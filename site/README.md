# Kilter Trip

A browser-based psychedelic light show for Kilter Original and Homewall LED boards. Six effects plus an automatic tour: rainbow vortex, acid plasma, kaleidoscope, cosmic tunnel, neon tide, liquid dream. Works through the existing Bluetooth controller; no firmware changes or extra hardware.

## At the gym (laptop recommended)

1. Open the hosted app in **Chrome or Edge on a Windows or Mac laptop**. Turn on Bluetooth. On Linux, Web Bluetooth availability depends on browser/platform configuration; Windows or Mac is the easier route.
2. Select **Kilter Original** and your actual size. The default is **12 x 12 with kickboard** with both bolt-ons and screw-ons selected. Wall angle does not change LED addresses. A 12 x 14 or 16 x 12 board needs its own size mapping.
3. Disconnect the official Kilter app and any other device controlling the wall. Use the lights with the gym's permission and nobody climbing.
4. Click **Connect board**, choose the nearby board, and allow Bluetooth. Connecting does not send any lights.
5. Click **Test corners**. Expect pink top left, cyan top right, yellow bottom left, green bottom right. If the pattern is wrong, Stop & clear, disconnect, and correct the size/hold sets.
6. Choose **The full trip** (all six effects crossfading) or **Rainbow vortex**, then **Play on board**. Motion 1x and brightness 85% are the defaults. Keep the tab visible, Bluetooth in range, and the laptop awake.
7. **Stop & clear lights** completes any frame in flight before sending the clear command. Then **Disconnect Bluetooth** and return to the Kilter app.

Android Chrome also supports the connection. On iPhone/iPad use [Bluefy](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055); Safari and ordinary Chrome on iOS cannot use Web Bluetooth. Bluefy support is based on its documented API, not a physical iPhone/board test.

## If it does not work

- No board in the chooser: get closer, turn on laptop Bluetooth, and release the connection in the Kilter app/other phones.
- Connected but dark: open Connection settings after disconnecting. Auto reads a trailing `@2` or `@3` in the board name and defaults to API 2 when absent. Try API 3 if the controller doesn't advertise a version. Unknown versions are refused.
- Wrong positions: select the exact layout, size, LED kit and installed hold sets. Hardware discovery cannot automatically identify your layout.
- Partial/glitchy frames: disconnect, change Bluetooth pacing to Gentle and try again. For faster capable controllers, Fast removes the added delay; every GATT write is still awaited.
- Slow animations: the controller receives a full board each frame, in 20-byte writes. The maximum target is 4 frames/sec, but the measured rate may be much lower. Turn Motion down for a slower evolving show. The connected preview displays the last completely transmitted frame.
- Switching tabs automatically attempts to stop and clear. Closing the browser or losing Bluetooth can leave the last image lit because no clear command can be guaranteed. Reconnect with the Kilter app and send a climb to replace it.

## Verification and limits

No physical Kilter Board was available during development. Software tests check exact reference packets for both Aurora API levels, every bundled map/effect through an independent receiving-side decoder, stop-during-write ordering, 20-byte chunking, write serialization, disconnection failures, and old browser write fallback. Browser checks validate the hosted controls and a simulated Bluetooth device; they do not establish real hardware compatibility. Bluetooth hardware, firmware, operating system and radio conditions determine actual results.

Older API 2 controllers have 2 bits per RGB channel; API 3 uses 3/3/2 bits. The preview quantizes colors accordingly. These are rolling color patterns, with no explicit strobe effect, but the low-color LED hardware still produces discrete color changes.

The site has no account system, board telemetry, microphone, or cloud control. The page sends light commands only to the Bluetooth device explicitly chosen by the user. Settings are saved in local browser storage. Google Fonts provides the typefaces; the site host receives ordinary website requests.

## Sources and prior work

Research found existing building blocks, but no verified ready-to-use full-wall psychedelic player for an unmodified gym controller:

- [Grip Connect](https://github.com/Stevie-Ray/hangtime-grip-connect) supplies the public board geometry tables and Aurora API 2/3 protocol reference. Source revision is recorded in `boards.json`. Its existing [Aurora demo](https://grip-connect-aurora.vercel.app/) sends images to a board. The derived coordinate dataset and protocol implementation retain its [license and attribution](THIRD-PARTY-LICENSE.txt).
- [Boardsesh light controls](https://github.com/boardsesh/boardsesh/blob/main/docs/ui/12-bluetooth.md) document disco colors on loaded hand holds and letter animations. That is a simpler existing alternative.
- [Kilterboard 12x12 Lightshow with WLED](https://www.youtube.com/watch?v=Wp1poSZMEEQ) is an existing video lead for WLED-based shows; this app does not require a WLED controller.
- [Bluefy's official listing](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055) documents its iOS Web Bluetooth support.

## Run or develop from source

Unzip the source download. No npm dependencies are required to run the site or tests.

```sh
cd kilter-trip
python3 -m http.server 8080 --directory site --bind 127.0.0.1
```

Open `http://localhost:8080` in Chrome/Edge on the **same laptop**. On Windows, `py -m http.server 8080 --directory site --bind 127.0.0.1` works if Python is installed. Web Bluetooth requires HTTPS or localhost; a plain HTTP LAN address will not work. The permanent hosted link is the easiest option.

```sh
npm test
```

Regenerate the bundled LED maps from a current Grip Connect checkout with `python3 scripts/import-boards.py /path/to/hangtime-grip-connect`. Only public geometry is extracted; no accounts, climbs or login data are bundled.
