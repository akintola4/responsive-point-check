/**
 * End-to-end test runner for the audit fixes.
 *
 * Loads the built extension into Playwright Chromium, walks through one
 * focused assertion per fix, prints PASS / FAIL with a short reason.
 *
 * Usage:
 *   pnpm build               # produce .output/chrome-mv3
 *   pnpm tsx scripts/test-fixes.ts
 *
 * Each test is independent — a failure in one doesn't block the rest.
 * The script exits non-zero if ANY test fails.
 */

import { chromium, type BrowserContext, type Page } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const EXTENSION_PATH = resolve(ROOT, '.output/chrome-mv3');
const STATE_KEY = 'rpc.state.v2';

interface TestResult {
  name: string;
  pass: boolean;
  detail: string;
}

const results: TestResult[] = [];

function record(name: string, pass: boolean, detail = '') {
  results.push({ name, pass, detail });
  const tag = pass ? '\x1b[32m✓ PASS\x1b[0m' : '\x1b[31m✗ FAIL\x1b[0m';
  console.log(`  ${tag}  ${name.padEnd(56)} ${detail}`);
}

async function main() {
  if (!existsSync(EXTENSION_PATH)) {
    console.error(`Built extension not found at ${EXTENSION_PATH}.`);
    console.error(`Run 'pnpm build' first.`);
    process.exit(1);
  }

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-default-browser-check',
    ],
    viewport: { width: 1600, height: 1000 },
  });

  const extensionId = await getExtensionId(context);
  console.log(`\nExtension id: ${extensionId}\n`);

  // Each test gets a fresh panel page so state from the previous test
  // doesn't bleed across.
  const open = (path = '') =>
    openPanel(context, extensionId, path);

  console.log('═══ Pure-function tests ═══\n');

  await testNormalizeUrl(await open());
  await testCustomDeviceValidation(await open());

  console.log('\n═══ Behavioural tests ═══\n');

  await testDnrXFOStripping(context, extensionId);
  await testBezelHideCollapsesPadding(await open());
  await testBreakpointGuidesInsideFrame(await open());
  await testRecentsAppearOnPick(await open());
  await testUrlHistoryDatalist(await open());
  await testKeyboardRotateAndFit(await open());
  await testKeyboardCycleDevice(await open());
  await testWheelZoomIgnoresShiftKey(await open());
  await testPanClampKeepsDeviceVisible(await open());
  await testFullPageScreenshotMath(await open());
  await testTooltipRequiresInstall(await open());
  await testHelpHidesPlaceholderRepo(await open());

  await context.close();

  // Summary.
  const passed = results.filter(r => r.pass).length;
  const failed = results.length - passed;
  console.log(
    `\n────────────────────────────────────────────\n` +
    `${passed} passed · ${failed} failed · ${results.length} total\n`
  );
  if (failed > 0) process.exit(1);
}

/* ============================================================================
   Helpers
   ============================================================================ */

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

async function openPanel(
  context: BrowserContext,
  extensionId: string,
  search = ''
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/panel.html${search}`);
  await page.waitForSelector('.canvas .frame', { timeout: 10_000 });
  return page;
}

async function clearState(page: Page): Promise<void> {
  await page.evaluate(key => {
    return new Promise<void>(res => {
      chrome.storage.local.remove(key, () => res());
    });
  }, STATE_KEY);
}

/* ============================================================================
   Tests
   ============================================================================ */

/** Fix #34 — localhost / loopback / LAN IPs default to http://, everything
 *  else https://. */
async function testNormalizeUrl(page: Page) {
  // The function isn't exported, but it's called by the toolbar's Go button
  // and the keydown=Enter handler. We exercise it through the URL input.
  const cases: Array<[string, string]> = [
    ['example.com', 'https://example.com/'],
    ['localhost:3000', 'http://localhost:3000/'],
    ['127.0.0.1:8080', 'http://127.0.0.1:8080/'],
    ['192.168.1.5', 'http://192.168.1.5/'],
    ['10.0.0.1', 'http://10.0.0.1/'],
    ['my-box.local', 'http://my-box.local/'],
    ['https://already.com', 'https://already.com/'],
  ];

  let allPass = true;
  for (const [input, expected] of cases) {
    await page.fill('.tb__url', input);
    await page.press('.tb__url', 'Enter');
    await page.waitForTimeout(120);
    const iframeSrc = await page.evaluate(() => {
      const f = document.querySelector('.canvas iframe') as HTMLIFrameElement | null;
      return f?.src ?? '';
    });
    if (iframeSrc !== expected) {
      record(
        `#34 normalizeUrl(${input})`,
        false,
        `expected ${expected}, got ${iframeSrc}`
      );
      allPass = false;
    }
  }
  if (allPass) record('#34 normalizeUrl — 7 cases', true, '');
  await page.close();
}

/** Fix #29 — custom device w/h must be 120-5120; out-of-range silently ignored. */
async function testCustomDeviceValidation(page: Page) {
  await clearState(page);
  await page.reload();
  await page.waitForSelector('.canvas .frame');
  // Open picker → My devices.
  await page.click('.rail__btn[data-tooltip="Devices"]');
  await page.waitForSelector('.dp__tabs');
  await page.click('.dp__tab[data-cat="custom"]');
  await page.waitForSelector('.dp__cd-form');

  // Try an out-of-range value.
  await page.locator('.dp__cd-input:not(.dp__cd-input--num)').fill('evil');
  await page.locator('.dp__cd-input--num').nth(0).fill('99999');
  await page.locator('.dp__cd-input--num').nth(1).fill('99999');
  await page.click('.dp__cd-add');
  // Wait past the 300ms storage debounce.
  await page.waitForTimeout(450);

  const cardCountBad = await page.locator('.dp__card--custom').count();
  record(
    '#29 custom device rejects out-of-range (W/H 99999)',
    cardCountBad === 0,
    `${cardCountBad} card(s) in My devices`
  );

  // Now try a valid value.
  await page.locator('.dp__cd-input:not(.dp__cd-input--num)').fill('My laptop');
  await page.locator('.dp__cd-input--num').nth(0).fill('1280');
  await page.locator('.dp__cd-input--num').nth(1).fill('800');
  await page.click('.dp__cd-add');
  // Re-render is synchronous on submit; storage write is debounced.
  await page.waitForTimeout(450);

  const cardCountGood = await page.locator('.dp__card--custom').count();
  record(
    '#29 custom device accepts in-range (1280×800)',
    cardCountGood === 1,
    `${cardCountGood} card(s) in My devices`
  );
  await page.close();
}

/** Fix #20 — dNR rule strips X-Frame-Options for panel sub_frames.
 *
 *  Strategy: load a known-XFO-DENY origin and listen on the iframe's
 *  `load` event. A successful load means dNR stripped the XFO header
 *  (otherwise Chrome would block the frame and the load event fires
 *  with location='about:blank').
 */
async function testDnrXFOStripping(
  context: BrowserContext,
  extensionId: string
) {
  // Deterministic check: the dNR dynamic rule must exist with id=1, the
  // correct `responseHeaders` removals, and `initiatorDomains` scoped to
  // this extension only. Loading a real XFO=DENY site from a test is
  // flaky because external sites also use JS framebusting / time out.
  const page = await openPanel(context, extensionId, '');
  const rules = (await page.evaluate(`new Promise(resolve => {
    chrome.declarativeNetRequest.getDynamicRules(rs => resolve(rs));
  })`)) as Array<{
    id: number;
    action: { responseHeaders?: Array<{ header: string; operation: string }> };
    condition: { initiatorDomains?: string[]; resourceTypes?: string[] };
  }>;
  const rule = rules.find(r => r.id === 1);
  if (!rule) {
    record('#20 dNR rule registered', false, `no rule id=1 (got ${rules.length} rule(s))`);
    await page.close();
    return;
  }
  const headers = (rule.action.responseHeaders ?? []).map(h => h.header).sort();
  const expected = ['content-security-policy', 'content-security-policy-report-only', 'x-frame-options'];
  const headersOk = JSON.stringify(headers) === JSON.stringify(expected);
  const initiatorsOk =
    Array.isArray(rule.condition.initiatorDomains) &&
    rule.condition.initiatorDomains.length === 1 &&
    rule.condition.initiatorDomains[0] === extensionId;
  const subFrameOk =
    Array.isArray(rule.condition.resourceTypes) &&
    rule.condition.resourceTypes.includes('sub_frame');
  record(
    '#20 dNR rule strips XFO+CSP for sub_frames',
    headersOk && subFrameOk,
    `removes [${headers.join(',')}] on ${rule.condition.resourceTypes?.join(',')}`
  );
  record(
    '#20 dNR rule scoped to extension initiator',
    initiatorsOk,
    `initiatorDomains=${JSON.stringify(rule.condition.initiatorDomains)} (expect [${extensionId}])`
  );
  await page.close();
}

/** Fix #33 — when bezel hidden, frame collapses to iframe size. */
async function testBezelHideCollapsesPadding(page: Page) {
  // Measure the frame's outer dimensions with bezel ON, then OFF, on the
  // same device. They must differ by the bezel padding.
  await clearState(page);
  await page.reload();
  await page.waitForSelector('.canvas .frame');

  const withBezel = await page.evaluate(() => {
    const f = document.querySelector('.canvas .frame') as HTMLElement;
    return { w: f.offsetWidth, h: f.offsetHeight };
  });

  // Toggle bezel off via settings.
  await page.evaluate(() => {
    return new Promise<void>(res => {
      chrome.storage.local.get('rpc.state.v2', got => {
        const s = (got['rpc.state.v2'] as Record<string, unknown>) ?? {};
        s.showBezel = false;
        chrome.storage.local.set({ 'rpc.state.v2': s }, () => res());
      });
    });
  });
  await page.reload();
  await page.waitForSelector('.canvas .frame');
  await page.waitForTimeout(200);

  const withoutBezel = await page.evaluate(() => {
    const f = document.querySelector('.canvas .frame') as HTMLElement;
    return { w: f.offsetWidth, h: f.offsetHeight };
  });

  const shrunk =
    withoutBezel.w < withBezel.w && withoutBezel.h < withBezel.h;
  record(
    '#33 bezel-hide collapses surrounding padding',
    shrunk,
    `${withBezel.w}×${withBezel.h} → ${withoutBezel.w}×${withoutBezel.h}`
  );
  await page.close();
}

/** Fix #32 — breakpoint guides render INSIDE the frame, scaled with pan/zoom. */
async function testBreakpointGuidesInsideFrame(page: Page) {
  // Switch to a 1440-wide laptop so all four breakpoints fit.
  await page.evaluate(() => {
    return new Promise<void>(res => {
      chrome.storage.local.get('rpc.state.v2', got => {
        const s = (got['rpc.state.v2'] as Record<string, unknown>) ?? {};
        s.activeDeviceId = 'desktop-1440';
        s.showBreakpointGuides = true;
        chrome.storage.local.set({ 'rpc.state.v2': s }, () => res());
      });
    });
  });
  await page.reload();
  await page.waitForSelector('.canvas .frame');
  await page.waitForTimeout(200);

  const guideCount = await page.evaluate(() => {
    return document.querySelectorAll('.canvas .frame .frame__guides .frame__guide').length;
  });
  // 1440 device → all 4 breakpoints (640, 768, 1024, 1280) fit.
  record(
    '#32 breakpoint guides render inside frame',
    guideCount === 4,
    `found ${guideCount}/4 guides`
  );

  // Now an iPhone (393 wide) — no guides should appear.
  await page.evaluate(() => {
    return new Promise<void>(res => {
      chrome.storage.local.get('rpc.state.v2', got => {
        const s = (got['rpc.state.v2'] as Record<string, unknown>) ?? {};
        s.activeDeviceId = 'iphone-15-pro';
        chrome.storage.local.set({ 'rpc.state.v2': s }, () => res());
      });
    });
  });
  await page.reload();
  await page.waitForSelector('.canvas .frame');
  await page.waitForTimeout(200);
  const phoneGuides = await page.evaluate(
    () => document.querySelectorAll('.canvas .frame .frame__guide').length
  );
  record(
    '#32 guides skipped when device < breakpoint',
    phoneGuides === 0,
    `iPhone-15-Pro shows ${phoneGuides} guides (expected 0)`
  );
  await page.close();
}

/** Fix #27/#28 — picking a device adds it to recents + the picker reflects
 *  the change without a full re-render storm. */
async function testRecentsAppearOnPick(page: Page) {
  await clearState(page);
  await page.reload();
  await page.waitForSelector('.canvas .frame');

  // Open picker.
  await page.click('.rail__btn[data-tooltip="Devices"]');
  await page.waitForSelector('.dp__tabs');
  // Pick iPhone 15 Pro.
  await page.click('.dp__card[data-active="no"] >> nth=0');
  await page.waitForTimeout(200);

  // Re-open picker.
  await page.click('.rail__btn[data-tooltip="Devices"]');
  await page.waitForSelector('.dp__recents .dp__chip');
  const chipCount = await page.evaluate(
    () => document.querySelectorAll('.dp__recents .dp__chip').length
  );
  record(
    '#28 recents row populated after device pick',
    chipCount >= 1,
    `${chipCount} chip(s) in recents`
  );
  await page.close();
}

/** Fix in toolbar — datalist of URL history populated as you Go. */
async function testUrlHistoryDatalist(page: Page) {
  await clearState(page);
  await page.reload();
  await page.waitForSelector('.canvas .frame');

  await page.fill('.tb__url', 'https://example.com');
  await page.press('.tb__url', 'Enter');
  await page.waitForTimeout(150);
  await page.fill('.tb__url', 'https://vercel.com');
  await page.press('.tb__url', 'Enter');
  await page.waitForTimeout(150);

  const optionCount = await page.evaluate(
    () => document.querySelectorAll('#rpc-url-history option').length
  );
  record(
    'URL history datalist populated',
    optionCount >= 2,
    `${optionCount} option(s) in datalist`
  );
  await page.close();
}

/** Keyboard shortcuts — R rotates, F fits. */
async function testKeyboardRotateAndFit(page: Page) {
  await clearState(page);
  await page.reload();
  await page.waitForSelector('.canvas .frame');

  const before = await page.evaluate(
    `document.querySelector('.canvas .frame').dataset.orientation || 'portrait'`
  );
  // Dispatch a real KeyboardEvent on document — Playwright's
  // page.keyboard.press goes to the focused element, but our handler is
  // bound to `document`, and a non-focused page won't bubble that path.
  await page.evaluate(
    `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', code: 'KeyR', bubbles: true }))`
  );
  await page.waitForTimeout(300);
  const after = await page.evaluate(
    `document.querySelector('.canvas .frame').dataset.orientation || 'portrait'`
  );
  record(
    'Keyboard R rotates orientation',
    before !== after,
    `${before} → ${after}`
  );

  const readZoomFn = `parseFloat(document.querySelector('.canvas__stage').dataset.zoom || '1')`;
  const zoomBefore = (await page.evaluate(readZoomFn)) as number;
  // Force a non-fit zoom by dispatching ctrl+wheel.
  await page.evaluate(
    `document.querySelector('.canvas').dispatchEvent(
      new WheelEvent('wheel', { deltaY: -300, ctrlKey: true, bubbles: true, cancelable: true })
    )`
  );
  await page.waitForTimeout(150);
  const zoomMid = (await page.evaluate(readZoomFn)) as number;
  // Now dispatch F to fit.
  await page.evaluate(
    `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', code: 'KeyF', bubbles: true }))`
  );
  await page.waitForTimeout(300);
  const zoomAfter = (await page.evaluate(readZoomFn)) as number;
  // Fit zoom equals the initial zoom (fit-to-window). Pressing F should
  // restore it after the wheel zoom changed it.
  const fitWorked = Math.abs(zoomAfter - zoomBefore) < 0.001;
  record(
    'Keyboard F resets zoom to fit',
    fitWorked,
    `before=${zoomBefore.toFixed(3)} after-wheel=${zoomMid.toFixed(3)} after-F=${zoomAfter.toFixed(3)}`
  );
  await page.close();
}

/** Keyboard [ and ] cycle through devices in the active category. */
async function testKeyboardCycleDevice(page: Page) {
  await clearState(page);
  await page.reload();
  await page.waitForSelector('.canvas .frame');

  const readDeviceFn = `document.querySelector('.canvas .frame').dataset.device || ''`;
  const initial = (await page.evaluate(readDeviceFn)) as string;
  await page.evaluate(
    `document.dispatchEvent(new KeyboardEvent('keydown', { key: ']', code: 'BracketRight', bubbles: true }))`
  );
  await page.waitForTimeout(400);
  const next = (await page.evaluate(readDeviceFn)) as string;
  record(
    'Keyboard ] cycles to next device',
    initial !== next && next.length > 0 && initial.length > 0,
    `${initial} → ${next}`
  );
  await page.close();
}

/** Fix #24 — Shift+wheel does NOT zoom, ctrl+wheel does. */
async function testWheelZoomIgnoresShiftKey(page: Page) {
  await clearState(page);
  await page.reload();
  await page.waitForSelector('.canvas .frame');
  await page.waitForTimeout(200);

  const readZoom = () =>
    page.evaluate(() => {
      const stage = document.querySelector('.canvas__stage') as HTMLElement;
      return parseFloat(stage.dataset.zoom ?? '1');
    });

  const zoom0 = await readZoom();

  // Shift+wheel — should pan only.
  await page.evaluate(() => {
    const canvas = document.querySelector('.canvas') as HTMLElement;
    canvas.dispatchEvent(
      new WheelEvent('wheel', { deltaY: -300, shiftKey: true, bubbles: true, cancelable: true })
    );
  });
  await page.waitForTimeout(120);
  const zoom1 = await readZoom();
  record(
    '#24 Shift+wheel does NOT change zoom',
    Math.abs(zoom1 - zoom0) < 0.001,
    `${zoom0.toFixed(3)} → ${zoom1.toFixed(3)}`
  );

  // Ctrl+wheel — should zoom in.
  await page.evaluate(() => {
    const canvas = document.querySelector('.canvas') as HTMLElement;
    canvas.dispatchEvent(
      new WheelEvent('wheel', { deltaY: -300, ctrlKey: true, bubbles: true, cancelable: true })
    );
  });
  await page.waitForTimeout(120);
  const zoom2 = await readZoom();
  record(
    '#24 Ctrl+wheel DOES change zoom',
    Math.abs(zoom2 - zoom1) > 0.01,
    `${zoom1.toFixed(3)} → ${zoom2.toFixed(3)}`
  );
  await page.close();
}

/** Fix #25 — pan clamp keeps device visible after a huge wheel scroll. */
async function testPanClampKeepsDeviceVisible(page: Page) {
  await clearState(page);
  await page.reload();
  await page.waitForSelector('.canvas .frame');
  await page.waitForTimeout(200);

  // Try to fling the device offscreen with a huge wheel pan.
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => {
      const canvas = document.querySelector('.canvas') as HTMLElement;
      canvas.dispatchEvent(
        new WheelEvent('wheel', { deltaX: 5000, deltaY: 5000, bubbles: true, cancelable: true })
      );
    });
  }
  await page.waitForTimeout(200);

  const visible = await page.evaluate(() => {
    const f = document.querySelector('.canvas .frame') as HTMLElement;
    const v = document.querySelector('.canvas__viewport') as HTMLElement;
    const fr = f.getBoundingClientRect();
    const vr = v.getBoundingClientRect();
    // Some part of the frame must overlap the viewport.
    return !(fr.right < vr.left || fr.left > vr.right || fr.bottom < vr.top || fr.top > vr.bottom);
  });
  record(
    '#25 pan clamp keeps device visible',
    visible,
    visible ? 'frame still inside viewport' : 'frame flung off-screen'
  );
  await page.close();
}

/** Fix #18/#22 — full-page metrics roundtrip works AND filters by source.
 *
 *  We can't download in a headless test, but we can verify the bridge's
 *  message protocol behaves correctly: ask metrics, get a numerical
 *  scrollHeight back. If the origin filter is wrong, the bridge would
 *  ignore our request entirely.
 */
async function testFullPageScreenshotMath(page: Page) {
  // We need a same-origin or http(s) page so the content script runs.
  // data: URLs don't get content scripts injected. Use about:blank with
  // injected content via document.write to keep it self-contained.
  await page.fill('.tb__url', 'https://example.com');
  await page.press('.tb__url', 'Enter');
  // Wait for example.com to load + frame-bridge content script to attach.
  await page.waitForTimeout(3000);

  const result = (await page.evaluate(`new Promise(resolve => {
    var iframe = document.querySelector('.canvas iframe');
    var timeout = setTimeout(function () {
      window.removeEventListener('message', handler);
      resolve({ ok: false, reason: 'no rpc:metrics response within 2s' });
    }, 2000);
    function handler(e) {
      if (e.source !== iframe.contentWindow) return;
      if (!e.data || e.data.type !== 'rpc:metrics') return;
      clearTimeout(timeout);
      window.removeEventListener('message', handler);
      var sh = Number(e.data.scrollHeight);
      var vh = Number(e.data.viewportHeight);
      var vw = Number(e.data.viewportWidth);
      if (sh > 0 && vh > 0 && vw > 0) {
        resolve({ ok: true, reason: 'scrollHeight=' + sh + ' viewport=' + vw + 'x' + vh });
      } else {
        resolve({ ok: false, reason: 'bad metrics: ' + sh + '/' + vw + '/' + vh });
      }
    }
    window.addEventListener('message', handler);
    iframe.contentWindow.postMessage({ type: 'rpc:requestMetrics' }, '*');
  })`)) as { ok: boolean; reason: string };

  record('#18/#22 frame-bridge metrics protocol roundtrip', result.ok, result.reason);
  await page.close();
}

/** Fix #37 — tooltip is installed via installTooltip(); the tooltip element
 *  exists in the DOM after panel mounts. */
async function testTooltipRequiresInstall(page: Page) {
  await page.waitForTimeout(100);
  const exists = await page.evaluate(() => !!document.querySelector('.tooltip'));
  record(
    '#37 tooltip element installed at startup',
    exists,
    exists ? 'tooltip div present' : 'tooltip div missing'
  );
  await page.close();
}

/** Fix #38 — when GITHUB_REPO is null, the Open-source section is hidden. */
async function testHelpHidesPlaceholderRepo(page: Page) {
  await page.click('.rail__btn[data-tooltip="Help & GitHub"]');
  await page.waitForSelector('.hp');
  await page.waitForTimeout(150);
  // The help dialog should NOT contain "View source on GitHub" while the
  // repo placeholder is null.
  const hasGitHubSection = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.hp__row-title')).some(
      el => el.textContent?.includes('View source on GitHub')
    );
  });
  record(
    '#38 help hides placeholder GitHub section',
    !hasGitHubSection,
    hasGitHubSection ? 'GitHub section still showing' : 'section correctly hidden'
  );
  await page.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
