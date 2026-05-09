/**
 * Asset-based device bezels.
 *
 * Each `BezelKind` ships with a default SVG in `public/bezels/<kind>.svg`.
 * The SVG draws the device frame (rounded body + accents like notch / lens
 * / home button); the iframe is layered over the screen cutout via CSS
 * positioning.
 *
 * To upgrade a device's mockup quality, drop a per-device SVG into
 * `public/bezels/<id>.svg` and set `bezelSrc` on its `Device` entry.
 *
 * Rationale: see "Bundle locally" discussion — bundled artwork keeps
 * device switching instant and the extension working offline / behind
 * proxies. No host_permissions required for any third-party CDN.
 */

import type { BezelKind } from './devices';

/* ------------------------------------------------------------------------
   Preload + cache of bezel SVG markup.
   `<img>` doesn't inherit currentColor into its embedded SVG, so we fetch
   the SVG text once and inline it into the DOM (giving the artwork access
   to the theme's colour tokens via `currentColor`).
   ------------------------------------------------------------------------ */

const bezelCache = new Map<string, string>();
const ALL_KINDS: BezelKind[] = [
  'phone-island',
  'phone-notch',
  'phone-classic',
  'phone-home',
  'tablet',
  'laptop',
  'monitor',
];

export async function preloadBezels(): Promise<void> {
  await Promise.all(
    ALL_KINDS.map(kind => loadBezel(`bezels/${kind}.svg`))
  );
}

/** Fetch + cache a bezel SVG by its public/-relative path. */
export async function loadBezel(src: string): Promise<string> {
  const url = chrome.runtime.getURL(src);
  const cached = bezelCache.get(url);
  if (cached !== undefined) return cached;
  try {
    const text = await fetch(url).then(r => r.text());
    bezelCache.set(url, text);
    return text;
  } catch {
    bezelCache.set(url, '');
    return '';
  }
}

/** Synchronous lookup — only safe after `preloadBezels` has resolved.
 *  Returns the inlined SVG markup for a kind-default or per-device
 *  artwork; empty string if the file isn't in the cache. */
export function getBezelSvg(src: string): string {
  return bezelCache.get(chrome.runtime.getURL(src)) ?? '';
}


/** Bezel padding around the iframe for each kind.
 *
 *  Two modes are supported per side:
 *    - Absolute pixels (`top`, `right`, `bottom`, `left`)
 *    - Ratio of the iframe's dimension (`topRatio`, etc.)
 *
 *  Ratios are critical for kinds whose artwork has a specific aspect
 *  ratio. Storing the artwork's natural padding as a ratio of its inner
 *  screen rect means the artwork always stretches uniformly enough that
 *  the iframe fits exactly inside the rendered screen area — no
 *  height-overshadow at any device viewport.
 *
 *  Same idea for `radius` vs `radiusRatio`.
 */
const BEZEL_PADDING: Record<
  BezelKind,
  {
    top?: number; right?: number; bottom?: number; left?: number;
    topRatio?: number; rightRatio?: number; bottomRatio?: number; leftRatio?: number;
    radius?: number;
    radiusRatio?: number;
  }
> = {
  // phone-island uses iphone16pro artwork (1300×2642 canvas, body 1280
   // wide centered with rx=210). Ratios calibrated to leave ~14-18px of
   // visible black bezel around the iframe at every Pro/Pro-Max viewport.
  // phone-* and tablet ratios deliberately exceed the artwork's drawn
  // bezel so the iframe sits well inside the body, leaving a visible
  // black "matte" frame around the website content. Without this the
  // iframe fills the entire device face and the SVG silhouette
  // disappears behind the website. Larger top + bottom padding gives
  // breathing room for the chrome bars without crowding the rounded
  // device corners.
  'phone-island': {
    topRatio:    32  / 874,   // ~32px above status bar
    bottomRatio: 38  / 874,   // ~38px below home indicator
    leftRatio:   22  / 402,
    rightRatio:  22  / 402,
    radiusRatio: 50  / 402,
  },
  'phone-notch': {
    topRatio:    28  / 848,
    bottomRatio: 36  / 848,
    leftRatio:   20  / 407,
    rightRatio:  20  / 407,
    radiusRatio: 50  / 407,
  },
  'phone-classic': {
    topRatio:    28  / 850,
    bottomRatio: 36  / 850,
    leftRatio:   18  / 410,
    rightRatio:  22  / 410,
    radiusRatio: 50  / 410,
  },
  // phone-home (iPhone SE-era placeholder) — absolute padding.
  'phone-home': { top: 60, right: 14, bottom: 60, left: 14, radius: 4 },
  // Tablet — equal absolute padding all four sides (iPads have ~5-6mm
  // even bezel around the screen; absolute values keep visual rhythm
  // consistent across iPad mini / Air / Pro 11 / Pro 13).
  tablet: { top: 56, right: 50, bottom: 56, left: 50, radius: 36 },
  // Laptop — macbook.svg natural width 2032.8 with rx=32 inner.
  laptop: {
    top: 10, right: 180, bottom: 60, left: 180,
    radius: 22,
    radiusRatio: 32 / 2032.8,
  },
  // Monitor — Pro Display XDR natural width 3082 with rx=20.
  monitor: {
    top: 0, right: 0, bottom: 320, left: 0,
    radius: 20,
    radiusRatio: 20 / 3082,
  },
};

export interface BezelLayout {
  /** Path under public/ to the bezel artwork. */
  src: string;
  /** Total wrapper dimensions = iframe + padding. */
  outerWidth: number;
  outerHeight: number;
  /** Where the iframe sits inside the wrapper. */
  screen: {
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
  };
}

/**
 * Compute the bezel layout for a device at a given orientation.
 *
 * Two modes:
 *  - **Default**: kind-level padding constants. iframe = device intrinsic
 *    dimensions; bezel artwork wraps it.
 *  - **Per-device override**: the device supplies its own `bezelLayout`
 *    (used when the artwork's screen cutout sits at custom coordinates).
 *    For landscape, dimensions and screen rect are reflected to keep the
 *    notch/buttons on the rotated edges.
 */
export function buildBezelLayout(
  bezel: BezelKind,
  screenWidth: number,
  screenHeight: number,
  orientation: 'portrait' | 'landscape',
  override?: {
    src?: string;
    layout?: {
      outerWidth: number;
      outerHeight: number;
      screen: {
        x: number;
        y: number;
        width: number;
        height: number;
        radius: number;
      };
    };
  }
): BezelLayout {
  const src = override?.src ?? `bezels/${bezel}.svg`;
  const isLandscape = orientation === 'landscape';

  if (override?.layout) {
    const o = override.layout;
    if (!isLandscape) {
      return { src, ...o };
    }
    // Landscape: swap outer dimensions, reflect the screen rect.
    return {
      src,
      outerWidth: o.outerHeight,
      outerHeight: o.outerWidth,
      screen: {
        x: o.screen.y,
        y: o.outerWidth - (o.screen.x + o.screen.width),
        width: o.screen.height,
        height: o.screen.width,
        radius: o.screen.radius,
      },
    };
  }


  const w = isLandscape ? screenHeight : screenWidth;
  const h = isLandscape ? screenWidth : screenHeight;
  const p = BEZEL_PADDING[bezel];

  // Resolve each side: prefer the ratio (proportional to viewport) over a
  // fixed pixel value. Ratios make the iframe fit the artwork's natural
  // screen rect exactly, no matter the device aspect.
  const portraitTop    = p.topRatio    !== undefined ? Math.round(h * p.topRatio)    : p.top    ?? 0;
  const portraitBottom = p.bottomRatio !== undefined ? Math.round(h * p.bottomRatio) : p.bottom ?? 0;
  const portraitLeft   = p.leftRatio   !== undefined ? Math.round(w * p.leftRatio)   : p.left   ?? 0;
  const portraitRight  = p.rightRatio  !== undefined ? Math.round(w * p.rightRatio)  : p.right  ?? 0;

  // Rotate the resolved padding 90° for landscape (top→left, right→top, …).
  const top    = isLandscape ? portraitLeft   : portraitTop;
  const right  = isLandscape ? portraitTop    : portraitRight;
  const bottom = isLandscape ? portraitRight  : portraitBottom;
  const left   = isLandscape ? portraitBottom : portraitLeft;

  const radius =
    p.radiusRatio !== undefined
      ? Math.round(w * p.radiusRatio)
      : p.radius ?? 0;

  return {
    src,
    outerWidth: w + left + right,
    outerHeight: h + top + bottom,
    screen: { x: left, y: top, width: w, height: h, radius },
  };
}
