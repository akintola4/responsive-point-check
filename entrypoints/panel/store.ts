/**
 * Single-device state. Only one device is shown in the canvas at a time —
 * the device picker switches the active device instead of adding to a list.
 *
 * Persisted to chrome.storage.local on a 300ms debounce.
 */

import { DEFAULT_DEVICE_ID, DEVICES_BY_ID, type Device } from '../../lib/devices';

export type Orientation = 'portrait' | 'landscape';
/** 'fit' = auto-zoom so the active device fills the canvas with margin. */
export type Zoom = 'fit' | number;
export type CanvasBg =
  | 'dots'
  | 'grid'
  | 'solid'
  | 'lines'
  | 'blueprint'
  | 'plus'
  | 'gradient';

/** User-defined viewport saved under "My devices". */
export interface CustomDevice {
  id: string;
  name: string;
  width: number;
  height: number;
}

export interface State {
  url: string;
  activeDeviceId: string;
  orientation: Orientation;
  zoom: Zoom;
  theme: 'dark' | 'light' | 'auto';
  syncScroll: boolean;
  /** Show the device bezel/mockup; when false, the iframe sits in a plain rect. */
  showBezel: boolean;
  /** Render a fake browser chrome bar (URL bar / address bar) over the iframe. */
  showBrowserChrome: boolean;
  /** Hide scrollbars inside the previewed website (injected via frame-bridge). */
  hideScrollbars: boolean;
  /** When true, click-drag pans the canvas without needing to hold space. */
  panLocked: boolean;
  /** Background pattern of the canvas. */
  canvasBg: CanvasBg;
  /** When opening the panel from the action click, override the saved
   *  device with this one instead. 'last-used' = whatever was active. */
  defaultDeviceId: string | 'last-used';
  /** Vertical breakpoint guides overlaid on the canvas (640/768/1024/1280). */
  showBreakpointGuides: boolean;
  /** Recently used built-in or custom device IDs (most recent first, max 6). */
  recentDeviceIds: string[];
  /** Last N URLs visited (most recent first, max 10). Powers <datalist>. */
  urlHistory: string[];
  /** User-defined custom viewports. */
  customDevices: CustomDevice[];
}

type Mutation = Partial<State>;

const STORAGE_KEY = 'rpc.state.v2';

const defaultState: State = {
  url: '',
  activeDeviceId: DEFAULT_DEVICE_ID,
  orientation: 'portrait',
  zoom: 'fit',
  theme: 'auto',
  syncScroll: false,
  showBezel: true,
  showBrowserChrome: true,
  hideScrollbars: true,
  panLocked: false,
  canvasBg: 'dots',
  defaultDeviceId: 'last-used',
  showBreakpointGuides: false,
  recentDeviceIds: [],
  urlHistory: [],
  customDevices: [],
};

export function resetState() {
  const prev = state;
  state = structuredClone(defaultState);
  // Pass the real previous state so subscribers' diff-skip logic actually
  // sees the change (otherwise prev === next and they'd no-op).
  listeners.forEach(l => l(state, prev));
  if (saveTimer) clearTimeout(saveTimer);
  void chrome.storage.local.set({ [STORAGE_KEY]: state });
}

let state: State = structuredClone(defaultState);
const listeners = new Set<(s: State, prev: State) => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function loadState(initialUrl: string): Promise<State> {
  try {
    const got = await chrome.storage.local.get(STORAGE_KEY);
    const stored = got[STORAGE_KEY] as Partial<State> | undefined;
    if (stored) state = { ...state, ...stored };
  } catch (err) {
    // chrome.storage may not be available in some preview contexts; or
    // a quota error here means the user's settings won't persist this
    // session. Surface it once instead of silently swallowing.
    console.warn('[rpc] failed to load persisted state:', err);
  }
  // Prune stale device references — the built-in catalog or the user's
  // custom devices may have changed since the last save.
  if (!resolveDevice(state.activeDeviceId)) {
    state.activeDeviceId = DEFAULT_DEVICE_ID;
  }
  state.recentDeviceIds = state.recentDeviceIds.filter(id =>
    resolveDevice(id)
  );
  if (initialUrl) state.url = initialUrl;
  return state;
}

export function getState(): State {
  return state;
}

/** Apply a partial mutation. Listeners receive both the new and previous state
 *  so they can diff and skip work that didn't actually change. */
export function update(patch: Mutation) {
  const prev = state;
  state = { ...state, ...patch };
  listeners.forEach(l => l(state, prev));
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void chrome.storage.local.set({ [STORAGE_KEY]: state });
  }, 300);
}

export function subscribe(fn: (s: State, prev: State) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const RECENTS_MAX = 6;
const URL_HISTORY_MAX = 10;

export function setActive(deviceId: string) {
  if (!resolveDevice(deviceId)) return;
  const recents = [
    deviceId,
    ...state.recentDeviceIds.filter(id => id !== deviceId),
  ].slice(0, RECENTS_MAX);
  update({
    activeDeviceId: deviceId,
    orientation: 'portrait',
    recentDeviceIds: recents,
  });
}

/** Look up either a built-in device or a custom one — both returned in the
 *  Device shape so callers don't need to special-case. Custom devices use
 *  the borderless `monitor` bezel and slot into the `laptop` category. */
export function resolveDevice(id: string): Device | undefined {
  if (DEVICES_BY_ID[id]) return DEVICES_BY_ID[id];
  const c = state.customDevices.find(c => c.id === id);
  if (!c) return undefined;
  return {
    id: c.id,
    name: c.name,
    category: 'laptop',
    width: c.width,
    height: c.height,
    dpr: 1,
    bezel: 'monitor',
  };
}

export function pushUrlHistory(url: string) {
  if (!url) return;
  const next = [url, ...state.urlHistory.filter(u => u !== url)].slice(
    0,
    URL_HISTORY_MAX
  );
  update({ urlHistory: next });
}

export function addCustomDevice(d: CustomDevice) {
  update({ customDevices: [...state.customDevices, d] });
}

export function removeCustomDevice(id: string) {
  update({
    customDevices: state.customDevices.filter(c => c.id !== id),
    recentDeviceIds: state.recentDeviceIds.filter(r => r !== id),
  });
}

export function rotate() {
  update({
    orientation: state.orientation === 'portrait' ? 'landscape' : 'portrait',
  });
}

export function setZoom(z: Zoom) {
  if (typeof z === 'number') {
    update({ zoom: clamp(z, 0.1, 2) });
  } else {
    update({ zoom: z });
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
