// Honesty check for landing copy (owner: F0). Run: npm run landing:facts
// (also runs in the story build, from scripts/landing/build-ssr.mjs).
//
// Every number printed on the landing must come from content/facts.js through fact().
// This fails if a string literal in src/landing/content/*.js contains a digit, except:
//   - facts.js and cast.js (they are the sources)
//   - *.sample.js   sample content (captions, coordinates, timers, sample counts)
//   - *.facts.js    a package's own product numbers; instead every entry there must have
//                   a src naming a file and a line ('backend/app/utils/x.py:42')
//   - ids and paths ('lp-film', 'p-maya-wave', '/landing/img/x.webp'), hex colours,
//     and the fixed eyebrows 'STORY 01' to 'STORY 04'
// Digits inside ${...} in a template literal are code, not copy, and are not checked
// (that is where fact() goes).
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '../../src/landing/content')
const SOURCES = new Set(['facts.js', 'cast.js'])
const SRC_RE = /[\w./-]+\.\w+:\d+/

/** Every string literal in JS source, with the line it starts on. Template literals yield their text parts. */
function stringsOf(code) {
  const out = []
  let i = 0
  let line = 1
  const n = code.length
  const stack = [] // brace depth per open template ${
  while (i < n) {
    const c = code[i]
    if (c === '\n') {
      line++
      i++
      continue
    }
    // comments
    if (c === '/' && code[i + 1] === '/') {
      while (i < n && code[i] !== '\n') i++
      continue
    }
    if (c === '/' && code[i + 1] === '*') {
      i += 2
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) {
        if (code[i] === '\n') line++
        i++
      }
      i += 2
      continue
    }
    if (c === '{' && stack.length) {
      stack[stack.length - 1]++
      i++
      continue
    }
    if (c === '}' && stack.length) {
      if (stack[stack.length - 1] === 0) {
        stack.pop()
        i++
        i = readTemplate(i)
        continue
      }
      stack[stack.length - 1]--
      i++
      continue
    }
    if (c === "'" || c === '"') {
      const start = line
      let j = i + 1
      let s = ''
      while (j < n && code[j] !== c) {
        if (code[j] === '\\') {
          s += code[j + 1]
          j += 2
          continue
        }
        if (code[j] === '\n') line++
        s += code[j]
        j++
      }
      out.push({ s, line: start })
      i = j + 1
      continue
    }
    if (c === '`') {
      i = readTemplate(i + 1)
      continue
    }
    i++
  }
  return out

  // Reads template text from i up to the closing backtick or the next ${; returns the new index.
  function readTemplate(i) {
    const start = line
    let s = ''
    while (i < n) {
      const ch = code[i]
      if (ch === '\\') {
        s += code[i + 1]
        i += 2
        continue
      }
      if (ch === '`') {
        out.push({ s, line: start })
        return i + 1
      }
      if (ch === '$' && code[i + 1] === '{') {
        out.push({ s, line: start })
        stack.push(0)
        return i + 2
      }
      if (ch === '\n') line++
      s += ch
      i++
    }
    return i
  }
}

const allowed = (s) =>
  !/\d/.test(s) ||
  /^#[0-9a-f]{3,8}$/i.test(s) || // hex colour
  /^[a-z][a-z0-9]*([-_][a-z0-9]+)*$/i.test(s) || // id: lp-film, p-maya-wave, h2
  /^(\/|\.\/|\.\.\/)[\w./?=&#-]*$/.test(s) || // path or import
  /^https?:\/\/\S+$/.test(s) || // url
  /^[\s·]*STORY 0[1-4]\b[^\d]*$/.test(s) // 'STORY 01 · FEBRUARY · PROJECTS'

let failures = 0
const files = readdirSync(DIR).filter((f) => f.endsWith('.js'))
for (const f of files) {
  if (SOURCES.has(f) || f.endsWith('.sample.js')) continue
  const file = join(DIR, f)
  if (f.endsWith('.facts.js')) {
    const mod = await import(pathToFileURL(file).href)
    const obj = mod.default || Object.assign({}, ...Object.values(mod).filter((v) => v && typeof v === 'object'))
    for (const [id, e] of Object.entries(obj)) {
      if (!e || e.value == null) {
        failures++
        console.error(`  FAIL  content/${f}: "${id}" has no value`)
      } else if (!SRC_RE.test(String(e.src || ''))) {
        failures++
        console.error(`  FAIL  content/${f}: "${id}" needs a src with a file and a line, e.g. 'backend/app/api/x.py:42'`)
      }
    }
    continue
  }
  for (const { s, line } of stringsOf(readFileSync(file, 'utf-8'))) {
    if (allowed(s)) continue
    failures++
    console.error(`  FAIL  content/${f}:${line}: digit in copy "${s.length > 70 ? s.slice(0, 67) + '...' : s}" (use fact(), or move sample text to ${f.replace(/\.js$/, '.sample.js')})`)
  }
}

if (failures) {
  console.error(`\n${failures} landing fact check(s) failed.`)
  process.exit(1)
}
console.log(`landing facts: ${files.length} content files checked, no typed numbers.`)
