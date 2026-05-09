import { buildBezelLayout, getBezelSvg } from '../../lib/bezel-asset';
import type { Device } from '../../lib/devices';
import { buildBrowserChrome } from './browser-chrome';
import { h } from './h';
import * as store from './store';

/**
 * Renders the active device using **bundled SVG bezels** (public/bezels/).
 *
 * Layout:
 *   .frame                 — container, sized to the bezel's outer rect
 *     .frame__bezel        — wrapper holding the <img> bezel artwork
 *     .frame__chrome-host  — overlay for the browser-chrome bar
 *     iframe               — absolutely positioned over the screen cutout
 *
 * Landscape rotation is handled in CSS — we set `data-orientation` on the
 * frame and rotate the bezel image / shift coordinates without authoring
 * landscape-specific SVG files. One portrait SVG per bezel kind.
 *
 * `applyOrientation` swaps dimensions in place (no iframe remount, so the
 * loaded site keeps its state).
 */

export interface MountedFrame {
  root: HTMLElement;
  iframe: HTMLIFrameElement;
  device: Device;
  applyOrientation: (orientation: 'portrait' | 'landscape') => void;
  applyChrome: (showChrome: boolean, url: string) => void;
  applyScrollbars: (hide: boolean) => void;
  /** When false, the frame collapses to the iframe's intrinsic size —
   *  no bezel artwork AND no bezel padding around the iframe. */
  applyBezelVisible: (visible: boolean) => void;
}

export function createFrame(
  device: Device,
  orientation: 'portrait' | 'landscape',
  url: string
): MountedFrame {
  const bezelHost = h('div', { class: 'frame__bezel' });
  const chromeTopHost = h('div', { class: 'frame__chrome-host frame__chrome-host--top' });
  const chromeBottomHost = h('div', { class: 'frame__chrome-host frame__chrome-host--bottom' });
  const guidesHost = h('div', { class: 'frame__guides' });

  // No `sandbox` attribute: the previewed page needs to behave like a
  // normal tab — scripts, cookies, redirects, postMessage. Setting
  // `sandbox="allow-scripts allow-same-origin ..."` would log a Chrome
  // warning ("can escape its sandboxing") because a script inside the
  // frame can rewrite the sandbox attribute, defeating the protection.
  // Our trust model is: the user explicitly typed this URL → render it
  // unsandboxed and let the dNR rule + content-script bridge do their
  // job. Other extensions targeting `<all_urls>` are still subject to
  // their own permission policies.
  const iframe = h('iframe', {
    title: device.name,
    referrerpolicy: 'no-referrer-when-downgrade',
  }) as HTMLIFrameElement;

  iframe.addEventListener('load', () => {
    try {
      iframe.contentWindow?.postMessage(
        {
          type: 'rpc:init',
          hideScrollbars: store.getState().hideScrollbars,
        },
        '*'
      );
    } catch {
      /* sandboxed cross-origin frame — bridge stays inert. */
    }
  });

  if (url) iframe.src = url;

  const root = h(
    'div',
    {
      class: `frame frame--${device.bezel}`,
      'data-device': device.id,
    },
    bezelHost,
    chromeTopHost,
    chromeBottomHost,
    iframe,
    guidesHost
  );

  let currentScreen: BezelScreen | null = null;
  let currentChromeTop = 0;
  let currentChromeBottom = 0;

  function repositionIframe() {
    if (!currentScreen) return;
    iframe.style.position = 'absolute';
    iframe.style.left = `${currentScreen.x}px`;
    iframe.style.top = `${currentScreen.y + currentChromeTop}px`;
    iframe.style.width = `${currentScreen.width}px`;
    iframe.style.height = `${
      currentScreen.height - currentChromeTop - currentChromeBottom
    }px`;
    // Only round corners that the chrome doesn't cover. Top chrome covers
    // the top-left/right; bottom chrome covers the bottom-left/right.
    // Otherwise the iframe content gets clipped where the chrome already
    // provides the device's rounded edge.
    const r = currentScreen.radius;
    const tl = currentChromeTop > 0 ? 0 : r;
    const tr = currentChromeTop > 0 ? 0 : r;
    const br = currentChromeBottom > 0 ? 0 : r;
    const bl = currentChromeBottom > 0 ? 0 : r;
    iframe.style.borderRadius = `${tl}px ${tr}px ${br}px ${bl}px`;
  }

  let currentOrientation: 'portrait' | 'landscape' = orientation;

  const applyOrientation = (next: 'portrait' | 'landscape') => {
    currentOrientation = next;
    const layout = buildBezelLayout(
      device.bezel,
      device.width,
      device.height,
      next,
      buildOverride(device.bezelSrc, device.bezelLayout)
    );

    root.dataset.orientation = next;
    root.style.width = `${layout.outerWidth}px`;
    root.style.height = `${layout.outerHeight}px`;

    // Inline the cached SVG so currentColor inherits the theme.
    bezelHost.innerHTML = getBezelSvg(layout.src);
    const svgEl = bezelHost.querySelector('svg');
    if (svgEl) {
      svgEl.removeAttribute('width');
      svgEl.removeAttribute('height');
      svgEl.style.position = 'absolute';
      svgEl.style.pointerEvents = 'none';
      if (next === 'landscape') {
        // Landscape: portrait SVG rotated -90° around the center of the
        // outer wrapper. Sized at the rotated dimensions so the rotated
        // bounding box matches the wrapper.
        svgEl.style.width = `${layout.outerHeight}px`;
        svgEl.style.height = `${layout.outerWidth}px`;
        svgEl.style.left = `${(layout.outerWidth - layout.outerHeight) / 2}px`;
        svgEl.style.top = `${(layout.outerHeight - layout.outerWidth) / 2}px`;
        svgEl.style.transform = 'rotate(-90deg)';
      } else {
        svgEl.style.width = '100%';
        svgEl.style.height = '100%';
        svgEl.style.left = '0';
        svgEl.style.top = '0';
        svgEl.style.transform = 'none';
      }
    }

    currentScreen = layout.screen;
    repositionIframe();

    // Top chrome — anchored at the screen top edge.
    chromeTopHost.style.left = `${layout.screen.x}px`;
    chromeTopHost.style.top = `${layout.screen.y}px`;
    chromeTopHost.style.width = `${layout.screen.width}px`;
    chromeTopHost.style.borderTopLeftRadius = `${layout.screen.radius}px`;
    chromeTopHost.style.borderTopRightRadius = `${layout.screen.radius}px`;

    // Bottom chrome — anchored at the screen bottom edge.
    chromeBottomHost.style.left = `${layout.screen.x}px`;
    chromeBottomHost.style.top = '';
    chromeBottomHost.style.bottom = `${
      layout.outerHeight - (layout.screen.y + layout.screen.height)
    }px`;
    chromeBottomHost.style.width = `${layout.screen.width}px`;
    chromeBottomHost.style.borderBottomLeftRadius = `${layout.screen.radius}px`;
    chromeBottomHost.style.borderBottomRightRadius = `${layout.screen.radius}px`;

    // Breakpoint guides — vertical lines at common CSS widths, positioned
    // from the screen's left edge so they live in iframe-content px and
    // get the stage's pan/zoom transform for free. Lines wider than the
    // device viewport are skipped (no point showing 1280 on an iPhone).
    renderBreakpointGuides(guidesHost, layout.screen);
  };

  const applyChrome = (showChrome: boolean, latestUrl: string) => {
    chromeTopHost.replaceChildren();
    chromeBottomHost.replaceChildren();
    if (!showChrome) {
      currentChromeTop = 0;
      currentChromeBottom = 0;
      chromeTopHost.style.height = '0';
      chromeBottomHost.style.height = '0';
      repositionIframe();
      return;
    }
    const mount = buildBrowserChrome(
      device.bezel,
      latestUrl,
      currentScreen?.width
    );
    if (!mount) {
      currentChromeTop = 0;
      currentChromeBottom = 0;
      chromeTopHost.style.height = '0';
      chromeBottomHost.style.height = '0';
      repositionIframe();
      return;
    }
    if (mount.topEl) chromeTopHost.append(mount.topEl);
    if (mount.bottomEl) chromeBottomHost.append(mount.bottomEl);
    chromeTopHost.style.height = `${mount.topHeight}px`;
    chromeBottomHost.style.height = `${mount.bottomHeight}px`;
    currentChromeTop = mount.topHeight;
    currentChromeBottom = mount.bottomHeight;
    repositionIframe();
  };

  const applyScrollbars = (hide: boolean) => {
    try {
      iframe.contentWindow?.postMessage(
        { type: 'rpc:setScroll', hideScrollbars: hide },
        '*'
      );
    } catch {
      /* sandbox / cross-origin restrictions. */
    }
  };

  /** Toggle the visible bezel artwork AND collapse the surrounding
   *  padding, so the iframe doesn't sit inside an empty rectangle. */
  const applyBezelVisible = (visible: boolean) => {
    if (visible) {
      bezelHost.style.display = '';
      // Re-run layout to restore the padded outer dimensions.
      applyOrientation(currentOrientation);
      return;
    }
    // Hidden mode: shrink to the iframe's intrinsic dimensions, with
    // chrome bars stacked above + below.
    bezelHost.style.display = 'none';
    const w = currentOrientation === 'landscape' ? device.height : device.width;
    const hpx = currentOrientation === 'landscape' ? device.width : device.height;
    root.style.width = `${w}px`;
    root.style.height = `${hpx}px`;
    currentScreen = { x: 0, y: 0, width: w, height: hpx, radius: 0 };
    repositionIframe();
    chromeTopHost.style.left = '0';
    chromeTopHost.style.top = '0';
    chromeTopHost.style.width = `${w}px`;
    chromeTopHost.style.borderTopLeftRadius = '0';
    chromeTopHost.style.borderTopRightRadius = '0';
    chromeBottomHost.style.left = '0';
    chromeBottomHost.style.top = '';
    chromeBottomHost.style.bottom = '0';
    chromeBottomHost.style.width = `${w}px`;
    chromeBottomHost.style.borderBottomLeftRadius = '0';
    chromeBottomHost.style.borderBottomRightRadius = '0';
    renderBreakpointGuides(guidesHost, currentScreen);
  };

  applyOrientation(orientation);
  applyChrome(store.getState().showBrowserChrome, url);
  applyBezelVisible(store.getState().showBezel);

  return {
    root,
    iframe,
    device,
    applyOrientation,
    applyChrome,
    applyScrollbars,
    applyBezelVisible,
  };
}

interface BezelScreen {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

const BREAKPOINTS = [640, 768, 1024, 1280];

function renderBreakpointGuides(
  host: HTMLElement,
  screen: BezelScreen
): void {
  host.replaceChildren();
  // Anchor at the iframe's screen rect inside the frame, then draw
  // vertical lines at each breakpoint X (CSS px from screen left).
  for (const bp of BREAKPOINTS) {
    if (bp > screen.width) continue;
    const line = document.createElement('div');
    line.className = 'frame__guide';
    line.dataset.bp = String(bp);
    line.style.left = `${screen.x + bp}px`;
    line.style.top = `${screen.y}px`;
    line.style.height = `${screen.height}px`;
    const label = document.createElement('span');
    label.className = 'frame__guide-label';
    label.textContent = `${bp}`;
    line.append(label);
    host.append(line);
  }
}

/** Build the override object only with the fields actually supplied —
 *  exactOptionalPropertyTypes is strict about omitted vs undefined. */
function buildOverride(
  src: string | undefined,
  layout: Device['bezelLayout']
):
  | {
      src?: string;
      layout?: NonNullable<Device['bezelLayout']>;
    }
  | undefined {
  if (!src && !layout) return undefined;
  const result: { src?: string; layout?: NonNullable<Device['bezelLayout']> } =
    {};
  if (src) result.src = src;
  if (layout) result.layout = layout;
  return result;
}
