// Makes the two short inline clips the stories embed, as a slow zoom on a still (ffmpeg required).
// Run after the photos are in the manifest: node frontend/scripts/landing/fixtures/build-videos.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { HERE, REPO, readManifest } from './media.mjs';

const CLIPS = { 'race-final-straight.mp4': 'photo-race-video', 'wedding-speeches.mp4': 'photo-wedding-speech' };
const m = readManifest();
fs.mkdirSync(path.join(HERE, 'video'), { recursive: true });
for (const [out, id] of Object.entries(CLIPS)) {
  if (!m[id]) { console.log(`skip ${out}: ${id} not in the manifest yet`); continue; }
  const src = path.join(REPO, 'frontend/public', m[id].src);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-i', src,
    '-vf', "scale=2896:-2,zoompan=z='1+0.0016*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=150:s=1280x960:fps=25,format=yuv420p",
    '-t', '6', '-c:v', 'libx264', '-crf', '26', '-movflags', '+faststart', path.join(HERE, 'video', out)]);
  console.log(`made ${out} from ${id}`);
}
