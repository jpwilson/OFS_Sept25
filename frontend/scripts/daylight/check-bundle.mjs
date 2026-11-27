#!/usr/bin/env node
// The map can never join the main bundle (owner: F0). PLAN-DAYLIGHT 3.8.
//
//   node scripts/daylight/check-bundle.mjs [--dist dist] [--classic <classic dist dir>]
//
// Reads the Vite manifest (dist/.vite/manifest.json, or the copy the seam plugin keeps in
// node_modules/.daylight/ because scripts/prerender.mjs deletes dist/.vite) and fails if:
//   - any chunk other than MapLibre's own statically imports maplibre-gl (so it can only
//     arrive through the dynamic import in src/daylight/map/engine.js);
//   - the entry's static closure contains anything from src/daylight/map/ except nothing
//     (the map package is always behind a lazy page);
//   - the service worker precaches a maplibre file.
// Prints raw and gzip sizes of the main bundle, the map library, its worker and CSS.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND = path.resolve(HERE, '../..')
const args = { dist: path.join(FRONTEND, 'dist'), classic: null }
for (let i = 2; i < process.argv.length; i++) args[process.argv[i].replace(/^--/, '')] = process.argv[++i]
const DIST = path.resolve(args.dist)

const mfFile = [path.join(DIST, '.vite/manifest.json'), path.join(FRONTEND, 'node_modules/.daylight/vite-manifest.json')].find((f) => fs.existsSync(f))
if (!mfFile) {
  console.error('no Vite manifest found: build a Daylight look first (VITE_APP_LOOK=daylight)')
  process.exit(1)
}
const mf = JSON.parse(fs.readFileSync(mfFile, 'utf8'))
const failures = []
const isMapLib = (k) => /node_modules\/maplibre-gl\//.test(k)
const isMapPkg = (k) => /src\/daylight\/map\//.test(k)

function closure(key, seen = new Set()) {
  if (seen.has(key) || !mf[key]) return seen
  seen.add(key)
  for (const i of mf[key].imports || []) closure(i, seen)
  return seen
}

for (const key of Object.keys(mf)) {
  if (isMapLib(key)) continue
  const bad = [...closure(key)].filter((k) => k !== key && isMapLib(k))
  if (bad.length) failures.push(`${key} statically imports ${bad.join(', ')}`)
}
// The app's main bundle: src/boot-app.jsx (the HTML entry in a classic-landing build, a
// dynamic import of src/main.jsx in a story-landing build). Both closures are checked.
const entryKey = Object.keys(mf).find((k) => mf[k].isEntry && /index\.html$/.test(k)) || Object.keys(mf).find((k) => mf[k].isEntry)
const appKey = mf['src/boot-app.jsx'] ? 'src/boot-app.jsx' : Object.keys(mf).find((k) => mf[k].name === 'boot-app' && mf[k].file.endsWith('.js')) || entryKey
const entryClosure = [...new Set([...closure(entryKey), ...closure(appKey)])]
const mapInEntry = entryClosure.filter((k) => isMapLib(k) || isMapPkg(k))
if (mapInEntry.length) failures.push(`the main bundle contains map code: ${mapInEntry.join(', ')}`)

const swFile = path.join(DIST, 'sw.js')
// the precache list is url:"..." entries; the runtime-cache rule for the map chunks names maplibre too
const precached = fs.existsSync(swFile) ? [...fs.readFileSync(swFile, 'utf8').matchAll(/url:"([^"]+)"/g)].map((m) => m[1]) : []
const precachedMap = precached.filter((u) => /maplibre/.test(u))
if (precachedMap.length) failures.push(`sw.js precaches ${precachedMap.join(', ')}`)

// ---------------------------------------------------------------- sizes
const size = (file) => {
  const p = path.join(DIST, file)
  if (!fs.existsSync(p)) return { raw: 0, gz: 0 }
  const b = fs.readFileSync(p)
  return { raw: b.length, gz: zlib.gzipSync(b, { level: 9 }).length }
}
const sum = (files) => files.reduce((a, f) => { const s = size(f); return { raw: a.raw + s.raw, gz: a.gz + s.gz } }, { raw: 0, gz: 0 })
const fmt = ({ raw, gz }) => `${raw.toLocaleString('en-US').padStart(10)} raw  ${gz.toLocaleString('en-US').padStart(9)} gzip`

const entryJs = [...new Set(entryClosure.map((k) => mf[k].file).filter((f) => f.endsWith('.js')))]
const entryCss = [...new Set(entryClosure.flatMap((k) => mf[k].css || []))]
const assets = fs.readdirSync(path.join(DIST, 'assets'))
const libJs = assets.filter((f) => /^maplibre-gl-(?!worker)[\w-]+\.js$/.test(f)).map((f) => `assets/${f}`)
const worker = assets.filter((f) => /^maplibre-gl-worker-[\w-]+\.mjs$/.test(f)).map((f) => `assets/${f}`)
const libCss = assets.filter((f) => /^maplibre-gl-[\w-]+\.css$/.test(f)).map((f) => `assets/${f}`)
const ourMap = [...new Set(Object.keys(mf).filter(isMapPkg).flatMap((k) => [mf[k].file]))]
if (!libJs.length) failures.push('no maplibre-gl chunk found in dist/assets (is the map imported at all?)')
if (!worker.length) failures.push('no maplibre-gl-worker asset found in dist/assets')

console.log(`precache: ${precached.length} files, ${precachedMap.length} maplibre`)
console.log(`bundle report: ${path.relative(process.cwd(), DIST) || '.'} (manifest ${path.relative(process.cwd(), mfFile)})`)
console.log(`  app main JS      ${fmt(sum(entryJs))}   ${entryJs.length} files (${entryJs.slice(0, 3).join(', ')}${entryJs.length > 3 ? ', ...' : ''})`)
console.log(`  app main CSS    ${fmt(sum(entryCss))}   ${entryCss.length} files`)
console.log(`  maplibre-gl JS   ${fmt(sum(libJs))}   ${libJs.join(', ')}`)
console.log(`  maplibre worker  ${fmt(sum(worker))}   ${worker.join(', ')}`)
console.log(`  maplibre CSS     ${fmt(sum(libCss))}   ${libCss.join(', ')}`)
console.log(`  our map code     ${fmt(sum(ourMap))}   ${ourMap.length} chunks`)
// ---------------------------------------------------------------- the family tree (docs/app/FAMILY.md section 7)
// Nothing from React Flow or html-to-image may be reachable, statically or lazily, from
// src/daylight/family/: they stay in package.json for the classic page behind ?look=classic.
// Family chunks: by source path, or the page's own chunk (Rollup keys it "_FamilyPage-…" when
// another family chunk imports it). Their static imports are followed all the way; lazy imports
// only from family chunks themselves (the app's shared chunks lazily reach every page).
const isFamily = (k) => /src\/daylight\/family\//.test(k) || /src\/daylight\/family\//.test(mf[k]?.src || '') || (mf[k]?.name === 'FamilyPage' && /\.js$/.test(mf[k]?.file || ''))
const isClassicTree = (k) => /src\/(components\/FamilyTreeGraph|pages\/FamilyTree)\.jsx$/.test(k) || /node_modules\/(reactflow|@reactflow\/|html-to-image)\//.test(k)
const flowCode = new Map()
const carriesFlow = (k) => {
  const file = mf[k]?.file
  if (!file || !file.endsWith('.js')) return false
  if (!flowCode.has(file)) {
    const p = path.join(DIST, file)
    const src = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''
    flowCode.set(file, /react-flow__|html-to-image|reactflow/.test(src))
  }
  return flowCode.get(file)
}
function reach(key, seen = new Set()) {
  if (seen.has(key) || !mf[key]) return seen
  seen.add(key)
  for (const i of mf[key].imports || []) reach(i, seen)
  if (isFamily(key)) for (const i of mf[key].dynamicImports || []) reach(i, seen)
  return seen
}
const familyKeys = Object.keys(mf).filter(isFamily)
if (!familyKeys.length) failures.push('no src/daylight/family chunk in the manifest (is /family-tree seamed?)')
for (const k of familyKeys) {
  const bad = [...reach(k)].filter((x) => isClassicTree(x) || carriesFlow(x))
  if (bad.length) failures.push(`${k} can reach the classic tree's libraries: ${bad.join(', ')}`)
}
const familyFiles = [...new Set(familyKeys.map((k) => mf[k].file))]
console.log(`  family tree      ${fmt(sum(familyFiles.filter((f) => f.endsWith('.js'))))}   ${familyFiles.join(', ')}`)
if (args.classic) {
  const c = path.resolve(args.classic)
  const html = fs.readFileSync(path.join(c, 'index.html'), 'utf8')
  const main = (html.match(/src="\/(assets\/index-[\w-]+\.js)"/) || [])[1]
  if (main) {
    const b = fs.readFileSync(path.join(c, main))
    console.log(`  classic main JS  ${fmt({ raw: b.length, gz: zlib.gzipSync(b, { level: 9 }).length })}   ${main} (for comparison)`)
  }
}
if (failures.length) {
  console.log(`FAIL (${failures.length})`)
  for (const f of failures) console.log(`  - ${f}`)
  process.exit(1)
}
console.log('PASS: maplibre-gl is reachable only through the dynamic import in src/daylight/map/engine.js, and the service worker does not precache it')
console.log('PASS: src/daylight/family/ reaches neither React Flow nor html-to-image')
