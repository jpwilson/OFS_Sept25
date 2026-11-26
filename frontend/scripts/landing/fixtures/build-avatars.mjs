// Crops the cast's faces from the two character sheets into square avatars.
// sharp is loaded from landing-art/ so it never becomes a frontend dependency.
// Run: node frontend/scripts/landing/fixtures/build-avatars.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../..');
const require = createRequire(path.join(repo, 'landing-art/package.json'));
const sharp = require('sharp');

// [sheet, centre x, centre y, side] in sheet pixels (1536x1024)
const FACES = {
  biscuit: ['a', 108, 735, 150],
  maya: ['a', 280, 172, 160],
  tom: ['a', 512, 122, 160],
  ivy: ['a', 735, 262, 150],
  leo: ['a', 920, 395, 125],
  ruth: ['a', 1095, 220, 135],
  joe: ['a', 1335, 120, 150],
  kate: ['b', 165, 240, 105],
  marcus: ['b', 405, 222, 105],
  finn: ['b', 645, 212, 110],
  priya: ['b', 870, 262, 95],
  sam: ['b', 1128, 215, 105],
  deb: ['b', 1368, 232, 100],
};

for (const [id, [sheet, cx, cy, side]] of Object.entries(FACES)) {
  const src = path.join(repo, `landing-art/ref/cast-${sheet}.png`);
  await sharp(src)
    .extract({ left: Math.round(cx - side / 2), top: Math.round(cy - side / 2), width: side, height: side })
    .resize(256, 256, { kernel: 'lanczos3' })
    .webp({ quality: 88 })
    .toFile(path.join(here, 'avatars', `${id}.webp`));
}
// contact strip to eyeball the crops
const ids = Object.keys(FACES);
await sharp({ create: { width: 128 * ids.length, height: 128, channels: 3, background: '#fff' } })
  .composite(await Promise.all(ids.map(async (id, i) => ({ input: await sharp(path.join(here, 'avatars', `${id}.webp`)).resize(128).toBuffer(), left: i * 128, top: 0 }))))
  .jpeg().toFile(path.join(here, 'avatars', '_strip.jpg'));
console.log('avatars:', ids.join(' '));
