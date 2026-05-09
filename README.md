# RPC — Responsive Point Check

> A Chrome extension for previewing any URL across realistic device viewports — without leaving the browser. Built in vanilla TypeScript on top of WXT, with bundled SVG bezels, a transform-based pan/zoom canvas, and full-page scroll-and-stitch screenshots.

The "RPC" lives on the toolbar. The whole thing is one panel page.

## Install — no Node required

Just want to use RPC, not build it?

1. Grab the latest zip from [**Releases**](https://github.com/akintola4/responsive-point-check/releases/latest) → download `responsive-point-check-<version>-chrome.zip`.
2. Unzip it anywhere on your machine.
3. Open `chrome://extensions`, toggle **Developer mode** (top-right), then click **Load unpacked** and pick the unzipped folder.
4. Pin the **RPC** icon from the puzzle menu so it's always one click away.

Open any tab → click **RPC** → the panel opens in a new tab pre-filled with that page's URL. That's it.

> Updates aren't automatic — when a new release lands, download the new zip and click **Update** on the extension card in `chrome://extensions`. The full version history lives in [CHANGELOG.md](./CHANGELOG.md).

## Supported browsers

| Browser           | Status     | Notes                                                         |
| ----------------- | ---------- | ------------------------------------------------------------- |
| **Chrome** 88+    | ✅ Tested  | Primary target. Everything described in the README works.     |
| **Edge** 88+      | ✅ Works   | Chromium-based, MV3 + `declarativeNetRequest` parity.         |
| **Brave** 1.34+   | ✅ Works   | Chromium-based. Brave Shields may extra-block some embeds.    |
| **Opera** 74+     | ✅ Works   | Chromium-based.                                               |
| **Arc**           | ✅ Works   | Chromium-based. Same Load-unpacked flow.                      |
| **Vivaldi** 4.4+  | ✅ Works   | Chromium-based.                                               |
| **Firefox**       | ⚠️ Untested | Firefox MV3 lacks full `declarativeNetRequest` parity. Header stripping likely won't fire — sites with `X-Frame-Options: DENY` won't load. WXT can target Firefox in theory; not yet wired here. |
| **Safari**        | ❌ Not supported | Safari Web Extensions use a different extension model + native Xcode wrapper.                                          |

If you've got it working on a browser not listed, [open an issue](https://github.com/akintola4/responsive-point-check/issues/new?labels=enhancement&title=%5Bcompat%5D%20) so we can add it to the table.

---

## What you get

- **One device at a time, properly framed.** Every viewport renders inside a real iPhone / iPad / MacBook Air / iMac SVG, not a CSS rectangle. Bezels are bundled (no external CDN, works offline).
- **Pan + zoom canvas.** Translate-and-scale rendering, zoom-to-cursor on Ctrl+wheel, hold Space (or toggle the rail) to pan. Pan stays clamped so the device can't fly offscreen.
- **Realistic browser chrome overlays.** iOS Safari's bottom URL pill, Android Chrome's stacked status bar, macOS Safari's traffic-light header — overlaid on the iframe so the screenshot looks like a real device.
- **Three screenshot modes.** Site only, with mockup, or **full-page scroll-and-stitch** that drives the iframe via postMessage and writes one tall PNG.
- **Custom devices.** Type a width × height, save it under "My devices". Recents row sticks the last six picks above the picker tabs.
- **Keyboard-first.** `R` rotate, `[`/`]` cycle devices in category, `F` fit, `+`/`-` zoom, `S` site shot, `Shift+S` mockup shot, `D` open picker, `1-4` jump to category, `?` help.
- **Breakpoint guides.** Toggle vertical guides at 640 / 768 / 1024 / 1280; they live inside the frame so they pan and zoom with the device, and skip themselves when the viewport is narrower than the breakpoint.
- **Auto-strips X-Frame-Options + CSP** for sub-frames initiated by the panel only — your normal browsing isn't touched.

## Setup (for development)

> Skip this section if you just want to install RPC — see [Install — no Node required](#install--no-node-required) above.

### 1. Install

```bash
pnpm install
```

The `postinstall` script extracts Geist + Geist Pixel font assets out of the `geist` npm package into `public/fonts/`. They're gitignored (regenerated on every install).

### 2. Build + load unpacked (everyday use)

```bash
pnpm build
```

Then in Chrome:

1. `chrome://extensions`
2. Toggle **Developer mode** (top-right)
3. **Load unpacked** → point at `dist/chrome-mv3/`

The build is fully self-contained — drag `dist/chrome-mv3/` straight into the Load unpacked dialog and you're done. No Node process needs to stay running while you use the extension.

### 2b. Hot-reload dev server (only when editing source)

```bash
pnpm dev
```

WXT prints the unpacked path and opens Chrome with the extension auto-loaded. The panel page is hot-reloaded on every save; the service worker reloads on a manifest change. Use this when you're actively editing — otherwise prefer the static build above.

### 3. Open the panel

Click the **RPC** action icon in the toolbar (pin it from the puzzle menu so it stays visible). The panel opens in a new tab pre-filled with the current page's URL.

You can also navigate directly to `chrome-extension://<EXT_ID>/panel.html?url=https://example.com` — useful for bookmarking specific previews.

### 4. (Optional) Run the test suite

```bash
pnpm build
pnpm tsx scripts/test-fixes.ts
```

Playwright launches a Chromium with the unpacked extension and walks through 19 assertions covering the dNR rule, picker flows, keyboard shortcuts, pan clamp, breakpoint guides, custom-device validation, and the bridge protocol. Exits non-zero on any failure.

### 5. (Optional) Screenshot every device

```bash
pnpm screenshot
# Or with a different URL:
RPC_URL=https://your-site.com pnpm screenshot
```

Walks the whole device catalog and writes one PNG per device into `screenshots/`. Useful for visual regression sweeps when you tweak bezel layouts.

## Architecture

```
entrypoints/
├── background.ts                 # Service worker: dNR header strip, action click, capture relay
├── frame-bridge.content.ts       # Injected into every iframe — scroll sync, scrollbar hide,
│                                 # full-page metrics + scroll-to commands
└── panel/
    ├── main.ts                   # Bootstrap, theme + canvas-bg + breakpoint guide application
    ├── canvas.ts                 # Pan + zoom (translate3d + scale), wheel/keyboard/pointer gestures
    ├── frame.ts                  # One device frame: bezel SVG inline, iframe positioning, chrome
    │                             # overlays, breakpoint guide rendering, bezel-hide collapse
    ├── browser-chrome.ts         # Fake iOS / Android / macOS browser chrome elements
    ├── toolbar.ts                # URL bar, history datalist, device + zoom labels, reload, theme
    ├── right-rail.ts             # Icon column on the right; site / mockup / full-page captures
    ├── device-picker.ts          # <dialog> with tabs + recents row + "My devices" custom form
    ├── settings.ts               # Toggles, canvas-bg picker, theme, breakpoint guides
    ├── help.ts                   # FAQ accordion
    ├── keyboard.ts               # Global keydown shortcut router
    ├── tooltip.ts                # Single shared tooltip driven by data-tooltip attrs
    ├── store.ts                  # Module-scope state + chrome.storage.local debounced persistence
    ├── h.ts                      # 30-line DOM helper (no JSX, no framework)
    └── style.css

lib/
├── devices.ts                    # Static device catalog + per-device bezel layout overrides
├── bezel-asset.ts                # Bezel SVG cache + per-kind padding ratios + layout builder
└── icons.ts                      # Inline SVG strings for the rail + chrome buttons

public/
├── bezels/                       # Per-device + per-kind SVG artwork (iPhone 17 Pro, iPad,
│                                 # MacBook Air M4 Sky Blue, iMac, Pro Display XDR, etc.)
└── fonts/                        # GENERATED by postinstall — Geist + Geist Mono

scripts/
├── extract-geist-assets.mjs      # Copies Geist woff2s out of the npm package
├── screenshot-devices.ts         # Playwright walks DEVICES, screenshots each .frame
└── test-fixes.ts                 # Playwright E2E asserts the audit fixes
```

## Adding a new device

1. Drop the SVG into `public/bezels/<id>.svg` (must be **pure vector** — embedded raster PNGs inside an SVG wrapper won't render correctly).
2. Add an entry to `DEVICES` in `lib/devices.ts`:

   ```ts
   {
     id: 'iphone-17-pro',
     name: 'iPhone 17 Pro',
     category: 'apple-phone',
     width: 402,
     height: 874,
     dpr: 3,
     bezel: 'phone-island',
     bezelSrc: 'bezels/iphone-17-pro.svg',
     bezelLayout: {
       outerWidth: 440,
       outerHeight: 908,
       screen: { x: 19, y: 19, width: 402, height: 874, radius: 56 },
     },
   }
   ```

   - **Without `bezelSrc`** → the device uses the `bezel` kind's default artwork at `public/bezels/<kind>.svg` and the kind's default padding from `BEZEL_PADDING` in `lib/bezel-asset.ts`.
   - **With `bezelSrc` + `bezelLayout`** → exact pixel positioning inside your custom artwork. Coordinates are in the SVG's own viewBox space.

3. Reload the panel — the picker rebuilds from `DEVICES` on every mount.

## Troubleshooting

### A site won't load in the iframe

Some sites enforce iframe blocking via JS (`if (window.top !== window) location.replace(...)`), not just headers. RPC strips X-Frame-Options + CSP `frame-ancestors`, but it can't undo client-side framebusting. Open the URL in a regular tab and screenshot from there as a workaround.

### Authenticated sites don't show the logged-in view

Cookies with `SameSite=Lax` flow through automatically — sign in to the site in a regular tab in this Chrome profile and reload the panel. Cookies with `SameSite=Strict` are blocked inside iframes by Chrome's cookie policy. There's no workaround within the extension.

### `pnpm dev` exits without opening Chrome

Some shells terminate WXT when launched via certain background mechanisms. Run it detached:

```bash
nohup pnpm dev > /tmp/wxt.log 2>&1 < /dev/null &
disown
```

Or run it in a regular terminal foreground.

### Full-page screenshot stops part-way

The bridge needs to drive `window.scrollTo` inside the iframe — sites that pin the URL to a router-managed scroll position (or use virtualization) may snap back. The capture downloads whatever was stitched up to that point.

### Bezel SVG has visible distortion at certain devices

The artwork's natural aspect ratio doesn't match the device viewport's aspect, so the SVG is being non-uniformly stretched. Either:

- Add a `bezelLayout` override with the exact `outerWidth × outerHeight` matching the artwork, OR
- Provide a per-device SVG via `bezelSrc` shaped for that viewport.

## Performance notes

- The panel HTML + JS + CSS is under 50 KB before fonts and bezels.
- Zoom updates run in a single `transform: translate3d() scale()` write per frame — no layout invalidation.
- Bezels are inlined SVG so `currentColor` inherits the theme without re-fetching artwork on theme switch.
- State writes to `chrome.storage.local` are debounced 300 ms — rapid switching coalesces into one write.
- The frame-bridge content script stays inert until the panel posts `rpc:init` — no per-frame cost on normal browsing.

## Tech

- **[WXT](https://wxt.dev)** — Vite-based MV3 framework (manifest generation + HMR + zip).
- **TypeScript strict** — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`. No `any`.
- **[Geist](https://vercel.com/font)** — single typeface across the whole UI; Geist Mono in `<input type="url">`.
- **[Playwright](https://playwright.dev)** — drives the device-screenshot + audit-fix test suites.
- **No UI framework.** Plain DOM via a 30-line `h()` helper.

## License

MIT.
