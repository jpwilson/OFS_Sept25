// Story HTML (one parseStory text block) -> paragraphs of styled runs (owner: book ENGINE).
// Pure string work, no DOM, so the engine runs the same in a worker, in Node and in the page.
//
//   htmlToParagraphs(html) -> [{kind:'p'|'li'|'quote'|'h2'|'h3', runs:[{text, b, i}], stops:[anchorId]}]
//
// Bold and italic survive; links become their text; a location marker becomes the place's
// short name ("Jenny Lake") and its anchor id is listed in `stops`, so the book can print
// the stop label above the paragraph. Straight quotes become typographic ones.
import { shortPlace } from '../../lib/format.js'

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…', eacute: 'é', copy: '©', middot: '·' }
export function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return cp > 0 && cp < 0x110000 ? String.fromCodePoint(cp) : ''
    }
    return NAMED[e.toLowerCase()] ?? m
  })
}

/** Straight quotes to curly ones, the way a typesetter would. */
export function educate(s) {
  return s
    .replace(/(^|[\s([{—–-])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(^|[\s([{—–-])'/g, '$1‘')
    .replace(/'/g, '’')
    .replace(/\.\.\./g, '…')
}

const BLOCKS = { p: 'p', li: 'li', blockquote: 'quote', h1: 'h2', h2: 'h2', h3: 'h3', h4: 'h3', h5: 'h3', h6: 'h3', div: 'p', figcaption: 'p', pre: 'p', dd: 'p', dt: 'p' }
const SKIP = new Set(['script', 'style', 'video', 'audio', 'iframe', 'img', 'picture', 'source', 'svg', 'figure-media'])

export function htmlToParagraphs(html) {
  const out = []
  let para = null
  let kind = 'p'
  const bold = [], ital = []
  let skip = 0
  let marker = null // {name, anchorId, depth, text}
  let spanDepth = 0

  const open = (k) => {
    if (para && para.runs.length) out.push(para)
    para = { kind: k, runs: [], stops: [] }
  }
  const close = () => {
    if (para && para.runs.some((r) => r.text.trim())) out.push(para)
    para = null
  }
  const push = (text) => {
    if (!text) return
    if (!para) para = { kind, runs: [], stops: [] }
    const b = bold.length > 0, i = ital.length > 0
    const last = para.runs[para.runs.length - 1]
    if (last && last.b === b && last.i === i) last.text += text
    else para.runs.push({ text, b, i })
  }

  const re = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g
  let last = 0
  let m
  const attr = (attrs, name) => {
    const r = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\`]+))`, 'i').exec(attrs || '')
    return r ? decodeEntities(r[1] ?? r[2] ?? r[3] ?? '') : null
  }
  const text = (raw) => {
    if (skip || !raw) return
    const t = decodeEntities(raw)
    if (marker) marker.text += t
    else push(t)
  }
  while ((m = re.exec(html))) {
    text(html.slice(last, m.index))
    last = re.lastIndex
    if (m[0].startsWith('<!--')) continue
    const tag = m[1].toLowerCase()
    const closing = m[0][1] === '/'
    if (SKIP.has(tag)) {
      if (tag === 'img' || tag === 'source') continue
      skip += closing ? -1 : 1
      skip = Math.max(0, skip)
      continue
    }
    if (tag === 'span') {
      if (!closing) {
        spanDepth++
        if (!marker && /\sdata-location-marker/i.test(m[2] || '')) {
          marker = { name: attr(m[2], 'data-location-name'), anchorId: attr(m[2], 'data-anchor-id'), depth: spanDepth, text: '' }
        }
      } else {
        if (marker && marker.depth === spanDepth) {
          const name = marker.name || marker.text.replace(/^\s*📍\s*/u, '').trim()
          const shown = shortPlace(name, 1) || name
          const m2 = marker
          marker = null
          push(shown)
          if (m2.anchorId) para.stops.push(m2.anchorId)
        }
        spanDepth = Math.max(0, spanDepth - 1)
      }
      continue
    }
    if (tag === 'strong' || tag === 'b') { closing ? bold.pop() : bold.push(1); continue }
    if (tag === 'em' || tag === 'i' || tag === 'cite') { closing ? ital.pop() : ital.push(1); continue }
    if (tag === 'br') { const k = para?.kind || kind; close(); kind = k; continue }
    if (BLOCKS[tag]) {
      if (closing) { close(); kind = 'p' } else { kind = BLOCKS[tag]; open(kind) }
      continue
    }
    if (tag === 'ul' || tag === 'ol') { close(); continue }
  }
  text(html.slice(last))
  close()

  // tidy: collapse white space, trim the ends, educate quotes
  for (const p of out) {
    let lead = true
    for (const r of p.runs) {
      r.text = educate(r.text.replace(/[ \t\n\r\f\v]+/g, ' '))
      if (lead) {
        r.text = r.text.replace(/^ +/, '')
        if (r.text) lead = false
      }
    }
    for (let k = p.runs.length - 1; k >= 0; k--) {
      p.runs[k].text = p.runs[k].text.replace(/ +$/, '')
      if (p.runs[k].text) break
    }
    p.runs = p.runs.filter((r) => r.text)
  }
  return out.filter((p) => p.runs.length)
}

/** Plain text of paragraphs (for captions, alt text and tests). */
export function plainText(paras) {
  return paras.map((p) => p.runs.map((r) => r.text).join('')).join('\n')
}
