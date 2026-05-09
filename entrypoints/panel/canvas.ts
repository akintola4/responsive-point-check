import { createFrame, type MountedFrame } from './frame';
import { clear, h } from './h';
import * as store from './store';

/**
 * Canvas with translate + scale transform.
 *
 * Why translate-and-scale instead of overflow-auto-scroll:
 *   - We need zoom-to-cursor (zoom around the user's pinch / scroll point,
 *     not the canvas center). With CSS `overflow: auto`, the scrollable
 *     bounds don't account for `transform: scale`, so cursor-anchored
 *     zoom math doesn't line up.
 *   - Pan also becomes a simple translate update — no scrollLeft fiddling.
 *
 * Two pieces of state drive the rendering:
 *   `panX`, `panY`  — translation in viewport pixels (top-left corner of stage)
 *   `currentScale`  — applied via `scale(s)` on the stage transform
 */

const VIEWPORT_PADDING_PX = 64;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;

interface ActiveFrame {
  mounted: MountedFrame;
  url: string;
  /** Rendered outer dimensions — needed to compute fit + clamp pan. */
  outerWidth: number;
  outerHeight: number;
}

export function createCanvas(): HTMLElement {
  const stage = h('div', { class: 'canvas__stage' });
  const viewport = h('div', { class: 'canvas__viewport' }, stage);
  const root = h('div', { class: 'canvas' }, viewport);

  let active: ActiveFrame | null = null;
  let panX = 0;
  let panY = 0;
  let currentScale = 1;

  function applyTransform() {
    stage.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${currentScale})`;
    stage.dataset.zoom = String(currentScale);
  }

  function captureOuterDimensions() {
    if (!active) return;
    const rect = active.mounted.root.getBoundingClientRect();
    // Pre-transform layout size — divide by current scale so we get the
    // natural box, not the rendered (scaled) box.
    active.outerWidth = rect.width / currentScale;
    active.outerHeight = rect.height / currentScale;
  }

  function mountActiveDevice() {
    const { activeDeviceId, orientation, url, zoom } = store.getState();
    const device = store.resolveDevice(activeDeviceId);
    if (!device) return;
    clear(stage);
    const mounted = createFrame(device, orientation, url);
    stage.append(mounted.root);
    active = { mounted, url, outerWidth: device.width, outerHeight: device.height };
    // Read the actual rendered size after the frame applies its bezel layout.
    requestAnimationFrame(() => {
      captureOuterDimensions();
      applyZoom(zoom);
    });
  }

  function rotateActiveFrame(nextOrientation: 'portrait' | 'landscape') {
    if (!active) return;
    const swap = () => {
      active!.mounted.applyOrientation(nextOrientation);
      requestAnimationFrame(() => {
        captureOuterDimensions();
        applyZoom(store.getState().zoom);
      });
    };
    runWithViewTransition(swap);
  }

  function updateActiveUrl(url: string) {
    if (!active || active.url === url) return;
    active.mounted.iframe.src = url || 'about:blank';
    active.url = url;
    active.mounted.applyChrome(store.getState().showBrowserChrome, url);
  }

  function updateChromeVisibility(showChrome: boolean) {
    if (!active) return;
    active.mounted.applyChrome(showChrome, active.url);
    requestAnimationFrame(() => {
      captureOuterDimensions();
      if (store.getState().zoom === 'fit') applyZoom('fit');
    });
  }

  function applyZoom(zoom: store.Zoom) {
    if (!active) return;
    if (zoom === 'fit') {
      currentScale = computeFitScale(viewport, active.outerWidth, active.outerHeight);
      centerStageInViewport();
    } else {
      currentScale = zoom;
      // Re-center on numeric zoom changes that come from non-cursor events
      // (e.g. rail buttons). Wheel events handle their own positioning.
      centerStageInViewport();
    }
    applyTransform();
  }

  function centerStageInViewport() {
    if (!active) return;
    const vpRect = viewport.getBoundingClientRect();
    panX = (vpRect.width - active.outerWidth * currentScale) / 2;
    panY = (vpRect.height - active.outerHeight * currentScale) / 2;
  }

  function zoomAtCursor(nextScale: number, clientX: number, clientY: number) {
    const vpRect = viewport.getBoundingClientRect();
    const cursorVx = clientX - vpRect.left;
    const cursorVy = clientY - vpRect.top;
    // Stage-natural point under the cursor *before* zoom.
    const contentX = (cursorVx - panX) / currentScale;
    const contentY = (cursorVy - panY) / currentScale;
    // After zoom, place the same content point back under the cursor.
    panX = cursorVx - contentX * nextScale;
    panY = cursorVy - contentY * nextScale;
    currentScale = nextScale;
    applyTransform();
  }

  store.subscribe((next, prev) => {
    if (next.activeDeviceId !== prev.activeDeviceId) {
      mountActiveDevice();
      return;
    }
    if (next.orientation !== prev.orientation) {
      rotateActiveFrame(next.orientation);
      return;
    }
    if (next.url !== prev.url) updateActiveUrl(next.url);
    if (next.showBrowserChrome !== prev.showBrowserChrome) {
      updateChromeVisibility(next.showBrowserChrome);
    }
    if (next.showBezel !== prev.showBezel && active) {
      active.mounted.applyBezelVisible(next.showBezel);
      requestAnimationFrame(() => {
        captureOuterDimensions();
        if (store.getState().zoom === 'fit') applyZoom('fit');
      });
    }
    if (next.hideScrollbars !== prev.hideScrollbars) {
      active?.mounted.applyScrollbars(next.hideScrollbars);
    }
    if (next.zoom !== prev.zoom) applyZoom(next.zoom);
  });

  // Re-fit on viewport resize.
  const viewportObserver = new ResizeObserver(() => {
    if (store.getState().zoom === 'fit') applyZoom('fit');
  });
  viewportObserver.observe(viewport);

  // Wheel: trackpad pinch / Ctrl+wheel = zoom-at-cursor, plain = pan.
  // (Drop Shift modifier — Shift+scroll is the macOS convention for
  // horizontal pan and pinch already sets ctrlKey, so we don't need it.)
  root.addEventListener('wheel', handleWheel, { passive: false });

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    if (event.ctrlKey) {
      const factor = Math.exp(-event.deltaY * 0.01);
      const next = clamp(currentScale * factor, MIN_ZOOM, MAX_ZOOM);
      zoomAtCursor(next, event.clientX, event.clientY);
      // Sync to store so toolbar / rail labels reflect the change.
      store.setZoom(next);
    } else {
      // Two-finger trackpad scroll: pan, clamped so the device can't
      // be flung entirely off-screen.
      panX -= event.deltaX;
      panY -= event.deltaY;
      clampPan();
      applyTransform();
    }
  }

  /** Keep at least PAN_MARGIN_PX of the device visible inside the
   *  viewport on every edge, so the user can always see (and grab) it. */
  function clampPan() {
    if (!active) return;
    const PAN_MARGIN_PX = 80;
    const vpRect = viewport.getBoundingClientRect();
    const stageW = active.outerWidth * currentScale;
    const stageH = active.outerHeight * currentScale;
    const minX = PAN_MARGIN_PX - stageW;
    const maxX = vpRect.width - PAN_MARGIN_PX;
    const minY = PAN_MARGIN_PX - stageH;
    const maxY = vpRect.height - PAN_MARGIN_PX;
    panX = clamp(panX, minX, maxX);
    panY = clamp(panY, minY, maxY);
  }

  // Click-drag pan (Space-held or pan-lock toggle).
  installPanGesture(root, () => ({
    nudge: (dx, dy) => {
      panX += dx;
      panY += dy;
      clampPan();
      applyTransform();
    },
  }));

  // Initial mount runs after the element is in the DOM, so getBoundingClientRect
  // returns the real viewport size.
  queueMicrotask(mountActiveDevice);

  return root;
}

function computeFitScale(
  viewport: HTMLElement,
  outerWidth: number,
  outerHeight: number
): number {
  const { width: vpWidth, height: vpHeight } = viewport.getBoundingClientRect();
  const scaleByWidth = (vpWidth - VIEWPORT_PADDING_PX * 2) / outerWidth;
  const scaleByHeight = (vpHeight - VIEWPORT_PADDING_PX * 2) / outerHeight;
  return clamp(Math.min(scaleByWidth, scaleByHeight), MIN_ZOOM, 1);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function runWithViewTransition(fn: () => void) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => unknown;
  };
  if (doc.startViewTransition) {
    doc.startViewTransition(fn);
  } else {
    fn();
  }
}

interface PanController {
  nudge: (dx: number, dy: number) => void;
}

/**
 * Hold-to-pan gesture. Triggers when:
 *   - Space is held (transient, like Figma / Illustrator), or
 *   - the rail's pan-lock toggle is on.
 */
function installPanGesture(
  root: HTMLElement,
  getController: () => PanController
) {
  let spaceHeld = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const isPanModeActive = () => spaceHeld || store.getState().panLocked;

  const updateCursor = () => {
    if (dragging) root.dataset.pan = 'grabbing';
    else if (isPanModeActive()) root.dataset.pan = 'grab';
    else delete root.dataset.pan;
  };

  document.addEventListener('keydown', e => {
    if (e.code !== 'Space') return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    // Don't hijack Space-scroll inside an open <dialog> (picker, settings,
    // help) — Space is also "page-down" in modals.
    if (target.closest('dialog[open]')) return;
    if (!spaceHeld) {
      spaceHeld = true;
      updateCursor();
    }
    e.preventDefault();
  });
  document.addEventListener('keyup', e => {
    if (e.code !== 'Space') return;
    spaceHeld = false;
    updateCursor();
  });

  root.addEventListener('pointerdown', e => {
    if (!isPanModeActive() || e.button !== 0) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    root.setPointerCapture(e.pointerId);
    updateCursor();
    e.preventDefault();
  });
  root.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    getController().nudge(dx, dy);
  });
  root.addEventListener('pointerup', e => {
    if (!dragging) return;
    dragging = false;
    try {
      root.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    updateCursor();
  });

  store.subscribe(() => updateCursor());
}
