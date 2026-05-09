import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DEVICES,
  type Device,
  type DeviceCategory,
} from '../../lib/devices';
import * as store from './store';
import { h, clear } from './h';

let dialog: HTMLDialogElement | null = null;

const TAB_ORDER: (DeviceCategory | 'custom')[] = [
  ...CATEGORY_ORDER,
  'custom',
];

export function openDevicePicker() {
  if (!dialog) dialog = buildDialog();
  if (!dialog.isConnected) document.body.append(dialog);

  // Always reflect the current active device. We re-run the tab + grid
  // render directly (instead of going through setTab) because setTab
  // skips the work when the category hasn't changed — that left the
  // active-card highlight stale on re-open.
  const active = store.getState().activeDeviceId;
  const activeDevice = store.resolveDevice(active);
  // Custom device → custom tab; otherwise that device's own category.
  const isCustom = !!store
    .getState()
    .customDevices.find(c => c.id === active);
  const cat: DeviceCategory | 'custom' = isCustom
    ? 'custom'
    : activeDevice?.category ?? 'apple-phone';
  dialog
    .querySelectorAll<HTMLElement>('.dp__tab')
    .forEach(b => (b.dataset.active = b.dataset.cat === cat ? 'yes' : 'no'));
  renderRecents(dialog);
  const grid = dialog.querySelector<HTMLElement>('.dp__grid');
  if (grid) renderGrid(grid, cat);

  dialog.showModal();
}

/** Programmatic tab switch — used by keyboard shortcuts. */
export function setPickerCategory(cat: DeviceCategory | 'custom') {
  if (!dialog) return;
  setTab(dialog, cat);
}

function buildDialog(): HTMLDialogElement {
  const grid = h('div', { class: 'dp__grid' });
  const recents = h('div', { class: 'dp__recents' });

  const tabBar = h(
    'div',
    { class: 'dp__tabs' },
    ...TAB_ORDER.map(t =>
      h(
        'button',
        {
          class: 'dp__tab',
          'data-cat': t,
          onclick: () => setTab(dlg, t),
        },
        t === 'custom' ? 'My devices' : CATEGORY_LABELS[t]
      )
    )
  );

  const dlg = h(
    'dialog',
    { class: 'dp' },
    h(
      'header',
      { class: 'dp__header' },
      h('h2', {}, 'Pick a device'),
      h('button', { class: 'dp__close', onclick: () => dialog?.close() }, '×')
    ),
    recents,
    tabBar,
    grid
  ) as HTMLDialogElement;

  renderGrid(grid, 'apple-phone');
  renderRecents(dlg);
  enableBackdropClickToClose(dlg);
  // Recents update live when the active device or the recents list
  // actually changes — diff first so unrelated mutations (zoom, URL,
  // theme) don't tear down the chip row 60×/sec.
  store.subscribe((next, prev) => {
    if (!dlg.open) return;
    if (
      next.activeDeviceId === prev.activeDeviceId &&
      next.recentDeviceIds === prev.recentDeviceIds &&
      next.customDevices === prev.customDevices
    ) return;
    renderRecents(dlg);
  });
  return dlg;
}

function renderRecents(dlg: HTMLDialogElement) {
  const host = dlg.querySelector<HTMLElement>('.dp__recents');
  if (!host) return;
  const ids = store.getState().recentDeviceIds;
  if (!ids.length) {
    host.replaceChildren();
    return;
  }
  const active = store.getState().activeDeviceId;
  const chips = ids
    .map(id => {
      const d = store.resolveDevice(id);
      if (!d) return null;
      return h(
        'button',
        {
          class: 'dp__chip',
          'data-active': d.id === active ? 'yes' : 'no',
          onclick: () => {
            store.setActive(d.id);
            dialog?.close();
          },
        },
        h('span', { class: 'dp__chip-dot', 'data-bezel': d.bezel }),
        h('span', { class: 'dp__chip-name' }, d.name)
      );
    })
    .filter((node): node is HTMLButtonElement => node !== null);
  host.replaceChildren(
    h('span', { class: 'dp__recents-label' }, 'Recent'),
    ...chips
  );
}

/**
 * Native <dialog> doesn't dismiss on backdrop click by default. The dialog's
 * box only covers its content, so clicks on the backdrop produce events with
 * coordinates outside the dialog's bounding rect.
 */
export function enableBackdropClickToClose(dlg: HTMLDialogElement) {
  dlg.addEventListener('click', e => {
    const rect = dlg.getBoundingClientRect();
    const isInsideDialog =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (!isInsideDialog) dlg.close();
  });
}

const FADE_OUT_MS = 120;

/**
 * Switch the active tab. The dialog's grid has a fixed min-height that
 * fits the largest category, so switching never resizes the dialog and
 * there's no CLS. Only opacity cross-fades. Tabs with fewer cards leave
 * empty space below — preferable to a creeping bottom edge.
 */
function setTab(root: HTMLElement, cat: DeviceCategory | 'custom') {
  const currentlyActive = root.querySelector<HTMLElement>(
    '.dp__tab[data-active="yes"]'
  );
  if (currentlyActive?.dataset.cat === cat) return;

  root
    .querySelectorAll<HTMLElement>('.dp__tab')
    .forEach(b => (b.dataset.active = b.dataset.cat === cat ? 'yes' : 'no'));

  const grid = root.querySelector<HTMLElement>('.dp__grid');
  if (!grid) return;

  grid.style.opacity = '0';
  window.setTimeout(() => {
    renderGrid(grid, cat);
    requestAnimationFrame(() => {
      grid.style.opacity = '1';
    });
  }, FADE_OUT_MS);
}

function renderGrid(grid: HTMLElement, cat: DeviceCategory | 'custom') {
  clear(grid);
  const active = store.getState().activeDeviceId;

  if (cat === 'custom') {
    grid.append(buildCustomDeviceForm());
    for (const c of store.getState().customDevices) {
      grid.append(buildCustomCard(c, active));
    }
    return;
  }

  for (const d of DEVICES.filter(x => x.category === cat)) {
    grid.append(buildBuiltinCard(d, active));
  }
}

function buildBuiltinCard(d: Device, active: string): HTMLElement {
  return h(
    'button',
    {
      class: 'dp__card',
      'data-active': d.id === active ? 'yes' : 'no',
      onclick: () => {
        store.setActive(d.id);
        dialog?.close();
      },
    },
    h('div', { class: 'dp__card-icon', 'data-bezel': d.bezel }),
    h('div', { class: 'dp__card-name' }, d.name),
    h('div', { class: 'dp__card-dim' }, `${d.width} × ${d.height}`)
  );
}

function buildCustomCard(
  c: store.CustomDevice,
  active: string
): HTMLElement {
  const card = h(
    'div',
    {
      class: 'dp__card dp__card--custom',
      'data-active': c.id === active ? 'yes' : 'no',
    },
    h(
      'button',
      {
        class: 'dp__card-body',
        onclick: () => {
          store.setActive(c.id);
          dialog?.close();
        },
      },
      h('div', { class: 'dp__card-icon', 'data-bezel': 'monitor' }),
      h('div', { class: 'dp__card-name' }, c.name),
      h('div', { class: 'dp__card-dim' }, `${c.width} × ${c.height}`)
    ),
    h(
      'button',
      {
        class: 'dp__card-remove',
        title: 'Remove this device',
        onclick: (e: Event) => {
          e.stopPropagation();
          store.removeCustomDevice(c.id);
          // Re-render the grid in place.
          const grid = card.parentElement as HTMLElement | null;
          if (grid) renderGrid(grid, 'custom');
        },
      },
      '×'
    )
  );
  return card;
}

function buildCustomDeviceForm(): HTMLElement {
  const nameInput = h('input', {
    class: 'dp__cd-input',
    type: 'text',
    placeholder: 'My laptop',
    maxlength: '32',
  }) as HTMLInputElement;
  const wInput = h('input', {
    class: 'dp__cd-input dp__cd-input--num',
    type: 'number',
    min: '120',
    max: '5120',
    placeholder: 'W',
  }) as HTMLInputElement;
  const hInput = h('input', {
    class: 'dp__cd-input dp__cd-input--num',
    type: 'number',
    min: '120',
    max: '5120',
    placeholder: 'H',
  }) as HTMLInputElement;
  // HTML `min`/`max` are advisory only — paste-bomb a 99999 and it sails
  // through. Validate explicitly so bezel layout math doesn't overflow.
  const MIN_DIM = 120;
  const MAX_DIM = 5120;
  const submit = () => {
    const name = nameInput.value.trim() || `${wInput.value}×${hInput.value}`;
    const w = Number(wInput.value);
    const h = Number(hInput.value);
    if (
      !Number.isFinite(w) ||
      !Number.isFinite(h) ||
      w < MIN_DIM || h < MIN_DIM ||
      w > MAX_DIM || h > MAX_DIM
    ) return;
    const id = `custom-${Date.now().toString(36)}`;
    store.addCustomDevice({ id, name, width: w, height: h });
    nameInput.value = '';
    wInput.value = '';
    hInput.value = '';
    // Re-render the grid in place.
    const grid = form.parentElement as HTMLElement | null;
    if (grid) renderGrid(grid, 'custom');
  };
  const onEnter = (e: Event) => {
    if ((e as KeyboardEvent).key === 'Enter') submit();
  };
  nameInput.addEventListener('keydown', onEnter);
  wInput.addEventListener('keydown', onEnter);
  hInput.addEventListener('keydown', onEnter);

  const form = h(
    'div',
    { class: 'dp__cd-form' },
    h('div', { class: 'dp__cd-title' }, 'Add a custom viewport'),
    h(
      'div',
      { class: 'dp__cd-row' },
      nameInput,
      wInput,
      h('span', { class: 'dp__cd-x' }, '×'),
      hInput,
      h('button', { class: 'dp__cd-add', onclick: submit }, 'Add')
    )
  );
  return form;
}
