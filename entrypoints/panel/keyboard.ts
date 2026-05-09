/**
 * Global keyboard shortcuts for the panel.
 *
 *   R          Rotate active device
 *   [ / ]      Previous / next device in current category
 *   F          Fit to screen
 *   + / -      Zoom in / out (±10%)
 *   1-4        Open device picker on category n (1=Apple, 2=Android, 3=Tablets, 4=Laptops)
 *   D          Open device picker
 *   S          Screenshot — site only
 *   Shift+S    Screenshot — with mockup
 *   ?          Open help
 *
 * Inputs / textareas / contenteditable are ignored so typing in the URL
 * bar or settings fields doesn't trigger shortcuts.
 */

import { CATEGORY_ORDER, DEVICES } from '../../lib/devices';
import { openDevicePicker, setPickerCategory } from './device-picker';
import { openHelp } from './help';
import { captureSiteOnly, captureWithMockup } from './right-rail';
import * as store from './store';

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 2;

export function installKeyboardShortcuts() {
  document.addEventListener('keydown', handler);
}

function handler(e: KeyboardEvent) {
  if (isTypingTarget(e.target)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return; // leave OS shortcuts alone

  const key = e.key;
  const code = e.code;

  switch (key) {
    case 'r': case 'R': store.rotate(); return e.preventDefault();
    case 'f': case 'F': store.setZoom('fit'); return e.preventDefault();
    case 'd': case 'D': openDevicePicker(); return e.preventDefault();
    case '?': openHelp(); return e.preventDefault();
    case '+': case '=': stepZoom(+ZOOM_STEP); return e.preventDefault();
    case '-': case '_': stepZoom(-ZOOM_STEP); return e.preventDefault();
    case '[': cycleDevice(-1); return e.preventDefault();
    case ']': cycleDevice(+1); return e.preventDefault();
    case 's': triggerScreenshot(false); return e.preventDefault();
    case 'S': triggerScreenshot(true); return e.preventDefault();
  }

  // Digit keys → category. Use code to support Shift/numeric layouts.
  if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3' || code === 'Digit4') {
    const idx = Number(code.slice(-1)) - 1;
    const cat = CATEGORY_ORDER[idx];
    if (cat) {
      openDevicePicker();
      setPickerCategory(cat);
      e.preventDefault();
    }
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

function stepZoom(delta: number) {
  const z = store.getState().zoom;
  const current = typeof z === 'number' ? z : 1;
  const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, current + delta));
  store.setZoom(next);
}

function cycleDevice(direction: 1 | -1) {
  const activeId = store.getState().activeDeviceId;
  const active = store.resolveDevice(activeId);
  if (!active) return;
  const peers = DEVICES.filter(d => d.category === active.category);
  if (!peers.length) return;
  const idx = peers.findIndex(d => d.id === active.id);
  // Wrap around the category. If active is custom (not in peers), start at 0.
  const baseIdx = idx === -1 ? 0 : idx;
  const nextIdx = (baseIdx + direction + peers.length) % peers.length;
  const next = peers[nextIdx];
  if (next) store.setActive(next.id);
}

function triggerScreenshot(withMockup: boolean) {
  if (withMockup) void captureWithMockup();
  else void captureSiteOnly();
}
