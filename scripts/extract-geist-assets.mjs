/**
 * Copies Geist + Geist Pixel woff2 files from `node_modules/geist/dist/fonts/`
 * into `public/fonts/` so WXT bundles them with the extension.
 *
 * Run automatically from `pnpm install` via the postinstall script.
 */

import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'node_modules/geist/dist/fonts');
const DEST = resolve(ROOT, 'public/fonts');

if (!existsSync(SRC)) {
  console.warn(`[geist] ${SRC} not found — did pnpm install fail?`);
  process.exit(0);
}

mkdirSync(DEST, { recursive: true });

const files = [
  ['geist-sans/Geist-Variable.woff2', 'Geist-Variable.woff2'],
  ['geist-mono/GeistMono-Variable.woff2', 'GeistMono-Variable.woff2'],
  ['geist-pixel/GeistPixel-Square.woff2', 'GeistPixel-Square.woff2'],
  ['geist-pixel/GeistPixel-Grid.woff2', 'GeistPixel-Grid.woff2'],
  ['geist-pixel/GeistPixel-Circle.woff2', 'GeistPixel-Circle.woff2'],
  ['geist-pixel/GeistPixel-Triangle.woff2', 'GeistPixel-Triangle.woff2'],
  ['geist-pixel/GeistPixel-Line.woff2', 'GeistPixel-Line.woff2'],
];

for (const [from, to] of files) {
  copyFileSync(resolve(SRC, from), resolve(DEST, to));
}

console.log(`[geist] copied ${files.length} fonts → public/fonts/`);
