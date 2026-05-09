/**
 * Help / About dialog. Layout mirrors the user's reference screenshot:
 *   - FAQs (a few common questions, link to README)
 *   - Report a bug / Suggest an improvement → GitHub
 *
 * GitHub repo URL is sourced from a single constant so it's easy to swap
 * once the repo is created.
 */

import { enableBackdropClickToClose } from './device-picker';
import { h } from './h';
import * as icons from '../../lib/icons';

/** Public repo URL — bug reports + feature requests open prefilled
 *  GitHub issues against this repo. */
const GITHUB_REPO = 'https://github.com/akintola4/responsive-point-check';
const ISSUES_NEW = (label: string, title: string) =>
  `${GITHUB_REPO}/issues/new?labels=${encodeURIComponent(label)}&title=${encodeURIComponent(title)}`;

let dialog: HTMLDialogElement | null = null;

export function openHelp() {
  if (!dialog) dialog = buildDialog();
  if (!dialog.isConnected) document.body.append(dialog);
  dialog.showModal();
}

function buildDialog(): HTMLDialogElement {
  const dlg = h(
    'dialog',
    { class: 'dp hp' },
    h(
      'header',
      { class: 'dp__header' },
      h(
        'div',
        { class: 'hp__title' },
        h('span', { class: 'hp__title-icon', html: icons.help }),
        h('h2', {}, 'Help & support')
      ),
      h('button', { class: 'dp__close', onclick: () => dialog?.close() }, '×')
    ),
    h(
      'div',
      { class: 'hp__body' },
      buildFaqSection(),
      h(
        'section',
        { class: 'hp__section' },
        h('h3', { class: 'st__heading' }, 'Open source'),
        actionRow(
          icons.alert,
          'Report a bug',
          'Open a prefilled issue on GitHub — uses the "bug" label.',
          ISSUES_NEW('bug', '[bug] ')
        ),
        actionRow(
          icons.plus,
          'Suggest an improvement',
          'Propose a feature or change — uses the "enhancement" label.',
          ISSUES_NEW('enhancement', '[feature] ')
        ),
        actionRow(
          icons.share,
          'View source on GitHub',
          'Browse the repo, star, or fork.',
          GITHUB_REPO
        )
      )
    )
  ) as HTMLDialogElement;

  enableBackdropClickToClose(dlg);
  return dlg;
}

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Why doesn't this site load in the frame?",
    a: "Some sites block iframes via X-Frame-Options or CSP. RPC strips those headers for its own panel, but a few sites also use JS to detect iframe embedding and redirect (e.g. checking `window.top !== window`). For those, open the site in a tab and screenshot from there.",
  },
  {
    q: 'How do I test sites that need login?',
    a: 'Sign in to the site in a regular tab in this same Chrome profile. Cookies with SameSite=Lax flow into the panel iframes automatically. Sites that set SameSite=Strict cookies will not authenticate inside iframes — that is a Chrome restriction RPC cannot bypass.',
  },
  {
    q: 'My CSS media queries are showing the wrong breakpoint.',
    a: 'Each iframe sets its viewport to the device width. Make sure your CSS uses `@media (max-width: ...)` based on viewport (px), not the user-agent string. Also check the device picker — picking iPhone 15 Pro means width is 393, not the 1170 native pixel width.',
  },
  {
    q: 'Can I record a video?',
    a: 'Not yet — video capture is on the roadmap. The icon in the rail with the NEW badge is the placeholder.',
  },
  {
    q: 'How are screenshots saved?',
    a: 'PNG, downloaded to your Chrome downloads folder. Filename is `rpc-<device>-<site|mockup>-<W>x<H>.png`. Captures happen at 1.0 zoom × DPR (so 2x on retina) for sharpness.',
  },
];

function faq(item: FaqItem): HTMLElement {
  return h(
    'details',
    { class: 'hp__faq' },
    h(
      'summary',
      { class: 'hp__faq-q' },
      h('span', {}, item.q),
      h('span', { class: 'hp__faq-chevron' }, '+')
    ),
    h('div', { class: 'hp__faq-a' }, item.a)
  );
}

/**
 * FAQ section with single-open accordion behaviour: opening any item
 * collapses the rest. Native <details> allows multiple to be open at once;
 * we coerce one-at-a-time by listening to the bubbled `toggle` event.
 */
function buildFaqSection(): HTMLElement {
  const items = FAQ_ITEMS.map(faq);
  const section = h(
    'section',
    { class: 'hp__section' },
    h('h3', { class: 'st__heading' }, 'Frequently asked'),
    ...items,
    link(`${GITHUB_REPO}#readme`, 'See all FAQs in the README →')
  );

  section.addEventListener(
    'toggle',
    e => {
      const target = e.target as HTMLDetailsElement;
      if (!(target instanceof HTMLDetailsElement) || !target.open) return;
      for (const other of items) {
        const otherDetails = other as HTMLDetailsElement;
        if (otherDetails !== target && otherDetails.open) {
          otherDetails.open = false;
        }
      }
    },
    true // capture — `toggle` doesn't bubble in older specs
  );

  return section;
}

function link(href: string, label: string): HTMLElement {
  return h(
    'a',
    {
      class: 'hp__link',
      href,
      target: '_blank',
      rel: 'noopener',
    },
    label
  );
}

function actionRow(
  iconSvg: string,
  title: string,
  description: string,
  href: string
): HTMLElement {
  return h(
    'a',
    {
      class: 'hp__row',
      href,
      target: '_blank',
      rel: 'noopener',
    },
    h('span', { class: 'hp__row-icon', html: iconSvg }),
    h(
      'div',
      { class: 'hp__row-text' },
      h('div', { class: 'hp__row-title' }, title),
      h('div', { class: 'hp__row-desc' }, description)
    ),
    h('span', { class: 'hp__row-arrow' }, '↗')
  );
}
