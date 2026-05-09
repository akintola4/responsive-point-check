export type DeviceCategory = 'apple-phone' | 'android-phone' | 'tablet' | 'laptop';

/**
 * Bezel kind drives a CSS-only device chrome — no per-device SVG asset needed.
 *  - phone-island   — rounded with Apple-style dynamic island (iPhone 14 Pro+)
 *  - phone-notch    — rounded with classic notch (iPhone X..13)
 *  - phone-classic  — rounded plain (Pixel, Galaxy, OnePlus)
 *  - phone-home     — rounded with home button (iPhone SE, older)
 *  - tablet         — thin uniform bezel (iPad, Galaxy Tab)
 *  - laptop         — thin top bezel + base hump (MacBook style)
 *  - monitor        — minimal aluminium-edge (Studio Display, generic desktops)
 */
export type BezelKind =
  | 'phone-island'
  | 'phone-notch'
  | 'phone-classic'
  | 'phone-home'
  | 'tablet'
  | 'laptop'
  | 'monitor';

export interface Device {
  id: string;
  name: string;
  category: DeviceCategory;
  /** CSS pixel viewport width in portrait orientation. */
  width: number;
  /** CSS pixel viewport height in portrait orientation. */
  height: number;
  dpr: number;
  bezel: BezelKind;
  /**
   * Optional path under public/ to a bespoke device-specific SVG.
   * When omitted, the kind-default at `bezels/<bezel>.svg` is used.
   */
  bezelSrc?: string;
  /**
   * Optional per-device layout override. Required when supplying a custom
   * `bezelSrc` whose proportions differ from the kind defaults — gives
   * the iframe its exact pixel position inside the artwork.
   *
   * Coordinates are in the SVG's own px space (matching its viewBox).
   */
  bezelLayout?: {
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

export const DEVICES: Device[] = [
  // ----------------------------------------------------------- Apple Phones
  {
    id: 'iphone-se',
    name: 'iPhone SE',
    category: 'apple-phone',
    width: 375,
    height: 667,
    dpr: 2,
    bezel: 'phone-home',
    bezelSrc: 'bezels/iphone-se.svg',
    bezelLayout: {
      outerWidth: 427,
      outerHeight: 858,
      screen: { x: 26, y: 95, width: 375, height: 667, radius: 4 },
    },
  },
  {
    id: 'iphone-11-pro',
    name: 'iPhone 11 Pro',
    category: 'apple-phone',
    width: 375,
    height: 812,
    dpr: 3,
    bezel: 'phone-notch',
    // Same outer artwork dimensions as iPhone SE in this pack; thinner top
    // and bottom bezels because it's a notched edge-to-edge display.
    bezelSrc: 'bezels/iphone-11-pro.svg',
    bezelLayout: {
      outerWidth: 427,
      outerHeight: 858,
      screen: { x: 26, y: 23, width: 375, height: 812, radius: 40 },
    },
  },
  // iPhone 12 mini — uses iphone-12-mini.svg (artwork 423×858, screen
  // at (24, 23, 375, 812)). Scale viewport 360/375 = 0.96.
  {
    id: 'iphone-12-mini',
    name: 'iPhone 12 mini',
    category: 'apple-phone',
    width: 360,
    height: 780,
    dpr: 3,
    bezel: 'phone-notch',
    bezelSrc: 'bezels/iphone-12-mini.svg',
    bezelLayout: {
      outerWidth: 410,
      outerHeight: 824,
      screen: { x: 25, y: 22, width: 360, height: 780, radius: 40 },
    },
  },
  { id: 'iphone-13',           name: 'iPhone 13',            category: 'apple-phone', width: 390, height: 844, dpr: 3, bezel: 'phone-notch' },
  { id: 'iphone-14',           name: 'iPhone 14',            category: 'apple-phone', width: 390, height: 844, dpr: 3, bezel: 'phone-notch' },
  // iPhone 14 Plus — large notch design. Uses iphone-12-pro-max.svg
  // (artwork 423×858, screen ~(24, 23, 375, 812)). Scale 428/375 = 1.14.
  {
    id: 'iphone-14-plus',
    name: 'iPhone 14 Plus',
    category: 'apple-phone',
    width: 428,
    height: 926,
    dpr: 3,
    bezel: 'phone-notch',
    bezelSrc: 'bezels/iphone-12-pro-max.svg',
    bezelLayout: {
      outerWidth: 482,
      outerHeight: 978,
      screen: { x: 30, y: 26, width: 428, height: 926, radius: 46 },
    },
  },
  { id: 'iphone-14-pro',       name: 'iPhone 14 Pro',        category: 'apple-phone', width: 393, height: 852, dpr: 3, bezel: 'phone-island' },
  { id: 'iphone-14-pro-max',   name: 'iPhone 14 Pro Max',    category: 'apple-phone', width: 430, height: 932, dpr: 3, bezel: 'phone-island' },
  { id: 'iphone-15',           name: 'iPhone 15',            category: 'apple-phone', width: 393, height: 852, dpr: 3, bezel: 'phone-island' },
  { id: 'iphone-15-plus',      name: 'iPhone 15 Plus',       category: 'apple-phone', width: 430, height: 932, dpr: 3, bezel: 'phone-island' },
  { id: 'iphone-15-pro',       name: 'iPhone 15 Pro',        category: 'apple-phone', width: 393, height: 852, dpr: 3, bezel: 'phone-island' },
  { id: 'iphone-15-pro-max',   name: 'iPhone 15 Pro Max',    category: 'apple-phone', width: 430, height: 932, dpr: 3, bezel: 'phone-island' },
  { id: 'iphone-16',           name: 'iPhone 16',            category: 'apple-phone', width: 393, height: 852, dpr: 3, bezel: 'phone-island' },
  { id: 'iphone-16-pro',       name: 'iPhone 16 Pro',        category: 'apple-phone', width: 402, height: 874, dpr: 3, bezel: 'phone-island' },
  { id: 'iphone-16-pro-max',   name: 'iPhone 16 Pro Max',    category: 'apple-phone', width: 440, height: 956, dpr: 3, bezel: 'phone-island' },
  // iPhone 17 Pro — uses dedicated iphone-17-pro.svg artwork (1280×2642
  // body with rx=210, twin-lens orange/coral accent on the back). Iframe
  // sits within the inner screen rect at (55, 55, 1170, 2532) per the
  // artwork's white "screen" rectangle. Scale: 402 / 1170 = 0.3436.
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
  },
  {
    id: 'iphone-17-pro-max',
    name: 'iPhone 17 Pro Max',
    category: 'apple-phone',
    width: 440,
    height: 956,
    dpr: 3,
    bezel: 'phone-island',
    bezelSrc: 'bezels/iphone-17-pro.svg',
    bezelLayout: {
      outerWidth: 482,
      outerHeight: 994,
      screen: { x: 21, y: 21, width: 440, height: 956, radius: 60 },
    },
  },

  // --------------------------------------------------------- Android Phones
  { id: 'pixel-6',             name: 'Pixel 6',              category: 'android-phone', width: 412, height: 915, dpr: 2.625, bezel: 'phone-classic' },
  { id: 'pixel-7',             name: 'Pixel 7',              category: 'android-phone', width: 412, height: 915, dpr: 2.625, bezel: 'phone-classic' },
  { id: 'pixel-7-pro',         name: 'Pixel 7 Pro',          category: 'android-phone', width: 412, height: 892, dpr: 3.5,   bezel: 'phone-classic' },
  { id: 'pixel-8',             name: 'Pixel 8',              category: 'android-phone', width: 412, height: 915, dpr: 2.625, bezel: 'phone-classic' },
  { id: 'pixel-8-pro',         name: 'Pixel 8 Pro',          category: 'android-phone', width: 448, height: 998, dpr: 3,     bezel: 'phone-classic' },
  { id: 'pixel-9',             name: 'Pixel 9',              category: 'android-phone', width: 412, height: 915, dpr: 2.625, bezel: 'phone-classic' },
  { id: 'pixel-9-pro',         name: 'Pixel 9 Pro',          category: 'android-phone', width: 412, height: 915, dpr: 3,     bezel: 'phone-classic' },
  { id: 'galaxy-s22',          name: 'Galaxy S22',           category: 'android-phone', width: 360, height: 780, dpr: 3,     bezel: 'phone-classic' },
  { id: 'galaxy-s23',          name: 'Galaxy S23',           category: 'android-phone', width: 360, height: 780, dpr: 3,     bezel: 'phone-classic' },
  { id: 'galaxy-s24',          name: 'Galaxy S24',           category: 'android-phone', width: 384, height: 854, dpr: 3,     bezel: 'phone-classic' },
  { id: 'galaxy-s24-ultra',    name: 'Galaxy S24 Ultra',     category: 'android-phone', width: 412, height: 915, dpr: 3.5,   bezel: 'phone-classic' },
  { id: 'oneplus-11',          name: 'OnePlus 11',           category: 'android-phone', width: 412, height: 919, dpr: 3,     bezel: 'phone-classic' },

  // ------------------------------------------------------------------ Tablets
  // iPads use the dedicated ipad.svg (633×908). The kind-default tablet
  // padding (50/56px absolute) handles the visible bezel.
  { id: 'ipad-mini-6',         name: 'iPad mini',            category: 'tablet', width: 744,  height: 1133, dpr: 2, bezel: 'tablet', bezelSrc: 'bezels/ipad.svg' },
  { id: 'ipad-air-11',         name: 'iPad Air 11"',         category: 'tablet', width: 820,  height: 1180, dpr: 2, bezel: 'tablet', bezelSrc: 'bezels/ipad.svg' },
  { id: 'ipad-pro-11',         name: 'iPad Pro 11"',         category: 'tablet', width: 834,  height: 1194, dpr: 2, bezel: 'tablet', bezelSrc: 'bezels/ipad.svg' },
  { id: 'ipad-pro-13',         name: 'iPad Pro 13"',         category: 'tablet', width: 1024, height: 1366, dpr: 2, bezel: 'tablet', bezelSrc: 'bezels/ipad.svg' },
  { id: 'galaxy-tab-s9',       name: 'Galaxy Tab S9',        category: 'tablet', width: 800,  height: 1280, dpr: 2, bezel: 'tablet' },

  // ------------------------------------------------------------------ Laptops
  {
    id: 'macbook',
    name: 'MacBook',
    category: 'laptop',
    width: 1440,
    height: 940,
    dpr: 2,
    bezel: 'laptop', // bezels/laptop.svg is the macbook artwork (kind default)
  },
  // Surface Laptop 13.5" — viewport 1504×1003 matches the artwork's screen
  // aspect (1.499) almost exactly. Lid: (180, 21)→1128×754, scale 1.333.
  {
    id: 'surface-laptop',
    name: 'Surface Laptop 13.5"',
    category: 'laptop',
    width: 1504,
    height: 1003,
    dpr: 1.5,
    bezel: 'laptop',
    bezelSrc: 'bezels/surface-laptop.svg',
    bezelLayout: {
      outerWidth: 1984,
      outerHeight: 1108,
      screen: { x: 240, y: 28, width: 1504, height: 1003, radius: 5 },
    },
  },
  // MacBook Air — uses the new high-fidelity Sky Blue M4 artwork
  // (2048×1241 viewBox; lid path with rx=61 from x=167.97 to 1881.82,
  // y=0 to ~1145.26; inner screen rect (178.75, 10.78)→(1871.04, 1147.06),
  // i.e. 1692×1136 inside the lid; keyboard hump and feet below).
  // Scale 13": 1280 / 1692.3 = 0.7563. Scale 15": 1456 / 1692.3 = 0.8604.
  {
    id: 'macbook-air-13',
    name: 'MacBook Air 13"',
    category: 'laptop',
    width: 1280,
    height: 832,
    dpr: 2,
    bezel: 'laptop',
    bezelSrc: 'bezels/macbook-air.svg',
    bezelLayout: {
      outerWidth: 1549,
      outerHeight: 938,
      screen: { x: 135, y: 8, width: 1280, height: 832, radius: 6 },
    },
  },
  {
    id: 'macbook-air-15',
    name: 'MacBook Air 15"',
    category: 'laptop',
    width: 1456,
    height: 945,
    dpr: 2,
    bezel: 'laptop',
    bezelSrc: 'bezels/macbook-air.svg',
    bezelLayout: {
      outerWidth: 1762,
      outerHeight: 1068,
      screen: { x: 154, y: 9, width: 1456, height: 945, radius: 7 },
    },
  },
  // MBP 14/16 use the high-fidelity macbook-pro-14.svg artwork.
  // Lid: x=110, y=2, w=997, h=681. Screen above chin: ~y=2 to y=657 (h=655),
  // aspect 1.521 — matches MBP 14/16's 1.539 closely.
  {
    id: 'macbook-pro-14',
    name: 'MacBook Pro 14"',
    category: 'laptop',
    width: 1512,
    height: 982,
    dpr: 2,
    bezel: 'laptop',
    bezelSrc: 'bezels/macbook-pro-14.svg',
    // Scale: 1512 / 997 = 1.516.
    bezelLayout: {
      outerWidth: 1843,
      outerHeight: 1114,
      screen: { x: 167, y: 3, width: 1512, height: 982, radius: 8 },
    },
  },
  {
    id: 'macbook-pro-16',
    name: 'MacBook Pro 16"',
    category: 'laptop',
    width: 1728,
    height: 1117,
    dpr: 2,
    bezel: 'laptop',
    bezelSrc: 'bezels/macbook-pro-14.svg',
    // Same artwork, scaled by 1728 / 997 = 1.733.
    bezelLayout: {
      outerWidth: 2108,
      outerHeight: 1273,
      screen: { x: 191, y: 3, width: 1728, height: 1117, radius: 8 },
    },
  },
  // MacBook Pro 13" (M1 / M2 era, 1280×800). Uses the dedicated
  // macbook-pro-13.svg with chin/keyboard detail. Lid above chin:
  // (105, 2)→871×565, scale 1280/871 = 1.470.
  {
    id: 'macbook-pro-13',
    name: 'MacBook Pro 13"',
    category: 'laptop',
    width: 1280,
    height: 800,
    dpr: 2,
    bezel: 'laptop',
    bezelSrc: 'bezels/macbook-pro-13.svg',
    bezelLayout: {
      outerWidth: 1588,
      outerHeight: 917,
      screen: { x: 154, y: 3, width: 1280, height: 800, radius: 8 },
    },
  },
  { id: 'laptop-1280',         name: 'Laptop 1280',          category: 'laptop', width: 1280, height: 800,  dpr: 1, bezel: 'laptop' },
  { id: 'desktop-1366',        name: 'Desktop 1366',         category: 'laptop', width: 1366, height: 768,  dpr: 1, bezel: 'monitor' },
  { id: 'desktop-1440',        name: 'Desktop 1440',         category: 'laptop', width: 1440, height: 900,  dpr: 1, bezel: 'monitor' },
  { id: 'desktop-1536',        name: 'Desktop 1536',         category: 'laptop', width: 1536, height: 864,  dpr: 1, bezel: 'monitor' },
  { id: 'desktop-1920',        name: 'Desktop 1920',         category: 'laptop', width: 1920, height: 1080, dpr: 1, bezel: 'monitor' },
  {
    id: 'imac-24',
    name: 'iMac 24"',
    category: 'laptop',
    width: 1440,
    height: 997,
    dpr: 2,
    bezel: 'monitor',
    bezelSrc: 'bezels/imac.svg',
    bezelLayout: {
      outerWidth: 1442,
      outerHeight: 1230,
      screen: { x: 1, y: 1, width: 1440, height: 997, radius: 24 },
    },
  },
  {
    id: 'studio-display',
    name: 'Studio Display 27"',
    category: 'laptop',
    width: 2560,
    height: 1440,
    dpr: 2,
    bezel: 'monitor',
    // Pro Display XDR artwork at scale 0.831 (= 2560 / 3082).
    bezelLayout: {
      outerWidth: 2560,
      outerHeight: 1899,
      screen: { x: 0, y: 0, width: 2560, height: 1440, radius: 17 },
    },
  },
  {
    id: 'pro-display-xdr',
    name: 'Pro Display XDR',
    category: 'laptop',
    width: 3008,
    height: 1692,
    dpr: 2,
    bezel: 'monitor',
    // 1:1 with the artwork (scale 0.976 ≈ identity for our purposes).
    bezelLayout: {
      outerWidth: 3008,
      outerHeight: 2232,
      screen: { x: 0, y: 0, width: 3008, height: 1692, radius: 20 },
    },
  },
];

export const DEVICES_BY_ID: Record<string, Device> = Object.fromEntries(
  DEVICES.map(d => [d.id, d])
);

export const CATEGORY_LABELS: Record<DeviceCategory, string> = {
  'apple-phone': 'Apple Phones',
  'android-phone': 'Android Phones',
  tablet: 'Tablets',
  laptop: 'Laptops',
};

export const CATEGORY_ORDER: DeviceCategory[] = [
  'apple-phone',
  'android-phone',
  'tablet',
  'laptop',
];

export const DEFAULT_DEVICE_ID = 'iphone-15-pro';
