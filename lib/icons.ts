// Geist Pixel-style icons: 16x16 grid, 1px stroke, blocky.
// Inlined as raw SVG strings so we render with `el.innerHTML = icons.foo`
// without any React/JSX runtime.

const wrap = (path: string, size = 16) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="square" stroke-linejoin="miter" shape-rendering="crispEdges">${path}</svg>`;

export const close = wrap(
  '<path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/>'
);

export const monitor = wrap(
  '<rect x="2" y="3" width="12" height="8"/><path d="M5 13h6M8 11v2"/>'
);

export const alert = wrap(
  '<path d="M8 2v6M8 10v2"/><circle cx="8" cy="8" r="6"/>'
);

export const refresh = wrap(
  '<path d="M3 8a5 5 0 0 1 8.5-3.5L13 6M13 3v3h-3M13 8a5 5 0 0 1-8.5 3.5L3 10M3 13v-3h3"/>'
);

export const search = wrap(
  '<circle cx="7" cy="7" r="4"/><path d="M10 10l3 3"/>'
);

export const camera = wrap(
  '<rect x="2" y="4" width="12" height="9"/><path d="M5 4l1.5-2h3L11 4"/><circle cx="8" cy="8.5" r="2.5"/>'
);

export const video = wrap(
  '<rect x="2" y="5" width="9" height="6"/><path d="M11 7l3-2v6l-3-2z"/>'
);

export const rotate = wrap(
  '<path d="M3 8a5 5 0 0 1 9-3M12 5h-3M12 5V2"/><path d="M13 8a5 5 0 0 1-9 3M4 11h3M4 11v3"/>'
);

export const puzzle = wrap(
  '<path d="M3 7h2a1 1 0 0 1 0 2H3v4h4v-2a1 1 0 0 1 2 0v2h4V9h-2a1 1 0 0 1 0-2h2V3H9v2a1 1 0 0 1-2 0V3H3z"/>'
);

export const share = wrap(
  '<circle cx="4" cy="8" r="1.5"/><circle cx="12" cy="3" r="1.5"/><circle cx="12" cy="13" r="1.5"/><path d="M5.5 7l5-3M5.5 9l5 3"/>'
);

export const help = wrap(
  '<circle cx="8" cy="8" r="6"/><path d="M6 6.5a2 2 0 1 1 2 2v1M8 12.5v0"/>'
);

export const settings = wrap(
  // Eight-tooth gear: outer star path + inner ring + center hub.
  '<path d="M8 1.5l1 1.5 1.7-.4.4 1.7 1.7.5-.4 1.7 1.2 1.2-1.2 1.2.4 1.7-1.7.5-.4 1.7-1.7-.4-1 1.5-1-1.5-1.7.4-.4-1.7-1.7-.5.4-1.7L1.4 8l1.2-1.2-.4-1.7 1.7-.5.4-1.7L6 3z"/><circle cx="8" cy="8" r="2"/>'
);

export const plus = wrap('<path d="M8 3v10M3 8h10"/>');
export const minus = wrap('<path d="M3 8h10"/>');
export const expand = wrap(
  '<path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"/>'
);

export const grid = wrap(
  '<rect x="2.5" y="2.5" width="4" height="4"/><rect x="9.5" y="2.5" width="4" height="4"/><rect x="2.5" y="9.5" width="4" height="4"/><rect x="9.5" y="9.5" width="4" height="4"/>'
);

// Sync — two opposing arcs forming a loop. Used for "sync scroll".
export const sync = wrap(
  '<path d="M3 6.5a4 4 0 0 1 7-2L12 6M12 3v3h-3"/><path d="M13 9.5a4 4 0 0 1-7 2L4 10M4 13v-3h3"/>'
);

// Hand — pan tool. Four fingers + thumb in classic hand-cursor pose.
export const hand = wrap(
  '<path d="M5 7V3.5a1 1 0 0 1 2 0V7M7 7V3a1 1 0 0 1 2 0v4M9 7V3.5a1 1 0 0 1 2 0V8M11 8V5.5a1 1 0 0 1 2 0V11a4 4 0 0 1-4 4H7l-3.5-4a1.2 1.2 0 0 1 1.6-1.6L7 11"/>'
);
