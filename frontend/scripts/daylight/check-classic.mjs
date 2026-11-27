#!/usr/bin/env node
// Proves a classic build is byte-identical to the build taken before any Daylight work
// (docs/app/SPEC.md decision 2; docs/app/PLAN-DAYLIGHT.md section 5.3). Owner: F0.
//
//   VITE_LANDING=classic VITE_APP_LOOK=classic npm run build
//   node scripts/daylight/check-classic.mjs                       # dist vs the committed manifest
//   node scripts/daylight/check-classic.mjs --baseline <dir|json> --candidate <dir>
//   node scripts/daylight/check-classic.mjs --write <dir>         # record a baseline manifest (once)
//
// Passes only if:
//   1. the file lists are identical and every file has the same SHA-256;
//   2. index.html, sw.js and the main chunk (by its hashed name) are explicitly equal;
//   3. no file in the candidate contains "ofsa", "maplibre" or "daylight" (case-sensitive:
//      exifreader ships the EXIF light-source name "Daylight", which is in the baseline);
//   4. nothing under frontend/src outside frontend/src/daylight differs from the base commit
//      (tracked changes and untracked files both count);
//   5. index.html, public/, vercel.json, scripts/prerender.mjs and the package.json scripts
//      are unchanged from the base commit.
// Exit code 0 on pass, 1 on any failure. Prints a short report either way.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND = path.resolve(HERE, '../..')
const REPO = path.resolve(FRONTEND, '..')
const MANIFEST = path.join(HERE, 'classic-baseline.json')
// The landing commit last merged into app/daylight (3879ce5, the journey-pin logo); the baseline
// manifest is a classic build of it. Re-record both after the next landing merge. Override with --base.
const BASE_COMMIT = '3879ce5'
const FORBIDDEN = /ofsa|maplibre|daylight/

const args = { candidate: path.join(FRONTEND, 'dist'), baseline: MANIFEST, base: BASE_COMMIT, write: null }
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i].replace(/^--/, '')
  args[k] = process.argv[++i]
}

function walk(dir, root = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, root, out)
    else out.push(path.relative(root, p).split(path.sep).join('/'))
  }
  return out.sort()
}
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
function hashDir(dir) {
  const files = {}
  for (const f of walk(dir)) files[f] = sha(path.join(dir, f))
  return files
}
// The app's main chunk: the largest assets/index-*.js (boot-app.jsx is the entry in a classic build).
function mainChunk(files) {
  return Object.keys(files).filter((f) => /^assets\/index-[\w-]+\.js$/.test(f))
}

if (args.write) {
  const dir = path.resolve(args.write)
  const files = hashDir(dir)
  const record = {
    note: 'SHA-256 of every file in a classic build (VITE_LANDING=classic npm run build) taken before any Daylight edit. Two consecutive builds were identical.',
    base: args.base,
    taken: new Date().toISOString().slice(0, 10),
    node: process.version,
    count: Object.keys(files).length,
    files,
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(record, null, 1) + '\n')
  console.log(`wrote ${path.relative(FRONTEND, MANIFEST)}: ${record.count} files`)
  process.exit(0)
}

const failures = []
const fail = (msg) => failures.push(msg)

// ---------------------------------------------------------------- 1, 2: bytes
const baseFiles = args.baseline.endsWith('.json')
  ? JSON.parse(fs.readFileSync(path.resolve(args.baseline), 'utf8')).files
  : hashDir(path.resolve(args.baseline))
if (!fs.existsSync(args.candidate)) {
  console.error(`candidate ${args.candidate} does not exist; build first`)
  process.exit(1)
}
const candFiles = hashDir(path.resolve(args.candidate))
const onlyBase = Object.keys(baseFiles).filter((f) => !(f in candFiles))
const onlyCand = Object.keys(candFiles).filter((f) => !(f in baseFiles))
const differ = Object.keys(baseFiles).filter((f) => f in candFiles && baseFiles[f] !== candFiles[f])
if (onlyBase.length) fail(`missing from candidate (${onlyBase.length}): ${onlyBase.slice(0, 8).join(', ')}`)
if (onlyCand.length) fail(`new in candidate (${onlyCand.length}): ${onlyCand.slice(0, 8).join(', ')}`)
if (differ.length) fail(`bytes differ (${differ.length}): ${differ.slice(0, 8).join(', ')}`)
for (const f of ['index.html', 'sw.js']) {
  if (baseFiles[f] !== candFiles[f]) fail(`${f} differs`)
}
const mb = mainChunk(baseFiles), mc = mainChunk(candFiles)
if (mb.join() !== mc.join()) fail(`main chunk name differs: ${mb.join()} vs ${mc.join()}`)

// ---------------------------------------------------------------- 3: strings
const hits = []
for (const f of Object.keys(candFiles)) {
  const buf = fs.readFileSync(path.join(args.candidate, f))
  if (FORBIDDEN.test(buf.toString('latin1'))) hits.push(f)
}
if (hits.length) fail(`forbidden strings (ofsa|maplibre|daylight) in: ${hits.slice(0, 8).join(', ')}`)

// ---------------------------------------------------------------- 4, 5: inputs
function git(...a) {
  return execFileSync('git', a, { cwd: REPO, encoding: 'utf8' }).trim()
}
let gitNote = ''
try {
  const tracked = git('diff', '--name-only', args.base, '--', 'frontend/src', ':!frontend/src/daylight')
  const untracked = git('ls-files', '--others', '--exclude-standard', '--', 'frontend/src', ':!frontend/src/daylight')
  const changed = [tracked, untracked].filter(Boolean).join('\n')
  if (changed) fail(`existing frontend/src files changed:\n    ${changed.split('\n').join('\n    ')}`)
  const inputs = git('diff', '--name-only', args.base, '--', 'frontend/index.html', 'frontend/public', 'frontend/vercel.json', 'frontend/scripts/prerender.mjs')
  const inputsNew = git('ls-files', '--others', '--exclude-standard', '--', 'frontend/public')
  if (inputs || inputsNew) fail(`classic build inputs changed:\n    ${[inputs, inputsNew].filter(Boolean).join('\n    ')}`)
  const pkgThen = JSON.parse(git('show', `${args.base}:frontend/package.json`))
  const pkgNow = JSON.parse(fs.readFileSync(path.join(FRONTEND, 'package.json'), 'utf8'))
  if (JSON.stringify(pkgThen.scripts) !== JSON.stringify(pkgNow.scripts)) fail('package.json scripts changed')
  const deps = Object.keys(pkgNow.dependencies).filter((d) => pkgThen.dependencies[d] !== pkgNow.dependencies[d])
  const notAdded = deps.filter((d) => d in pkgThen.dependencies)
  if (notAdded.length) fail(`existing dependency versions changed: ${notAdded.join(', ')}`)
  gitNote = deps.length ? `added dependencies: ${deps.map((d) => `${d}@${pkgNow.dependencies[d]}`).join(', ')}` : 'no dependency changes'
} catch (e) {
  fail(`git checks could not run: ${e.message.split('\n')[0]}`)
}

// ---------------------------------------------------------------- report
const n = Object.keys(candFiles).length
console.log(`classic byte-proof: candidate ${path.relative(process.cwd(), args.candidate) || '.'} vs ${args.baseline.endsWith('.json') ? path.relative(process.cwd(), args.baseline) : args.baseline}`)
console.log(`  files: ${n} candidate, ${Object.keys(baseFiles).length} baseline; differing ${differ.length}; main chunk ${mc.join() || '(none)'}`)
console.log(`  inputs: base ${args.base}; ${gitNote}`)
if (failures.length) {
  console.log(`FAIL (${failures.length})`)
  for (const f of failures) console.log(`  - ${f}`)
  process.exit(1)
}
console.log('PASS: identical file list, identical SHA-256 for every file, no Daylight strings, no existing source edited')
