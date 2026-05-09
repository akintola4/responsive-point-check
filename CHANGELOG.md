# Changelog

All notable changes to RPC will land here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this
project adheres to [Semantic Versioning](https://semver.org/).

The latest downloadable build is always on the
[Releases page](https://github.com/akintola4/responsive-point-check/releases).

## [Unreleased]

Nothing yet.

## [0.1.1] — 2026-05-09

### Added

- **Logo + extension icons.** Brand mark is the "stacked viewports"
  shape (laptop ▷ tablet ▷ phone, nested). Master at `public/icon.svg`,
  PNGs at 16 / 32 / 48 / 128 in `public/icon/`, generated via
  `pnpm icons` (Playwright-based — no system rasterizer required).
  Wired into `manifest.icons`, `action.default_icon`, the panel
  `<link rel="icon">`, and the toolbar brand mark.

### Fixed

- Dropped the iframe `sandbox="allow-scripts allow-same-origin ..."`
  attribute. Chrome warned it was a no-op (a script inside the frame
  could rewrite the attribute), and our trust model is to render the
  user's chosen URL as a normal browsing context. Behaviorally
  unchanged, just clears the warning.

## [0.1.0] — 2026-05-09

First public release.

### Added

- **Device catalog (50+ viewports).** Apple Phones (iPhone SE through
  iPhone 17 Pro Max), Android Phones (Pixel 6–9 Pro, Galaxy S22–S24
  Ultra, OnePlus 11), Tablets (iPad mini / Air / Pro 11 / Pro 13,
  Galaxy Tab S9), Laptops + Monitors (MacBook Air 13/15 M4, MacBook
  Pro 13/14/16, Surface Laptop, iMac 24, Studio Display, Pro Display
  XDR, generic 1366/1440/1536/1920 desktops).
- **Bundled SVG bezels.** Per-device artwork with override layouts for
  iPhone 17 Pro, MacBook Air M4 Sky Blue, iPad family, iPhone 12 mini,
  iPhone 14 Plus, and more. Kind defaults handle everything else.
- **Pan + zoom canvas.** `translate3d() scale()` rendering. Ctrl+wheel
  zoom-to-cursor, hold Space (or toggle the rail) to pan. Pan clamped
  so the device can't fly fully offscreen.
- **Browser-chrome overlays.** iOS Safari bottom URL pill, Android
  Chrome stacked status bar, macOS Safari traffic-light header.
- **Three screenshot modes.**
  - Site only — crops just the iframe content.
  - With mockup — captures the full device frame including bezel.
  - Full-page scroll-and-stitch — drives the iframe via postMessage
    and stitches segments into one tall PNG.
- **Custom devices.** "My devices" tab with name + W × H form;
  validation enforces 120 ≤ dim ≤ 5120 in JS (HTML attrs are
  advisory).
- **Recents row.** Last 6 picks shown as chips above the picker tabs.
- **URL history datalist** on the URL bar — last 10 visited.
- **Breakpoint guides.** Toggle vertical lines at 640 / 768 / 1024 /
  1280 (color-coded) inside the frame; pan and zoom with the device;
  hidden when the viewport is narrower than the breakpoint.
- **Keyboard shortcuts.** `R` rotate · `[`/`]` cycle devices in
  category · `F` fit · `+`/`-` zoom · `D` open picker · `1-4` jump
  to category · `S` site shot · `Shift+S` mockup shot · `?` help.
- **`declarativeNetRequest` rule** strips `X-Frame-Options`, `CSP`,
  and `CSP-Report-Only` for sub-frames initiated by the panel only
  (scoped via `initiatorDomains: [extension ID]`). Normal browsing
  is untouched.
- **Settings panel.** Toggles for bezel, browser chrome, scrollbars,
  pan-lock, sync scroll, theme (auto / light / dark), canvas
  background (dots / grid / lines / plus / blueprint / gradient /
  solid), breakpoint guides.
- **Help dialog** with FAQ accordion + prefilled GitHub-issue links
  for bug reports and feature requests.
- **Frame-bridge content script** with origin filtering — only
  accepts messages from the panel's `chrome-extension://` origin.
- **Device screenshot script** (`pnpm screenshot`) — Playwright
  walks the catalog and writes one PNG per device for visual
  regression sweeps.
- **Audit-fix test runner** (`pnpm tsx scripts/test-fixes.ts`) —
  Playwright asserts 19 behaviors covering dNR, picker flows,
  keyboard shortcuts, pan clamp, breakpoint guides, custom-device
  validation, and the bridge protocol.

### Build

- WXT-based build to `dist/chrome-mv3/` (visible in macOS Finder
  Load-unpacked picker — no leading `.` to hide it).
- TypeScript strict (`exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, `noImplicitOverride`). No `any`.
- Total bundle ~470 KB including bezels and Geist font files.

[Unreleased]: https://github.com/akintola4/responsive-point-check/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/akintola4/responsive-point-check/releases/tag/v0.1.1
[0.1.0]: https://github.com/akintola4/responsive-point-check/releases/tag/v0.1.0
