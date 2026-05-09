/**
 * Screenshots every device in the catalog using Playwright.
 *
 * Loads the built extension as an unpacked Chromium extension, opens the
 * panel page, and walks the catalog by writing to chrome.storage.local +
 * reloading. Each device's `.frame` element is screenshotted to
 * `screenshots/<device-id>.png`.
 *
 * Usage:
 *   1. Build the extension first:    pnpm build
 *   2. Run the screenshotter:        pnpm screenshot
 *
 * The screenshots can be reviewed visually for height-overshadow issues
 * (iframe extending past the bezel's screen rect), aspect distortion, or
 * misaligned chrome bars.
 */

import { chromium, type BrowserContext } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
import { DEVICES } from '../lib/devices';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const EXTENSION_PATH = resolve(ROOT, 'dist/chrome-mv3');
const OUTPUT_DIR = resolve(ROOT, 'screenshots');
const TARGET_URL = process.env.RPC_URL ?? 'https://go.dev';
const STATE_KEY = 'rpc.state.v2';

async function main() {
  if (!existsSync(EXTENSION_PATH)) {
    console.error(
      `Built extension not found at ${EXTENSION_PATH}. Run 'pnpm build' first.`
    );
    process.exit(1);
  }
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const context = await chromium.launchPersistentContext('', {
    headless: false, // MV3 service worker needs a real Chrome instance
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-default-browser-check',
    ],
    viewport: { width: 1600, height: 1000 },
  });

  const extensionId = await getExtensionId(context);
  console.log(`Extension loaded with id ${extensionId}`);

  const page = await context.newPage();
  await page.goto(
    `chrome-extension://${extensionId}/panel.html?url=${encodeURIComponent(TARGET_URL)}`
  );
  await page.waitForSelector('.canvas .frame', { timeout: 10_000 });
  // Initial paint settle
  await page.waitForTimeout(500);

  for (const device of DEVICES) {
    process.stdout.write(`  ${device.id.padEnd(24)} `);

    await page.evaluate(
      ({ key, deviceId, url }) => {
        return new Promise<void>(res => {
          chrome.storage.local.get(key, data => {
            const state = (data[key] as Record<string, unknown>) ?? {};
            state.activeDeviceId = deviceId;
            state.url = url;
            state.zoom = 'fit';
            chrome.storage.local.set({ [key]: state }, () => res());
          });
        });
      },
      { key: STATE_KEY, deviceId: device.id, url: TARGET_URL }
    );
    await page.reload();
    await page.waitForSelector('.canvas .frame', { timeout: 10_000 });
    // Wait for iframe + bezel SVG to settle.
    await page.waitForTimeout(1500);

    const frame = page.locator('.canvas .frame').first();
    const out = resolve(OUTPUT_DIR, `${device.id}.png`);
    await frame.screenshot({ path: out, omitBackground: false });
    console.log('✓');
  }

  console.log(`\nWrote ${DEVICES.length} screenshots to ${OUTPUT_DIR}`);
  await context.close();
}

async function getExtensionId(context: BrowserContext): Promise<string> {
  let workers = context.serviceWorkers();
  if (workers.length === 0) {
    const worker = await context.waitForEvent('serviceworker');
    workers = [worker];
  }
  const url = workers[0]!.url();
  const match = /^chrome-extension:\/\/([^/]+)\//.exec(url);
  if (!match) throw new Error(`Could not parse extension id from ${url}`);
  return match[1]!;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
