/**
 * Runs in every cross-origin iframe (necessary because we can't predict the
 * URLs the user types). Stays INERT until the panel sends an `rpc:init`
 * message. Receives:
 *   - rpc:init        — activates the bridge; payload may include settings
 *   - rpc:setScroll   — apply / remove scrollbar-hiding CSS on the document
 *   - rpc:syncScroll  — externally-driven scroll position
 *
 * Outgoing:
 *   - rpc:scroll      — broadcast current scroll position to the panel
 */

const SCROLLBAR_STYLE_ID = '__rpc-scrollbar-style';
const SCROLLBAR_CSS = `
  html::-webkit-scrollbar,
  body::-webkit-scrollbar,
  *::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; }
  html, body, * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
`;

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  runAt: 'document_idle',
  main() {
    if (window.top === window) return;

    let active = false;
    let pending = false;
    let muted = false;

    // Origin check: only accept messages from the panel — i.e. the
    // direct parent window. The panel runs at chrome-extension://EXT_ID;
    // any other script in this iframe (the embedded site itself, a
    // nested iframe, an injected userscript) must NOT be able to drive
    // the bridge or it could mutate the page's scroll / inject CSS.
    const PANEL_ORIGIN = `chrome-extension://${chrome.runtime.id}`;

    window.addEventListener('message', e => {
      if (e.source !== window.parent) return;
      if (e.origin !== PANEL_ORIGIN) return;
      const data = e.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'rpc:init') {
        active = true;
        applyScrollbarPreference(Boolean(data.hideScrollbars));
        window.parent.postMessage({ type: 'rpc:ready' }, '*');
        return;
      }
      if (!active) return;

      if (data.type === 'rpc:setScroll') {
        applyScrollbarPreference(Boolean(data.hideScrollbars));
        return;
      }

      if (data.type === 'rpc:syncScroll') {
        const max = Math.max(
          1,
          document.documentElement.scrollHeight - window.innerHeight
        );
        muted = true;
        window.scrollTo(0, max * Number(data.scrollPct ?? 0));
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            muted = false;
          })
        );
      }

      // Full-page screenshot support.
      if (data.type === 'rpc:requestMetrics') {
        window.parent.postMessage(
          {
            type: 'rpc:metrics',
            scrollHeight: document.documentElement.scrollHeight,
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth,
          },
          '*'
        );
      }
      if (data.type === 'rpc:scrollTo') {
        muted = true;
        window.scrollTo({ top: Number(data.y) || 0, behavior: 'instant' });
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            muted = false;
          })
        );
      }
    });

    window.addEventListener(
      'scroll',
      () => {
        if (!active || pending || muted) return;
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          const max = Math.max(
            1,
            document.documentElement.scrollHeight - window.innerHeight
          );
          window.parent.postMessage(
            { type: 'rpc:scroll', scrollPct: window.scrollY / max },
            '*'
          );
        });
      },
      { passive: true }
    );
  },
});

function applyScrollbarPreference(hide: boolean) {
  const existing = document.getElementById(SCROLLBAR_STYLE_ID);
  if (hide) {
    if (existing) return;
    const style = document.createElement('style');
    style.id = SCROLLBAR_STYLE_ID;
    style.textContent = SCROLLBAR_CSS;
    document.documentElement.appendChild(style);
  } else if (existing) {
    existing.remove();
  }
}
