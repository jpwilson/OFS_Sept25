// The Tetons upload kit: raw/photo-tetons-NN.png -> kits/tetons/tetons-NN.jpg with real EXIF
// (DateTimeOriginal in local Mountain time, GPS from ROUND2.md with a small fixed jitter), plus README.md.
// Usage: cd landing-art && node kit-tetons.mjs   (re-runnable; verifies by reading tags back)
import sharp from 'sharp'
import piexif from 'piexifjs'
import exifr from 'exifr'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ART = dirname(fileURLToPath(import.meta.url))
const RAW = join(ART, 'raw')
const OUT = join(ART, 'kits', 'tetons')
const LONG_EDGE = 2000
const QUALITY = 88

const PLACES = {
  town: ['Jackson Town Square', 43.4799, -110.7624],
  mormon: ['Mormon Row', 43.6608, -110.6653],
  schwab: ['Schwabacher Landing', 43.7109, -110.6719],
  jenny: ['Jenny Lake', 43.751, -110.7228],
  falls: ['Hidden Falls', 43.7654, -110.7447],
  inspo: ['Inspiration Point', 43.7663, -110.743],
  taggart: ['Taggart Lake', 43.7069, -110.7541],
  moose: ['Moose (Chapel of the Transfiguration)', 43.6596, -110.7133],
  float: ["Snake River float (Deadman's Bar)", 43.7598, -110.6234],
  oxbow: ['Oxbow Bend', 43.866, -110.549],
  signal: ['Signal Mountain', 43.8504, -110.5713],
  colter: ['Colter Bay', 43.902, -110.6413],
  string: ['String Lake', 43.787, -110.729],
  tram: ['Teton Village tram', 43.5875, -110.8279],
  overlook: ['Snake River Overlook', 43.754, -110.6235],
}

// [photo number, day (1-7 = 14-20 June 2026), local time, place]
const SHOTS = [
  [1, 1, '14:10', 'town'], [2, 1, '16:40', 'town'], [3, 1, '18:30', 'town'],
  [4, 2, '05:50', 'mormon'], [5, 2, '06:15', 'mormon'], [6, 2, '07:20', 'schwab'], [7, 2, '07:45', 'schwab'],
  [8, 3, '09:30', 'jenny'], [9, 3, '10:15', 'falls'], [10, 3, '11:05', 'inspo'], [11, 3, '14:30', 'jenny'],
  [12, 4, '09:40', 'taggart'], [13, 4, '10:50', 'taggart'], [14, 4, '12:20', 'taggart'], [15, 4, '15:10', 'moose'],
  [16, 5, '10:00', 'float'], [17, 5, '10:40', 'float'], [18, 5, '11:15', 'float'], [19, 5, '17:30', 'oxbow'], [20, 5, '17:45', 'oxbow'],
  [21, 6, '09:20', 'signal'], [22, 6, '09:35', 'signal'], [23, 6, '13:40', 'colter'], [24, 6, '15:20', 'colter'], [25, 6, '19:30', 'colter'],
  [26, 7, '10:10', 'string'], [27, 7, '11:00', 'string'], [28, 7, '14:20', 'tram'], [29, 7, '15:00', 'tram'], [30, 7, '18:40', 'overlook'],
]

// Deterministic jitter of 15-60 m so photos at one stop do not stack exactly.
function jitter(n, lat, lon) {
  const a = (n * 137.508 * Math.PI) / 180
  const r = 15 + ((n * 7919) % 46) // metres
  const dLat = (r * Math.cos(a)) / 111320
  const dLon = (r * Math.sin(a)) / (111320 * Math.cos((lat * Math.PI) / 180))
  return [Math.round((lat + dLat) * 1e6) / 1e6, Math.round((lon + dLon) * 1e6) / 1e6]
}

const pad2 = (n) => String(n).padStart(2, '0')

function exifBytes(dateTime, lat, lon) {
  const zeroth = { [piexif.ImageIFD.DateTime]: dateTime }
  const exif = {
    [piexif.ExifIFD.DateTimeOriginal]: dateTime,
    [piexif.ExifIFD.DateTimeDigitized]: dateTime,
  }
  const gps = {
    [piexif.GPSIFD.GPSVersionID]: [2, 3, 0, 0],
    [piexif.GPSIFD.GPSLatitudeRef]: lat >= 0 ? 'N' : 'S',
    [piexif.GPSIFD.GPSLatitude]: piexif.GPSHelper.degToDmsRational(Math.abs(lat)),
    [piexif.GPSIFD.GPSLongitudeRef]: lon >= 0 ? 'E' : 'W',
    [piexif.GPSIFD.GPSLongitude]: piexif.GPSHelper.degToDmsRational(Math.abs(lon)),
  }
  return piexif.dump({ '0th': zeroth, Exif: exif, GPS: gps })
}

mkdirSync(OUT, { recursive: true })
const rows = []
for (const [n, day, time, key] of SHOTS) {
  const src = join(RAW, `photo-tetons-${pad2(n)}.png`)
  if (!existsSync(src)) { console.log('missing', src); continue }
  const [place, lat0, lon0] = PLACES[key]
  const [lat, lon] = jitter(n, lat0, lon0)
  const date = `2026-06-${pad2(13 + day)}`
  const dateTime = `${date.replace(/-/g, ':')} ${time}:00`
  const jpeg = await sharp(src)
    .resize(LONG_EDGE, LONG_EDGE, { fit: 'inside', kernel: 'lanczos3' })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toBuffer()
  const withExif = piexif.insert(exifBytes(dateTime, lat, lon), jpeg.toString('binary'))
  const file = `tetons-${pad2(n)}.jpg`
  writeFileSync(join(OUT, file), Buffer.from(withExif, 'binary'))
  rows.push({ file, day, place, date, time, lat, lon })
}

const md = [
  '# Seven days in the Tetons: upload kit',
  '',
  'Thirty sample photos for the story "Seven days in the Tetons" (an AI-generated sample family). Each JPEG carries `DateTimeOriginal` (local Mountain Daylight Time, UTC-6; no offset tag is written, as is usual for phone photos read as local time) and GPS latitude and longitude, so the app can build the journey map. Coordinates are the real stops from `docs/landing/ROUND2.md`, each moved by 15 to 60 meters so photos at one stop do not stack. Rebuild with `node kit-tetons.mjs` in `landing-art/`.',
  '',
  '| File | Day | Place | Date | Time | Latitude | Longitude |',
  '|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.file} | ${r.day} | ${r.place} | ${r.date} | ${r.time} | ${r.lat.toFixed(6)} | ${r.lon.toFixed(6)} |`),
  '',
]
writeFileSync(join(OUT, 'README.md'), md.join('\n'))

// Read back three files and compare.
for (const r of [rows[0], rows[14], rows[rows.length - 1]].filter(Boolean)) {
  const buf = readFileSync(join(OUT, r.file))
  const t = { ...(await exifr.parse(buf, { reviveValues: false })), ...(await exifr.gps(buf)) }
  const ok = Math.abs(t.latitude - r.lat) < 1e-5 && Math.abs(t.longitude - r.lon) < 1e-5 && t.DateTimeOriginal === `${r.date.replace(/-/g, ':')} ${r.time}:00`
  console.log(`${r.file}: ${t.DateTimeOriginal} ${t.latitude.toFixed(6)}, ${t.longitude.toFixed(6)} ${ok ? 'OK' : 'MISMATCH'}`)
}
console.log(`${rows.length} files in ${OUT}`)
