/**
 * Settings dialog. Tries to mirror the layout of the user's reference
 * (sectioned list of toggles + a few pickers).
 */

import {
  CATEGORY_LABELS,
  DEVICES,
  type DeviceCategory,
} from '../../lib/devices';
import { enableBackdropClickToClose } from './device-picker';
import { h } from './h';
import * as store from './store';

let dialog: HTMLDialogElement | null = null;

export function openSettings() {
  if (!dialog) dialog = buildDialog();
  if (!dialog.isConnected) document.body.append(dialog);
  refresh(dialog);
  dialog.showModal();
}

function buildDialog(): HTMLDialogElement {
  const body = h('div', { class: 'st__body' });
  const dlg = h(
    'dialog',
    { class: 'dp st' },
    h(
      'header',
      { class: 'dp__header' },
      h('h2', {}, 'Settings'),
      h('button', { class: 'dp__close', onclick: () => dialog?.close() }, '×')
    ),
    body
  ) as HTMLDialogElement;
  enableBackdropClickToClose(dlg);
  return dlg;
}

function refresh(dlg: HTMLDialogElement) {
  const body = dlg.querySelector<HTMLElement>('.st__body');
  if (!body) return;
  body.replaceChildren(...renderSections());
}

function renderSections(): HTMLElement[] {
  const s = store.getState();

  return [
    section('Display', [
      toggle(
        'Show device bezel (mockup)',
        s.showBezel,
        v => store.update({ showBezel: v })
      ),
      toggle(
        'Show browser chrome (URL bar)',
        s.showBrowserChrome,
        v => store.update({ showBrowserChrome: v })
      ),
      toggle(
        'Hide scrollbars in preview',
        s.hideScrollbars,
        v => store.update({ hideScrollbars: v })
      ),
      pickerRow(
        'Canvas background',
        ['dots', 'grid', 'lines', 'plus', 'blueprint', 'gradient', 'solid'],
        s.canvasBg,
        v => store.update({ canvasBg: v as store.CanvasBg })
      ),
      toggle(
        'Show breakpoint guides (640 / 768 / 1024 / 1280)',
        s.showBreakpointGuides,
        v => store.update({ showBreakpointGuides: v })
      ),
      pickerRow(
        'Theme',
        ['auto', 'light', 'dark'],
        s.theme,
        v => store.update({ theme: v as 'auto' | 'light' | 'dark' })
      ),
    ]),

    section('Behavior', [
      toggle(
        'Sync scroll across frames',
        s.syncScroll,
        v => store.update({ syncScroll: v })
      ),
      pickerRow(
        'Default device on open',
        ['last-used', ...DEVICES.map(d => d.id)],
        s.defaultDeviceId,
        v => store.update({ defaultDeviceId: v }),
        formatDeviceOption
      ),
    ]),

    section('Reset', [
      h(
        'div',
        { class: 'st__row' },
        h('span', { class: 'st__label' }, 'Restore all settings to defaults'),
        h(
          'button',
          {
            class: 'st__danger',
            onclick: () => {
              store.resetState();
              dialog?.close();
            },
          },
          'Reset'
        )
      ),
    ]),
  ];
}

function section(title: string, rows: (HTMLElement | null)[]): HTMLElement {
  return h(
    'section',
    { class: 'st__section' },
    h('h3', { class: 'st__heading' }, title),
    ...rows.filter(Boolean)
  );
}

function toggle(
  label: string,
  value: boolean,
  onChange: (v: boolean) => void
): HTMLElement {
  const input = h('input', {
    type: 'checkbox',
    class: 'st__toggle',
  }) as HTMLInputElement;
  input.checked = value;
  input.addEventListener('change', () => onChange(input.checked));
  return h(
    'label',
    { class: 'st__row' },
    h('span', { class: 'st__label' }, label),
    input
  );
}

function pickerRow(
  label: string,
  values: string[],
  current: string,
  onChange: (v: string) => void,
  format: (v: string) => string = v => v
): HTMLElement {
  const select = h('select', { class: 'st__select' }) as HTMLSelectElement;
  for (const v of values) {
    const opt = h('option', { value: v }, format(v));
    if (v === current) (opt as HTMLOptionElement).selected = true;
    select.append(opt);
  }
  select.addEventListener('change', () => onChange(select.value));
  return h(
    'div',
    { class: 'st__row' },
    h('span', { class: 'st__label' }, label),
    select
  );
}

function formatDeviceOption(id: string): string {
  if (id === 'last-used') return 'Last used';
  const d = DEVICES.find(x => x.id === id);
  if (!d) return id;
  const cat = CATEGORY_LABELS[d.category as DeviceCategory] ?? d.category;
  return `${d.name}  (${cat})`;
}
