import * as icons from '../../lib/icons';
import { openDevicePicker } from './device-picker';
import { h } from './h';
import { openHelp } from './help';
import { openSettings } from './settings';
import * as store from './store';

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 2;

export function createRightRail(): HTMLElement {
  const rail = h(
    'aside',
    { class: 'rail' },
    railButton(icons.close, 'Close', () => window.close()),
    railButton(icons.monitor, 'Devices', openDevicePicker),
    railButton(icons.rotate, 'Rotate', store.rotate),
    railButton(icons.expand, 'Fit to screen', () => store.setZoom('fit')),
    railButton(icons.plus, 'Zoom in', () => stepZoom(ZOOM_STEP)),
    railButton(icons.minus, 'Zoom out', () => stepZoom(-ZOOM_STEP)),
    railButton(
      icons.hand,
      'Pan / Move (hold Space + drag)',
      () => store.update({ panLocked: !store.getState().panLocked }),
      { id: 'rail-pan' }
    ),
    railButton(icons.camera, 'Screenshot — site only', () =>
      captureSiteOnly()
    ),
    railButton(icons.puzzle, 'Screenshot — with mockup', () =>
      captureWithMockup()
    ),
    railButton(icons.expand, 'Screenshot — full page (scroll-and-stitch)', () =>
      captureFullPage()
    ),
    railButton(icons.video, 'Recording (coming soon)', undefined, {
      disabled: true,
      badge: 'NEW',
    }),
    h('div', { class: 'rail__spacer' }),
    railButton(
      icons.sync,
      'Toggle sync scroll',
      () => store.update({ syncScroll: !store.getState().syncScroll }),
      { id: 'rail-sync' }
    ),
    railButton(icons.help, 'Help & GitHub', openHelp),
    railButton(icons.settings, 'Settings', openSettings)
  );

  // Reflect toggle states on the rail buttons.
  const reflectToggles = () => {
    const s = store.getState();
    const sync = rail.querySelector<HTMLElement>('#rail-sync');
    if (sync) sync.dataset.active = s.syncScroll ? 'yes' : 'no';
    const pan = rail.querySelector<HTMLElement>('#rail-pan');
    if (pan) pan.dataset.active = s.panLocked ? 'yes' : 'no';
  };
  reflectToggles();
  store.subscribe(reflectToggles);

  return rail;
}

interface RailButtonOptions {
  disabled?: boolean;
  badge?: string;
  id?: string;
}

function railButton(
  iconSvg: string,
  tooltip: string,
  onClick?: () => void,
  options: RailButtonOptions = {}
): HTMLElement {
  const { disabled = false, badge, id } = options;
  return h(
    'button',
    {
      class: 'rail__btn',
      id,
      'data-tooltip': tooltip,
      disabled: disabled ? 'true' : undefined,
      onclick: disabled ? undefined : onClick,
    },
    h('span', { html: iconSvg }),
    badge ? h('span', { class: 'rail__badge' }, badge) : null
  );
}

function stepZoom(delta: number) {
  const currentRaw = store.getState().zoom;
  const current =
    typeof currentRaw === 'number' ? currentRaw : readDomScale();
  const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, current + delta));
  store.setZoom(next);
}

function readDomScale(): number {
  const stage = document.querySelector<HTMLElement>('.canvas__stage');
  return parseFloat(stage?.dataset.zoom ?? '1') || 1;
}

/**
 * Public capture API — also called directly from keyboard shortcuts.
 * Decouples shortcut → action so we don't depend on rail button DOM order.
 */
export const captureSiteOnly = () => captureActiveDeviceScreen({ withMockup: false });
export const captureWithMockup = () => captureActiveDeviceScreen({ withMockup: true });
export { captureFullPage };

interface CaptureOptions {
  withMockup: boolean;
}

async function captureActiveDeviceScreen({ withMockup }: CaptureOptions) {
  const cropTarget = document.querySelector<HTMLElement>(
    withMockup ? '.canvas .frame' : '.canvas .frame > iframe'
  );
  if (!cropTarget) return;

  const previousZoom = store.getState().zoom;
  await centerActiveFrame();

  const screenshotDataUrl = await requestVisibleTabCapture();
  if (!screenshotDataUrl) {
    store.setZoom(previousZoom);
    return;
  }

  const fullScreenshot = await loadImage(screenshotDataUrl);
  const cropped = cropToElementRect(fullScreenshot, cropTarget);
  cropped.toBlob(blob => {
    store.setZoom(previousZoom);
    if (!blob) return;
    triggerDownload(blob, cropped.width, cropped.height, withMockup);
  }, 'image/png');
}

function waitForLayout(): Promise<void> {
  return new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
}

/**
 * Re-centre the canvas stage so the active frame is fully inside the
 * canvas viewport. The stage uses CSS transforms — `scrollIntoView`
 * would walk past `.canvas__viewport` (overflow:hidden) and scroll the
 * panel page itself, screenshotting the wrong area. `fit` is correct
 * here: applyZoom('fit') in canvas.ts caps the scale at 1 and centres
 * the stage, guaranteeing the whole device is captured even on huge
 * viewports. Smaller devices are captured at 1:1.
 */
async function centerActiveFrame(): Promise<void> {
  store.setZoom('fit');
  await waitForLayout();
}

function requestVisibleTabCapture(): Promise<string | null> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: 'capture' }, response => {
      resolve(response?.ok ? (response.dataUrl as string) : null);
    });
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

function cropToElementRect(
  fullScreenshot: HTMLImageElement,
  targetEl: HTMLElement
): HTMLCanvasElement {
  const dpr = window.devicePixelRatio || 1;
  const r = targetEl.getBoundingClientRect();
  const cropX = Math.round(r.left * dpr);
  const cropY = Math.round(r.top * dpr);
  const cropWidth = Math.round(r.width * dpr);
  const cropHeight = Math.round(r.height * dpr);

  const canvas = document.createElement('canvas');
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(
      fullScreenshot,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight
    );
  }
  return canvas;
}

function triggerDownload(
  blob: Blob,
  width: number,
  height: number,
  withMockup: boolean
) {
  const device = store.resolveDevice(store.getState().activeDeviceId);
  const deviceSlug = device?.id ?? 'frame';
  const variant = withMockup ? 'mockup' : 'site';
  downloadBlob(
    blob,
    `rpc-${deviceSlug}-${variant}-${width}x${height}.png`
  );
}

/** Download a blob and revoke the object URL once Chrome's download
 *  service has accepted it (or the dispatch failed). Without revocation
 *  every screenshot leaks a Blob URL until the panel tab closes. */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename }, () => {
    // Revoke even on lastError — keeping the URL alive serves no purpose.
    URL.revokeObjectURL(url);
  });
}

/* ---------------- Full-page (scroll-and-stitch) screenshot ---------------- */

/**
 * Captures the entire scroll height of the iframe by driving the
 * frame-bridge: ask for the scroll metrics, then for each viewport-sized
 * segment, scroll the iframe, snapshot via captureVisibleTab, crop to
 * the iframe's viewport rect, and paint into a tall canvas.
 *
 * Limitations:
 *   - Works only when the iframe lets the bridge run (same-origin or
 *     extension-injected) — postMessage will time out otherwise.
 *   - Sticky headers / position:fixed elements appear in every segment.
 *     Standard issue for scroll-stitch tools; matches what users expect.
 */
async function captureFullPage() {
  const iframe = document.querySelector<HTMLIFrameElement>('.canvas iframe');
  if (!iframe) return;

  const previousZoom = store.getState().zoom;
  await centerActiveFrame();

  // Ask the bridge for scrollHeight + viewport height. Use an inline
  // listener with a short timeout so we fail loudly on cross-origin
  // pages where the bridge isn't allowed.
  const metrics = await requestScrollMetrics(iframe);
  if (!metrics) {
    store.setZoom(previousZoom);
    console.warn('[rpc] full-page screenshot unavailable for this site');
    return;
  }

  // Pixel ratios.
  //   1 iframe content CSS px == iframe rendered px on the panel
  //     (the iframe element's clientWidth equals its content viewport
  //     width when zoom=1; setZoom('fit') may shrink, hence renderRatio)
  //   1 panel CSS px == `dpr` device pixels in the screenshot
  const dpr = window.devicePixelRatio || 1;
  const iframeRect = iframe.getBoundingClientRect();
  const renderRatio = iframeRect.width / Math.max(1, metrics.viewportWidth);
  const totalContentH = metrics.scrollHeight;
  const viewportContentH = metrics.viewportHeight;
  const segmentCount = Math.max(1, Math.ceil(totalContentH / viewportContentH));

  // Each segment crops the iframe's rendered rect from the visible-tab
  // screenshot (panel CSS px → device px).
  const segCropW = Math.round(iframeRect.width * dpr);
  const segCropH = Math.round(iframeRect.height * dpr);

  // Final image: total scroll height, scaled by render ratio (iframe may
  // be drawn smaller than its CSS viewport when fit-zoom shrinks it),
  // then by DPR to land in screenshot pixels.
  const stitched = document.createElement('canvas');
  stitched.width = segCropW;
  stitched.height = Math.round(totalContentH * renderRatio * dpr);
  const ctx = stitched.getContext('2d');
  if (!ctx) {
    store.setZoom(previousZoom);
    return;
  }

  for (let i = 0; i < segmentCount; i++) {
    const targetY = Math.min(i * viewportContentH, totalContentH - viewportContentH);
    await setIframeScroll(iframe, targetY);
    await waitForLayout();
    await new Promise(r => setTimeout(r, 120)); // let lazy-loaded media settle

    const dataUrl = await requestVisibleTabCapture();
    if (!dataUrl) continue;
    const img = await loadImage(dataUrl);
    // Recompute rect in case the iframe shifted between segments.
    const r = iframe.getBoundingClientRect();
    const cropX = Math.round(r.left * dpr);
    const cropY = Math.round(r.top * dpr);

    // Map iframe-content scroll position → stitched canvas pixels.
    const destY = Math.round(targetY * renderRatio * dpr);
    ctx.drawImage(
      img,
      cropX, cropY, segCropW, segCropH,
      0, destY, segCropW, segCropH
    );
  }

  // Restore: scroll the iframe back to top, restore the user's zoom.
  await setIframeScroll(iframe, 0);
  store.setZoom(previousZoom);

  stitched.toBlob(blob => {
    if (!blob) return;
    const device = store.resolveDevice(store.getState().activeDeviceId);
    const slug = device?.id ?? 'frame';
    downloadBlob(
      blob,
      `rpc-${slug}-fullpage-${stitched.width}x${stitched.height}.png`
    );
  }, 'image/png');
}

interface ScrollMetrics {
  scrollHeight: number;
  viewportHeight: number;
  viewportWidth: number;
}

function requestScrollMetrics(
  iframe: HTMLIFrameElement
): Promise<ScrollMetrics | null> {
  return new Promise(resolve => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(null);
    }, 1500);
    const handler = (e: MessageEvent) => {
      // Only accept replies from THIS iframe — any other frame in the
      // panel could otherwise resolve with bogus dimensions.
      if (e.source !== iframe.contentWindow) return;
      if (!e.data || e.data.type !== 'rpc:metrics') return;
      window.clearTimeout(timeout);
      window.removeEventListener('message', handler);
      resolve({
        scrollHeight: Number(e.data.scrollHeight) || 0,
        viewportHeight: Number(e.data.viewportHeight) || 0,
        viewportWidth: Number(e.data.viewportWidth) || 0,
      });
    };
    window.addEventListener('message', handler);
    iframe.contentWindow?.postMessage({ type: 'rpc:requestMetrics' }, '*');
  });
}

function setIframeScroll(
  iframe: HTMLIFrameElement,
  y: number
): Promise<void> {
  return new Promise(resolve => {
    iframe.contentWindow?.postMessage({ type: 'rpc:scrollTo', y }, '*');
    // Bridge has no ack for scrollTo — give the page a frame to settle.
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}
