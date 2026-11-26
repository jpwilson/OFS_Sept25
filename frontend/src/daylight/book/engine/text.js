// Measuring and breaking text with the real font files (owner: book ENGINE).
//
//   FONT_FILES                      font id -> {file, family, weight, style}; files live in /book/fonts/
//   loadFonts(readBytes) -> Promise<Fonts>     readBytes(fileName) -> bytes (fetch in the browser, fs in Node)
//   makeFonts({[fontId]: bytes}) -> Fonts      the same, synchronously, from bytes you already have
//   Fonts: {font(id), measure(id, size, text, tracking = 0) -> points, missing(id, text) -> [chars]}
//   breakParagraph(fonts, runs, {width, size, leading, style}) -> [{runs:[{text, font, dx, w}], w, last}]
//
// Ragged right, no hyphenation (BOOKS.md "Rules"): a line breaks at a space, or after a
// hyphen or dash already in the text when a word is too long, and only splits a word by
// letters when one word is wider than the whole measure. Widths include the fonts' pair
// kerning, so a drawer must draw with kerning on (browsers do by default; a PDF writer must
// lay out runs with GPOS kerning, as pdf-lib's fontkit embedding does).
import { parseFont } from './fontfile.js'

export const FONT_BASE = '/book/fonts/'

export const FONT_FILES = {
  story: { file: 'Literata-Regular.ttf', family: 'Literata', weight: 400, style: 'normal' },
  'story-italic': { file: 'Literata-Italic.ttf', family: 'Literata', weight: 400, style: 'italic' },
  'story-bold': { file: 'Literata-Bold.ttf', family: 'Literata', weight: 700, style: 'normal' },
  'story-bold-italic': { file: 'Literata-BoldItalic.ttf', family: 'Literata', weight: 700, style: 'italic' },
  ui: { file: 'BricolageGrotesque12pt-Regular.ttf', family: 'Bricolage Grotesque 12pt', weight: 400, style: 'normal' },
  'ui-semibold': { file: 'BricolageGrotesque12pt-SemiBold.ttf', family: 'Bricolage Grotesque 12pt', weight: 600, style: 'normal' },
  heading: { file: 'BricolageGrotesque-ExtraBold.ttf', family: 'Bricolage Grotesque', weight: 800, style: 'normal' },
  display: { file: 'BricolageGrotesque96pt-ExtraBold.ttf', family: 'Bricolage Grotesque 96pt', weight: 800, style: 'normal' },
  mono: { file: 'DMMono-Regular.ttf', family: 'DM Mono', weight: 400, style: 'normal' },
  'mono-medium': { file: 'DMMono-Medium.ttf', family: 'DM Mono', weight: 500, style: 'normal' },
}

/** Story text styles -> font id. */
export function storyFont(b, i) {
  return b ? (i ? 'story-bold-italic' : 'story-bold') : i ? 'story-italic' : 'story'
}

export async function loadFonts(readBytes) {
  const ids = Object.keys(FONT_FILES)
  const files = await Promise.all(ids.map((id) => readBytes(FONT_FILES[id].file)))
  return makeFonts(Object.fromEntries(ids.map((id, i) => [id, files[i]])))
}

export function makeFonts(bytesById) {
  const parsed = {}
  for (const [id, b] of Object.entries(bytesById)) parsed[id] = parseFont(b)
  const font = (id) => {
    const f = parsed[id]
    if (!f) throw new Error(`no font "${id}"`)
    return f
  }
  const widthCache = new Map()
  /** Advance width of text in points, kerning included; tracking is added between characters. */
  function measure(id, size, text, tracking = 0) {
    const key = `${id}|${text}`
    let units = widthCache.get(key)
    if (units === undefined) {
      const f = font(id)
      units = 0
      let prev = 0
      for (const ch of text) {
        const g = f.glyph(ch.codePointAt(0))
        if (prev) units += f.kern(prev, g)
        units += f.advance(g)
        prev = g
      }
      units /= f.unitsPerEm
      widthCache.set(key, units)
    }
    const n = [...text].length
    return units * size + (n > 1 ? tracking * (n - 1) : 0)
  }
  /** Characters in text that the font has no glyph for (spaces and controls are ignored). */
  function missing(id, text) {
    const f = font(id)
    const out = new Set()
    for (const ch of text) {
      const cp = ch.codePointAt(0)
      if (cp <= 0x20 || cp === 0xa0 || cp === 0x200b) continue
      if (!f.glyph(cp)) out.add(ch)
    }
    return [...out]
  }
  return { font, measure, missing, ids: Object.keys(parsed) }
}

const BREAK_AFTER = /[-‐–—/]/

/**
 * Break one paragraph into lines.
 * runs: [{text, font}] (a font id per run). width: the measure in points.
 * Returns lines: {runs:[{text, font, dx, w}], w, last}. dx is the run's offset from the
 * line's start. Spaces at line ends are dropped; spaces between runs stay in the runs.
 */
export function breakParagraph(fonts, runs, { width, size, tracking = 0 }) {
  // tokens: words (possibly spanning runs) separated by single spaces
  const words = [] // [{pieces:[{text, font}]}]
  let cur = null
  for (const r of runs) {
    // ordinary white space breaks; a no-break space stays inside its word
    const parts = String(r.text).replace(/[ \t\n\r\f\v]+/g, ' ').split(/( )/)
    for (const p of parts) {
      if (p === ' ') {
        if (cur) words.push(cur)
        cur = null
        continue
      }
      if (!p) continue
      cur ||= { pieces: [] }
      const last = cur.pieces[cur.pieces.length - 1]
      if (last && last.font === r.font) last.text += p
      else cur.pieces.push({ text: p, font: r.font })
    }
  }
  if (cur) words.push(cur)
  if (!words.length) return []

  const wordWidth = (w) => w.pieces.reduce((s, p) => s + fonts.measure(p.font, size, p.text, tracking), 0)
  const spaceWidth = (font) => fonts.measure(font, size, ' ') + tracking

  // split words that cannot fit on a line by themselves
  const fitted = []
  for (const w of words) {
    if (wordWidth(w) <= width) { fitted.push(w); continue }
    fitted.push(...splitWord(w, (x) => wordWidth(x) <= width))
  }

  const lines = []
  let line = []
  let lw = 0
  for (const w of fitted) {
    const ww = wordWidth(w)
    if (!line.length) { line.push(w); lw = ww; continue }
    const sp = spaceWidth(w.pieces[0].font)
    if (lw + sp + ww <= width + 0.001) { line.push(w); lw += sp + ww; continue }
    lines.push(line)
    line = [w]
    lw = ww
  }
  if (line.length) lines.push(line)

  return lines.map((ws, i) => {
    // merge into runs: a space joins the preceding run's font
    const out = []
    ws.forEach((w, k) => {
      w.pieces.forEach((p, j) => {
        if (k > 0 && j === 0) out[out.length - 1].text += ' '
        const last = out[out.length - 1]
        if (last && last.font === p.font) last.text += p.text
        else out.push({ text: p.text, font: p.font })
      })
    })
    let dx = 0
    const placed = out.map((r) => {
      const w = fonts.measure(r.font, size, r.text, tracking)
      const run = { text: r.text, font: r.font, dx, w }
      dx += w + (tracking || 0)
      return run
    })
    const last = placed[placed.length - 1]
    // a run ending in a space (before a font change) does not count toward the width
    const trailing = last.text.endsWith(' ') ? fonts.measure(last.font, size, ' ') : 0
    return { runs: placed, w: dx - (tracking || 0) - trailing, last: i === lines.length - 1 }
  })
}

// A word too wide for the measure: break after a hyphen or dash when that helps, else by letters.
function splitWord(word, fits) {
  const text = word.pieces.map((p) => p.text).join('')
  const fontAt = []
  for (const p of word.pieces) for (const ch of p.text) fontAt.push(p.font)
  const chars = [...text]
  const make = (from, to) => {
    const pieces = []
    for (let i = from; i < to; i++) {
      const last = pieces[pieces.length - 1]
      if (last && last.font === fontAt[i]) last.text += chars[i]
      else pieces.push({ text: chars[i], font: fontAt[i] })
    }
    return { pieces }
  }
  const out = []
  let start = 0
  while (start < chars.length) {
    let end = chars.length
    if (fits(make(start, end))) { out.push(make(start, end)); break }
    // longest prefix that fits, preferring one that ends after a dash
    let best = start + 1, bestDash = -1
    for (let e = start + 1; e <= chars.length; e++) {
      if (!fits(make(start, e))) break
      best = e
      if (BREAK_AFTER.test(chars[e - 1])) bestDash = e
    }
    end = bestDash > start ? bestDash : best
    out.push(make(start, end))
    start = end
  }
  return out
}
