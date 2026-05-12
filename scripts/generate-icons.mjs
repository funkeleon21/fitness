#!/usr/bin/env node
// Generates the PNG icon set from apps/web/public/icon.svg.
// Run with: pnpm icons

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'apps', 'web', 'public');
const SOURCE = join(PUBLIC_DIR, 'icon.svg');

const TARGETS = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-16.png', size: 16 },
];

const svg = readFileSync(SOURCE);

for (const { name, size } of TARGETS) {
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(join(PUBLIC_DIR, name));
  console.info(`✓ ${name} (${size}×${size})`);
}
