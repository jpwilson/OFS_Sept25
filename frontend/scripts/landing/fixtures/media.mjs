// Resolves art ids to URLs the dev server can serve.
// Art that ART has processed lives under /landing/img (served by Vite from public/).
// Anything not yet in the manifest is served by route from /__fx/raw/<id> (the
// capture script answers it from landing-art/raw, falling back to a look-test image)
// and recorded in MISSING so a run can say what is still stand-in.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '../../../..');
export const MANIFEST_PATH = path.join(REPO, 'frontend/src/landing/art/manifest.json');

export function readManifest() {
  try { return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); } catch { return {}; }
}
const manifest = readManifest();

// Absolute, as the real API returns them (EventDetail matches captions and gallery items by URL).
export const ORIGIN = process.env.CAPTURE_ORIGIN || 'http://localhost:5325';
export const MISSING = new Set();
export const has = (id) => !!manifest[id];

// first id in the list that exists wins; otherwise the first id is served as stand-in
export function img(...ids) {
  for (const id of ids) if (manifest[id]) return ORIGIN + manifest[id].src;
  MISSING.add(ids[0]);
  return `${ORIGIN}/__fx/raw/${ids[0]}.png`;
}
export function imgSize(...ids) {
  for (const id of ids) if (manifest[id]) return { w: manifest[id].w, h: manifest[id].h };
  return { w: 1448, h: 1086 };
}

export const avatar = (key) => `${ORIGIN}/__fx/avatar/${key}.webp`;
export const VIDEO_RACE = `${ORIGIN}/__fx/video/race-final-straight.mp4`;
