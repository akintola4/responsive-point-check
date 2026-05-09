/**
 * Single shared tooltip — driven by `data-tooltip` attributes anywhere in
 * the tree. 200ms delay on enter, instant hide on leave.
 *
 * Wrapped in `installTooltip()` (idempotent) so import order can never
 * break it: a stray `import './tooltip'` would silently get tree-shaken
 * by Vite when its only purpose is the side effect of executing.
 */

let installed = false;

export function installTooltip() {
  if (installed) return;
  installed = true;

  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.style.position = 'fixed';
  tip.style.pointerEvents = 'none';
  tip.hidden = true;
  document.body.append(tip);

  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let currentTarget: HTMLElement | null = null;

  document.addEventListener('mouseover', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-tooltip]');
    if (!t || t === currentTarget) return;
    currentTarget = t;
    if (showTimer) clearTimeout(showTimer);
    showTimer = setTimeout(() => {
      if (currentTarget !== t) return;
      tip.textContent = t.dataset.tooltip ?? '';
      tip.hidden = false;
      position(t, tip);
    }, 200);
  });

  document.addEventListener('mouseout', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-tooltip]');
    if (!t) return;
    currentTarget = null;
    if (showTimer) clearTimeout(showTimer);
    tip.hidden = true;
  });
}

function position(target: HTMLElement, tip: HTMLElement) {
  const r = target.getBoundingClientRect();
  const tipW = tip.offsetWidth;
  const tipH = tip.offsetHeight;
  // Place to the LEFT of target (the rail is at the right edge of the screen).
  tip.style.left = `${r.left - tipW - 8}px`;
  tip.style.top = `${r.top + r.height / 2 - tipH / 2}px`;
}
