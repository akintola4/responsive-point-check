import { loadBezel, preloadBezels } from '../../lib/bezel-asset';
import { DEVICES } from '../../lib/devices';
import { createCanvas } from './canvas';
import { h } from './h';
import { installKeyboardShortcuts } from './keyboard';
import { createRightRail } from './right-rail';
import { getState, loadState, pushUrlHistory, subscribe } from './store';
import { createToolbar } from './toolbar';
import { installTooltip } from './tooltip';

(async () => {
  // The host page is panel.html, which always defines #app. If it's
  // missing something has gone deeply wrong (likely WXT mis-build) — fail
  // loudly instead of silently subscribing to a store backing nothing.
  const root = document.getElementById('app');
  if (!root) {
    console.error('[rpc] #app root not found — bootstrap aborted');
    return;
  }

  const params = new URLSearchParams(location.search);
  const initialUrl = params.get('url') ?? '';

  // Bezels are inlined as SVG so they pick up the theme via currentColor.
  // Preload kind-defaults + any per-device overrides before mounting.
  const overrideSrcs = DEVICES.map(d => d.bezelSrc).filter(
    (s): s is string => typeof s === 'string'
  );
  await Promise.all([
    preloadBezels(),
    ...overrideSrcs.map(loadBezel),
  ]);

  await loadState(initialUrl);
  if (initialUrl) {
    // Make ?url=… visits show up in the URL bar's history dropdown.
    pushUrlHistory(initialUrl);
  }
  applyTheme(getState().theme);
  applyCanvasBg(getState().canvasBg);
  applyBreakpointGuides(getState().showBreakpointGuides);

  subscribe(s => {
    applyTheme(s.theme);
    applyCanvasBg(s.canvasBg);
    applyBreakpointGuides(s.showBreakpointGuides);
  });

  // Re-resolve auto theme when the OS appearance flips.
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getState().theme === 'auto') applyTheme('auto');
  });

  installTooltip();
  root.append(
    h(
      'div',
      { class: 'shell' },
      createToolbar(),
      h('div', { class: 'shell__body' }, createCanvas(), createRightRail())
    )
  );
  installKeyboardShortcuts();
})();

function applyTheme(theme: 'auto' | 'light' | 'dark') {
  if (theme === 'auto') {
    const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.dataset.theme = prefersDark ? 'dark' : 'light';
  } else {
    document.body.dataset.theme = theme;
  }
}

function applyCanvasBg(bg: string) {
  document.body.dataset.canvasBg = bg;
}

function applyBreakpointGuides(show: boolean) {
  document.body.dataset.showGuides = show ? 'yes' : 'no';
}
