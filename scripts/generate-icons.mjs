/**
 * Rasterizes the brand app icon SVG into the PWA PNG icons.
 * Run after any brand change: node scripts/generate-icons.mjs
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'brand', 'karhabti-app-icon.svg');
const outDir = path.join(root, 'apps', 'web', 'public', 'icons');

for (const size of [192, 512]) {
  const out = path.join(outDir, `icon-${size}.png`);
  await sharp(source, { density: 300 }).resize(size, size).png().toFile(out);
  console.log(`wrote ${out}`);
}
