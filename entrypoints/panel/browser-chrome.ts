/**
 * Renders fake browser chrome over each device.
 *
 * Returns optional top + bottom slot elements with their pixel heights so
 * the frame can shrink the iframe accordingly. iOS Safari puts the
 * address bar at the bottom (matches iOS 15+ default); Android Chrome
 * stacks status bar + URL bar at the top; desktop shows a single bar at
 * the top.
 */

import type { BezelKind } from '../../lib/devices';
import { h } from './h';

export interface ChromeMount {
  topEl: HTMLElement | null;
  bottomEl: HTMLElement | null;
  topHeight: number;
  bottomHeight: number;
}

export function buildBrowserChrome(
  bezel: BezelKind,
  url: string,
  screenWidth?: number
): ChromeMount | null {
  switch (bezel) {
    case 'phone-island':
    case 'phone-notch':
    case 'phone-home':
      return iosChrome(url);
    case 'phone-classic':
      return androidChrome(url);
    case 'tablet':
      return iosChrome(url);
    case 'laptop':
    case 'monitor':
      return desktopChrome(url, screenWidth ?? 1440);
  }
}

function formatHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url || 'about:blank';
  }
}

/* ------------------------------------------------------------------ iOS */
function iosChrome(url: string): ChromeMount {
  const host = formatHost(url);

  // Top: status bar (time + signal/wifi/battery glyphs).
  const topEl = h(
    'div',
    { class: 'chrome chrome--ios-status' },
    h('span', { class: 'chrome__time' }, '10:34'),
    h(
      'span',
      { class: 'chrome__statusicons' },
      h('span', {
        html: '<svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor"><rect x="0" y="6" width="2" height="4" rx="0.5"/><rect x="3.5" y="4" width="2" height="6" rx="0.5"/><rect x="7" y="2" width="2" height="8" rx="0.5"/><rect x="10.5" y="0" width="2" height="10" rx="0.5"/></svg>',
      }),
      h('span', {
        html: '<svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" stroke-width="1"><path d="M1 4a8.5 8.5 0 0 1 12 0M3 6a5.5 5.5 0 0 1 8 0M5 8a2.5 2.5 0 0 1 4 0"/></svg>',
      }),
      h('span', {
        html: '<svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="18" height="9" rx="2"/><rect x="2" y="2" width="15" height="6" rx="1" fill="currentColor"/><rect x="19.5" y="3.5" width="1.5" height="3" rx="0.5" fill="currentColor"/></svg>',
      })
    )
  );

  // Bottom: single rounded pill (AA · lock+host · reload) + toolbar + home indicator.
  const bottomEl = h(
    'div',
    { class: 'chrome chrome--ios-bottom' },
    h(
      'div',
      { class: 'chrome__urlbar' },
      h('span', { class: 'chrome__aa' }, 'AA'),
      h(
        'span',
        { class: 'chrome__url-inner' },
        h('span', {
          class: 'chrome__lock',
          html: '<svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M5 8V6a3 3 0 0 1 6 0v2h1v6H4V8h1zm1 0h4V6a2 2 0 0 0-4 0v2z"/></svg>',
        }),
        h('span', { class: 'chrome__host' }, host)
      ),
      iconButton(
        'reload',
        '<path d="M14.5 4v3.2h-3.2"/><path d="M14.5 7.2A5.6 5.6 0 1 0 15.6 11.5"/>'
      )
    ),
    h(
      'div',
      { class: 'chrome__toolbar' },
      iconButton('back',     '<path d="M12 4 6 10l6 6"/>'),
      iconButton('forward',  '<path d="M8 4l6 6-6 6"/>'),
      iconButton('share',    '<path d="M10 3v10M6.5 6.5 10 3l3.5 3.5M4 11v5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5"/>'),
      iconButton('book',     '<path d="M10 5.5v10"/><path d="M10 5.5H5.5a2 2 0 0 0-2 2v7.5h6.5"/><path d="M10 5.5h4.5a2 2 0 0 1 2 2v7.5h-6.5"/>'),
      iconButton('tabs',     '<rect x="3" y="3" width="10.5" height="10.5" rx="2.2"/><rect x="6.5" y="6.5" width="10.5" height="10.5" rx="2.2"/>')
    ),
    h('div', { class: 'chrome__home-indicator' })
  );

  return { topEl, bottomEl, topHeight: 22, bottomHeight: 114 };
}

/* -------------------------------------------------------------- Android */
function androidChrome(url: string): ChromeMount {
  const host = formatHost(url);
  const topEl = h(
    'div',
    { class: 'chrome chrome--android' },
    h(
      'div',
      { class: 'chrome__statusbar' },
      h('span', { class: 'chrome__time' }, '10:34'),
      h(
        'span',
        { class: 'chrome__statusicons' },
        h('span', { class: 'chrome__statusicon' }, '∙∙∙∙'),
        h('span', { class: 'chrome__statusicon' }, '◢'),
        h('span', { class: 'chrome__battery' }, '100%')
      )
    ),
    h(
      'div',
      { class: 'chrome__urlbar' },
      iconButton('home', '<path d="M3 8l7-6 7 6v8H3z"/>'),
      h(
        'div',
        { class: 'chrome__url' },
        h('span', {
          class: 'chrome__lock',
          html: '<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M5 8V6a3 3 0 0 1 6 0v2h1v6H4V8h1zm1 0h4V6a2 2 0 0 0-4 0v2z"/></svg>',
        }),
        h('span', { class: 'chrome__host' }, host)
      ),
      h('span', { class: 'chrome__tabcount' }, '1'),
      iconButton(
        'menu',
        '<circle cx="10" cy="4" r="1"/><circle cx="10" cy="10" r="1"/><circle cx="10" cy="16" r="1"/>'
      )
    )
  );
  return { topEl, bottomEl: null, topHeight: 64, bottomHeight: 0 };
}

/* -------------------------------------------------------------- Desktop */
function desktopChrome(url: string, screenWidth: number): ChromeMount {
  const host = formatHost(url);
  // Scale chrome height with viewport so it doesn't disappear on big displays.
  // 1440-wide laptops use the canonical 52px; a 4K monitor scales up
  // proportionally so the bar feels balanced.
  const topHeight = Math.max(52, Math.round(screenWidth * 0.036));
  const topEl = h(
    'div',
    { class: 'chrome chrome--desktop' },
    h(
      'div',
      { class: 'chrome__lights' },
      h('span', { class: 'chrome__light chrome__light--close' }),
      h('span', { class: 'chrome__light chrome__light--min' }),
      h('span', { class: 'chrome__light chrome__light--max' })
    ),
    h(
      'div',
      { class: 'chrome__nav' },
      iconButton(
        'sidebar',
        '<rect x="2" y="3" width="16" height="14" rx="1.5"/><line x1="8" y1="3" x2="8" y2="17"/>'
      ),
      iconButton('chevron-down', '<path d="M5 8l5 5 5-5"/>'),
      h('span', { class: 'chrome__divider' }),
      iconButton('back', '<path d="M12 4 6 10l6 6"/>'),
      iconButton('forward', '<path d="M8 4l6 6-6 6"/>')
    ),
    h(
      'div',
      { class: 'chrome__urlfield' },
      h('span', {
        class: 'chrome__lock',
        html: '<svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M5 8V6a3 3 0 0 1 6 0v2h1v6H4V8h1zm1 0h4V6a2 2 0 0 0-4 0v2z"/></svg>',
      }),
      h('span', { class: 'chrome__host' }, host)
    ),
    h(
      'div',
      { class: 'chrome__actions' },
      iconButton('upload', '<path d="M10 14V4M6 8l4-4 4 4M3 16h14"/>'),
      iconButton('plus', '<path d="M10 4v12M4 10h12"/>'),
      iconButton(
        'copy',
        '<rect x="3" y="3" width="11" height="11" rx="1.5"/><rect x="6" y="6" width="11" height="11" rx="1.5"/>'
      )
    )
  );
  return { topEl, bottomEl: null, topHeight, bottomHeight: 0 };
}

function iconButton(label: string, path: string): HTMLElement {
  return h(
    'button',
    { class: `chrome__btn chrome__btn--${label}`, type: 'button', tabindex: '-1' },
    h('span', {
      html: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`,
    })
  );
}
