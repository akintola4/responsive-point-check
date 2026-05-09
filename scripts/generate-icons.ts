/**
 * Renders the master `public/icon.svg` to PNGs at the sizes Chrome
 * extension manifests expect (16, 32, 48, 128). Uses Playwright's
 * headless Chromium since we don't depend on rsvg-convert / ImageMagick.
 *
 * Usage:
 *   pnpm tsx scripts/generate-icons.ts
 *
 * Outputs to `public/icon/<size>.png`.
 */

import { chromium } from 'playwright';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), '..');
const SRC = resolve(ROOT, 'public/icon.svg');
const OUT_DIR = resolve(ROOT, 'public/icon');
const SIZES = [16, 32, 48, 128];

async function main() {
  if (!existsSync(SRC)) {
    console.error(`Master SVG not found: ${SRC}`);
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const svg = readFileSync(SRC, 'utf8');

  const browser = await chromium.launch({ headless: true });

  try {
    for (const size of SIZES) {
      const page = await browser.newPage({
        viewport: { width: size, height: size },
        deviceScaleFactor: 1,
      });
      // Strip body margin + scrollbar so the SVG fills the viewport.
      await page.setContent(
        `<!doctype html><html><head><style>
          html, body { margin: 0; padding: 0; background: transparent; }
          svg { display: block; width: ${size}px; height: ${size}px; }
        </style></head><body>${svg}</body></html>`,
        { waitUntil: 'networkidle' }
      );
      const out = resolve(OUT_DIR, `${size}.png`);
      await page.screenshot({
        path: out,
        omitBackground: true,
        clip: { x: 0, y: 0, width: size, height: size },
      });
      console.log(`  ${size.toString().padStart(3)}×${size}  →  ${out}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`\nWrote ${SIZES.length} icons to ${OUT_DIR}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
