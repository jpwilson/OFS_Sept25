// A tiny DOM for running lib/storyBlocks.js under Node (owner: book ENGINE; dev only).
// It implements exactly what parseStory touches: DOMParser.parseFromString, childNodes,
// nodeType, tagName, textContent, getAttribute/setAttribute, matches, closest,
// cloneNode, remove, querySelector(All) for "tag", "tag[attr]", "[attr]" and comma lists, and outerHTML
// serialised the way browsers do (attributes in source order, & " and no-break spaces
// escaped). check-parser.mjs proves that parseStory over this DOM gives the same blocks as
// parseStory in Chromium for every sample story. Never shipped to the browser.

const VOID = new Set(['AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT', 'LINK', 'META', 'SOURCE', 'TRACK', 'WBR'])
// starting one of these closes an open <p>, as the HTML parser does
const CLOSES_P = new Set(['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DIV', 'DL', 'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'UL'])

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…', eacute: 'é', copy: '©' }
export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
    return NAMED[e.toLowerCase()] ?? m
  })
}
const escText = (s) => s.replace(/&/g, '&amp;').replace(/ /g, '&nbsp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/ /g, '&nbsp;').replace(/"/g, '&quot;')

class Node {
  constructor(type) {
    this.nodeType = type
    this.parentNode = null
  }
}
class Text extends Node {
  constructor(data) {
    super(3)
    this.data = data
  }
  get textContent() { return this.data }
  get outerHTML() { return escText(this.data) }
  cloneNode() { return new Text(this.data) }
  remove() { removeFrom(this) }
}
function removeFrom(n) {
  const p = n.parentNode
  if (!p) return
  const i = p.childNodes.indexOf(n)
  if (i >= 0) p.childNodes.splice(i, 1)
  n.parentNode = null
}
class Element extends Node {
  constructor(tag, attrs = []) {
    super(1)
    this.tagName = tag.toUpperCase()
    this.attrs = attrs
    this.childNodes = []
  }
  append(n) {
    n.parentNode = this
    this.childNodes.push(n)
  }
  getAttribute(n) {
    const a = this.attrs.find((x) => x[0] === n.toLowerCase())
    return a ? a[1] : null
  }
  hasAttribute(n) { return this.attrs.some((x) => x[0] === n.toLowerCase()) }
  setAttribute(n, v) {
    const a = this.attrs.find((x) => x[0] === n.toLowerCase())
    if (a) a[1] = String(v)
    else this.attrs.push([n.toLowerCase(), String(v)])
  }
  get textContent() { return this.childNodes.map((c) => c.textContent).join('') }
  cloneNode(deep) {
    const e = new Element(this.tagName, this.attrs.map(([k, v]) => [k, v]))
    if (deep) for (const c of this.childNodes) e.append(c.cloneNode(true))
    return e
  }
  remove() { removeFrom(this) }
  get innerHTML() { return this.childNodes.map((c) => c.outerHTML).join('') }
  get outerHTML() {
    const t = this.tagName.toLowerCase()
    const a = this.attrs.map(([k, v]) => ` ${k}="${escAttr(v)}"`).join('')
    return VOID.has(this.tagName) ? `<${t}${a}>` : `<${t}${a}>${this.innerHTML}</${t}>`
  }
  get children() { return this.childNodes.filter((c) => c.nodeType === 1) }
  matches(sel) { return compile(sel)(this) }
  closest(sel) {
    const m = compile(sel)
    for (let e = this; e && e.nodeType === 1; e = e.parentNode) if (m(e)) return e
    return null
  }
  querySelectorAll(sel) {
    const m = compile(sel)
    const out = []
    const walk = (e) => {
      for (const c of e.childNodes) {
        if (c.nodeType !== 1) continue
        if (m(c)) out.push(c)
        walk(c)
      }
    }
    walk(this)
    return out
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null }
}

const cache = new Map()
function compile(sel) {
  let fn = cache.get(sel)
  if (fn) return fn
  const parts = sel.split(',').map((s) => s.trim()).map((s) => {
    const m = s.match(/^([a-zA-Z][a-zA-Z0-9]*)?(?:\[([a-zA-Z0-9_-]+)\])?$/)
    if (!m) throw new Error(`minidom: unsupported selector "${s}"`)
    const tag = m[1] ? m[1].toUpperCase() : null
    const attr = m[2] || null
    return (e) => (!tag || e.tagName === tag) && (!attr || e.hasAttribute(attr))
  })
  fn = (e) => parts.some((p) => p(e))
  cache.set(sel, fn)
  return fn
}

export function parseHtml(html) {
  const body = new Element('body')
  const stack = [body]
  const top = () => stack[stack.length - 1]
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-zA-Z][a-zA-Z0-9]*)\s*>|<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/gi
  let last = 0
  let m
  const text = (s) => {
    if (!s) return
    const t = decodeEntities(s)
    const kids = top().childNodes
    const prev = kids[kids.length - 1]
    if (prev && prev.nodeType === 3) prev.data += t
    else top().append(new Text(t))
  }
  while ((m = re.exec(html))) {
    text(html.slice(last, m.index))
    last = re.lastIndex
    if (m[0].startsWith('<!')) continue
    if (m[1]) {
      const tag = m[1].toUpperCase()
      if (tag === 'BODY' || tag === 'HTML') continue
      const i = stack.map((e) => e.tagName).lastIndexOf(tag)
      if (i > 0) stack.length = i
      else if (tag === 'P') top().append(new Element('p')) // a stray </p> makes an empty paragraph
      continue
    }
    const tag = m[2].toUpperCase()
    if (tag === 'BODY' || tag === 'HTML' || tag === 'HEAD') continue
    const attrs = []
    const ar = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
    let a
    while ((a = ar.exec(m[3] || ''))) {
      const name = a[1].toLowerCase()
      if (attrs.some((x) => x[0] === name)) continue
      attrs.push([name, decodeEntities(a[2] ?? a[3] ?? a[4] ?? '')])
    }
    if (CLOSES_P.has(tag)) {
      const i = stack.map((e) => e.tagName).lastIndexOf('P')
      if (i > 0) stack.length = i
    }
    const el = new Element(tag, attrs)
    top().append(el)
    if (!VOID.has(tag) && !m[4]) stack.push(el)
  }
  text(html.slice(last))
  return body
}

export class DOMParser {
  parseFromString(html) {
    const body = parseHtml(String(html))
    return { body, querySelector: (s) => body.querySelector(s), querySelectorAll: (s) => body.querySelectorAll(s) }
  }
}
