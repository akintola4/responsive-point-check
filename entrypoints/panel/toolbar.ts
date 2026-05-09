import * as icons from '../../lib/icons';
import * as store from './store';
import { h } from './h';

const URL_HISTORY_LIST_ID = 'rpc-url-history';

export function createToolbar(): HTMLElement {
  const urlInput = h('input', {
    class: 'tb__url',
    type: 'url',
    list: URL_HISTORY_LIST_ID,
    placeholder: 'https://example.com — or http://localhost:3000',
    value: store.getState().url,
    spellcheck: 'false',
  }) as HTMLInputElement;
  const urlHistoryList = h('datalist', {
    id: URL_HISTORY_LIST_ID,
  }) as HTMLDataListElement;

  const renderUrlHistory = () => {
    urlHistoryList.replaceChildren(
      ...store.getState().urlHistory.map(u => h('option', { value: u }))
    );
  };
  renderUrlHistory();

  const go = () => {
    const raw = urlInput.value.trim();
    if (!raw) return;
    const v = normalizeUrl(raw);
    store.update({ url: v });
    store.pushUrlHistory(v);
  };

  urlInput.addEventListener('keydown', e => {
    if ((e as KeyboardEvent).key === 'Enter') go();
  });
  // datalist option clicks fire 'input', not 'change' — pick those up too.
  urlInput.addEventListener('change', go);

  const deviceLabel = h('span', { class: 'tb__device' });
  const zoomLabel = h('span', { class: 'tb__zoom-label' });

  const renderInfo = () => {
    const s = store.getState();
    const d = store.resolveDevice(s.activeDeviceId);
    if (!d) return;
    const w = s.orientation === 'landscape' ? d.height : d.width;
    const hpx = s.orientation === 'landscape' ? d.width : d.height;
    deviceLabel.textContent = `${d.name}  ·  ${w}×${hpx}`;
    if (s.zoom === 'fit') zoomLabel.textContent = 'FIT';
    else zoomLabel.textContent = `${Math.round(s.zoom * 100)}%`;
    if (urlInput.value !== s.url) urlInput.value = s.url;
  };

  store.subscribe((next, prev) => {
    renderInfo();
    if (next.urlHistory !== prev.urlHistory) renderUrlHistory();
  });
  renderInfo();

  return h(
    'div',
    { class: 'tb' },
    h(
      'div',
      { class: 'tb__brand' },
      h('span', { html: icons.grid }),
      'RPC'
    ),
    h(
      'div',
      { class: 'tb__url-wrap' },
      h('span', { class: 'tb__url-icon', html: icons.search }),
      urlInput,
      urlHistoryList,
      h('button', { class: 'tb__go', onclick: go }, 'Go')
    ),
    h('div', { class: 'tb__info' }, deviceLabel, zoomLabel),
    h('button', {
      class: 'tb__icon',
      'data-tooltip': 'Reload',
      onclick: reloadFrame,
      html: icons.refresh,
    }),
    h('button', {
      class: 'tb__icon',
      'data-tooltip': 'Toggle theme',
      onclick: toggleTheme,
      html: icons.monitor,
    })
  );
}

function reloadFrame() {
  const iframe = document.querySelector<HTMLIFrameElement>('.canvas iframe');
  if (!iframe) return;
  // Re-assigning src to itself is the most reliable cross-origin reload —
  // contentWindow.location.reload() throws SecurityError when the iframe
  // loaded a different origin from the panel.
  // eslint-disable-next-line no-self-assign
  iframe.src = iframe.src;
}

function toggleTheme() {
  const next = store.getState().theme === 'dark' ? 'light' : 'dark';
  store.update({ theme: next });
}

/** Defaults bare hostnames to https://, but recognises localhost / loopback
 *  / *.local / IP addresses → http:// (dev servers don't ship TLS by
 *  default, so https://localhost would 100% fail to load). */
function normalizeUrl(raw: string): string {
  if (/^https?:\/\//i.test(raw)) return raw;
  const host = raw.split('/')[0] ?? '';
  const isLocal =
    host === 'localhost' ||
    host.startsWith('localhost:') ||
    host.endsWith('.local') ||
    /^localhost(:\d+)?$/i.test(host) ||
    /^127\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host) ||
    /^0\.0\.0\.0(:\d+)?$/.test(host);
  return `${isLocal ? 'http' : 'https'}://${raw}`;
}
