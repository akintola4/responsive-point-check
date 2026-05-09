# Contributing to RPC

Thanks for considering a contribution. RPC is a small, vanilla-TS Chrome
MV3 extension — easy to read end-to-end in a single sitting, and easy
to extend without touching a framework.

## Quick start

```bash
git clone https://github.com/akintola4/responsive-point-check
cd responsive-point-check
pnpm install
pnpm dev          # auto-opens Chrome with the extension loaded
```

For a production-style build (no HMR), use:

```bash
pnpm build
# then chrome://extensions → Developer mode → Load unpacked → dist/chrome-mv3/
```

## Project layout

See [the README's Architecture section](./README.md#architecture) for the
full file map. Quick orientation:

- **`entrypoints/panel/`** — everything you see in the panel page (canvas,
  device frame, picker, settings, keyboard).
- **`entrypoints/background.ts`** — service worker. Strips XFO/CSP, opens
  the panel tab, relays screenshot requests.
- **`entrypoints/frame-bridge.content.ts`** — runs inside every iframe.
  Handles scroll sync, scrollbar hiding, and full-page screenshot
  scroll-to commands.
- **`lib/devices.ts`** — the device catalog. Adding devices is the
  highest-volume contribution and is documented in the README.
- **`lib/bezel-asset.ts`** — bezel SVG cache + per-kind padding +
  layout builder.

## Before you open a PR

1. **Type-check is clean.**
   ```bash
   pnpm compile
   ```

2. **The audit-fix tests pass.**
   ```bash
   pnpm build
   pnpm tsx scripts/test-fixes.ts
   ```
   This is a Playwright runner that asserts ~19 behaviors. CI runs the
   same script.

3. **Manual smoke test.** Load the unpacked build, click the action,
   navigate to a few sites:
   - A public site (e.g. `https://example.com`)
   - A site that sets `X-Frame-Options: DENY` (e.g. `https://x.com`) —
     verifies the dNR rule is firing
   - `http://localhost:3000` if you have a local server — verifies the
     URL auto-prefix and CSP stripping

   Then exercise: rotate (`R`), zoom (`Ctrl+wheel`), pan (hold Space +
   drag), full-page screenshot, and the picker with a custom device.

## Style and scope

- **No new dependencies** without a clear reason. The project ships under
  500 KB total — staying small is a feature.
- **No UI framework.** Use the existing `h()` helper. JSX/React/Preact
  are out of scope.
- **TypeScript strict** is non-negotiable. No `any`. No `// @ts-ignore`.
  If you need a cast, comment why.
- **No comments that just restate code.** Reserve comments for the
  *why* — invariants, hidden constraints, browser quirks.
- **No emojis** in code or commit messages unless you have a specific
  reason (e.g. matching an external convention).
- **Commit message format:** `<type>(<scope>): <subject>` — types are
  `feat`, `fix`, `chore`, `docs`, `test`, `refactor`. Scope is the
  affected area in lowercase (`devices`, `canvas`, `picker`, etc.).
  Examples in `git log`.

## Adding a device

The single most common contribution. Walk-through is in the README:
[Adding a new device](./README.md#adding-a-new-device).

Key gotchas:

- The SVG must be **pure vector**. SVG files that wrap a base64-encoded
  PNG won't render correctly when scaled. If your asset came from a
  Figma export, double-check the inner contents.
- Per-device `bezelLayout` coordinates are in the SVG's own viewBox
  space, not CSS pixels of the rendered device. Read the screen rect
  off the source artwork.
- For aspect-ratio mismatches between the artwork and the device
  viewport, the artwork stretches non-uniformly. Either pick a closer
  artwork or supply a per-device override.

## Reporting bugs / requesting features

Use the GitHub issues page. Two templates are pre-labelled:

- [**Report a bug**](https://github.com/akintola4/responsive-point-check/issues/new?labels=bug&title=%5Bbug%5D%20)
  — uses the `bug` label.
- [**Suggest an improvement**](https://github.com/akintola4/responsive-point-check/issues/new?labels=enhancement&title=%5Bfeature%5D%20)
  — uses the `enhancement` label.

For bugs, include: Chrome version, the URL you were previewing, the
device you had selected, and what you expected vs what happened.
Steps-to-reproduce beats logs.

## Code of conduct

By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Security issues

Please do **not** open a public issue for a security concern. See
[SECURITY.md](./SECURITY.md) for the responsible-disclosure process.

## License

Contributions are released under the [MIT License](./LICENSE) — same as
the project.
