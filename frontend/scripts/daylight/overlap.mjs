// The overlap detector (owner: F0 / integration), shared by check-overlap.mjs and walk.mjs.
//
// detectOverlap() runs in the page (page.evaluate) and lists what a person would see collide
// on the screen as it stands:
//   text      visible text over other visible text
//   control   a control over another control, or text running into a control it is not part of
//   covered   text or a control under an opaque element of the page (not a bar)
//   hidden    text or a control under a fixed or sticky bar (the top bar, the tab bar, a sheet
//             footer...) that no scrolling can bring out: every scroller it sits in is already
//             at its end in that direction, or it sits in a fixed layer that does not scroll
// What it ignores: text faded below 20% or hidden, aria-hidden and inert subtrees, screen-
// reader-only text, the lines of one paragraph, everything behind an open modal (only the
// modal is checked), the parts of text clipped away by an overflow ancestor (it compares only
// what is left on screen, honouring absolute and fixed positioning), menus and popovers lying
// over the page on purpose, and anything under a translucent layer (a gradient, a scrim).
//
// sweep(page, opts) scrolls the page (or, with a modal open, the modal's scroller) from top to
// bottom in half-screen steps and collects detectOverlap() at every step.

/* eslint-disable no-undef */
export function detectOverlap() {
  const VW = innerWidth
  const VH = innerHeight
  const styles = new Map()
  const cs = (e) => {
    let s = styles.get(e)
    if (!s) styles.set(e, (s = getComputedStyle(e)))
    return s
  }
  const alpha = (c) => {
    if (!c || c === 'transparent') return 0
    const m = c.match(/\(([^)]+)\)/)
    if (!m) return 1
    const p = m[1].split(/[\s,/]+/).filter(Boolean)
    return p.length > 3 ? parseFloat(p[3]) * (p[3].endsWith('%') ? 0.01 : 1) : 1
  }
  const opaque = (e) => {
    if (e.matches('img,video,canvas,picture,iframe')) return true
    const s = cs(e)
    if (s.backdropFilter && s.backdropFilter !== 'none') return true
    if (/url\(/.test(s.backgroundImage)) return true
    return alpha(s.backgroundColor) >= 0.5
  }
  // visible at all: not hidden, not aria-hidden or inert, not faded out
  const shown = new Map()
  const isShown = (el) => {
    if (shown.has(el)) return shown.get(el)
    let o = 1
    let ok = true
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const s = cs(e)
      if (s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse') { ok = false; break }
      if (e.getAttribute('aria-hidden') === 'true' || e.inert) { ok = false; break }
      if (s.clip === 'rect(0px, 0px, 0px, 0px)' || s.clipPath === 'inset(50%)') { ok = false; break }
      o *= +s.opacity
    }
    ok = ok && o >= 0.2
    shown.set(el, ok)
    return ok
  }
  // the part of rect r left on screen once every overflow ancestor of el has clipped it
  const clip = (el, r) => {
    let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom
    let needCB = false
    for (let e = el; e && e !== document.documentElement && e !== document.body; e = e.parentElement) {
      const s = cs(e)
      const positioned = s.position !== 'static' || s.transform !== 'none' || s.filter !== 'none' || s.contain.includes('paint')
      if (needCB && !positioned) continue // an absolute box escapes this ancestor's overflow
      needCB = false
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible') {
        const b = e.getBoundingClientRect()
        const left = b.left + e.clientLeft, top = b.top + e.clientTop
        if (s.overflowX !== 'visible') { x1 = Math.max(x1, left); x2 = Math.min(x2, left + (e.clientWidth || b.width)) }
        if (s.overflowY !== 'visible') { y1 = Math.max(y1, top); y2 = Math.min(y2, top + (e.clientHeight || b.height)) }
      }
      if (s.position === 'fixed') break
      if (s.position === 'absolute') needCB = true
    }
    x1 = Math.max(x1, 0); y1 = Math.max(y1, 0); x2 = Math.min(x2, VW); y2 = Math.min(y2, VH)
    return x2 - x1 >= 3 && y2 - y1 >= 3 ? { left: x1, top: y1, right: x2, bottom: y2, width: x2 - x1, height: y2 - y1 } : null
  }
  const blockOf = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const d = cs(e).display
      if (!(d === 'inline' || d === 'contents')) return e
    }
    return document.body
  }
  const uiPath = (el) => {
    const parts = []
    for (let e = el; e && e !== document.body && parts.length < 2; e = e.parentElement) if (e.dataset?.ui) parts.unshift(e.dataset.ui)
    return parts.join('>')
  }
  const desc = (el, text) => {
    const cls = typeof el.className === 'string' && el.className ? `.${el.className.split(/\s+/)[0].replace(/^_?([A-Za-z]+)_.*$/, '$1')}` : ''
    const ui = uiPath(el)
    return `${ui ? `[${ui}] ` : ''}${el.tagName.toLowerCase()}${cls}${text ? ` "${text}"` : ''}`
  }

  // ---------------------------------------------------------------- the scope: an open modal, else the page
  const OVERLAY = '#ofsa-overlays, [role="menu"], [role="listbox"], [role="tooltip"], [role="dialog"], .yarl__portal, .maplibregl-popup'
  const modals = [...document.querySelectorAll('[aria-modal="true"], .yarl__portal_open, dialog[open]')].filter((m) => {
    if (!isShown(m)) return false
    const b = m.getBoundingClientRect()
    return b.width > 40 && b.height > 40
  })
  let scope = document.body
  for (const m of modals) {
    // the topmost: the one hit at the middle of its own box
    const b = m.getBoundingClientRect()
    const hit = document.elementFromPoint(Math.min(VW - 1, b.left + b.width / 2), Math.min(VH - 1, Math.max(0, b.top + b.height / 2)))
    if (hit && m.contains(hit)) scope = m
  }
  if (scope === document.body && modals.length) scope = modals[modals.length - 1]

  // ---------------------------------------------------------------- what is on screen
  // Map pins and their labels crowd wherever places lie close together at the zoom shown; the
  // map, not the layout, decides that (and a person zooms in). They are left to the map.
  const SKIP = 'script,style,noscript,template,svg title,.maplibregl-marker,.maplibregl-canvas-container'
  const leaves = [] // {el, blk, r, text, kind:'text'|'control'}
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const t = walker.currentNode
    const text = t.textContent.replace(/\s+/g, ' ').trim()
    if (!text) continue
    const el = t.parentElement
    if (!el) continue
    // cheap first: most of a long page is off screen
    const eb = el.getBoundingClientRect()
    if (eb.bottom < 0 || eb.top > VH || (eb.width === 0 && eb.height === 0)) continue
    if (el.closest(SKIP) || !isShown(el)) continue
    const range = document.createRange()
    range.selectNodeContents(t)
    for (const b of range.getClientRects()) {
      if (b.width < 3 || b.height < 4 || b.bottom < 0 || b.top > VH || b.right < 0 || b.left > VW) continue
      const r = clip(el, b)
      if (!r) continue
      // most of the line cut away by a clipping ancestor: a scroller or ellipsis doing its job
      if (r.height < b.height * 0.5) continue
      leaves.push({ el, blk: blockOf(el), r, full: b, text: text.slice(0, 40), kind: 'text' })
    }
  }
  const CONTROL = 'a[href],button,input:not([type="hidden"]),select,textarea,[role="button"],[role="link"],[role="radio"],[role="tab"],[role="checkbox"],[role="switch"],[role="menuitem"],summary'
  const controls = []
  for (const el of scope.querySelectorAll(CONTROL)) {
    const b = el.getBoundingClientRect()
    if (b.width < 8 || b.height < 8 || b.bottom < 0 || b.top > VH || b.right < 0 || b.left > VW) continue
    if (el.closest(SKIP) || !isShown(el)) continue
    const r = clip(el, b)
    if (!r || r.width < 8 || r.height < 8) continue
    // an input hidden inside its label (custom checkbox, file input): its label is the control
    if (el.matches('input') && (cs(el).opacity === '0' || b.width * b.height < 100)) continue
    const label = (el.getAttribute('aria-label') || el.textContent || el.value || el.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 40)
    controls.push({ el, r, text: label, kind: 'control' })
  }

  const inter = (a, b) => {
    const x = Math.min(a.right, b.right) - Math.max(a.left, b.left)
    const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
    return x > 0 && y > 0 ? { x, y, cx: (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2, cy: (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2 } : null
  }
  const layerOf = (e) => {
    for (let n = e; n && n !== document.body; n = n.parentElement) {
      const p = cs(n).position
      if (p === 'fixed' || p === 'sticky') return n
    }
    return null
  }
  const contains = (e, x, y) => {
    const b = e.getBoundingClientRect()
    return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom
  }
  // At (x, y), is the lower of two elements actually seen, or does something opaque lie between?
  const bothSeen = (x, y, a, b) => {
    const stack = document.elementsFromPoint(x, y)
    const find = (el) => stack.findIndex((e) => e === el || el.contains(e))
    const ia = find(a), ib = find(b)
    if (ia < 0 || ib < 0) {
      // one is not hit-testable (pointer-events: none, an SVG drawing). If just one of them sits in
      // a fixed or sticky bar, the bar is on top: an opaque part of the bar hides the other.
      const la = layerOf(a), lb = layerOf(b)
      if (la === lb) return true
      const [topEl, layer, lowEl] = la && !la.contains(b) ? [a, la, b] : [b, lb, a]
      if (!layer || layer.contains(lowEl)) return true
      for (let e = topEl; e; e = e.parentElement) {
        if (opaque(e) && contains(e, x, y)) return false
        if (e === layer) break
      }
      return true
    }
    const [up, low, lowEl] = ia < ib ? [ia, ib, b] : [ib, ia, a]
    for (let i = up + 1; i < low; i++) {
      const e = stack[i]
      // the lower one's own ancestors are its background; anything else opaque hides it
      if (e.contains(lowEl)) continue
      if (opaque(e)) return false
    }
    return true
  }
  // one box wholly inside the other: a button floating on a photo, a label on its own tile,
  // the show-password button inside its field. Placed there on purpose.
  const within = (a, b) => a.left >= b.left - 1 && a.right <= b.right + 1 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1
  const nested = (a, b) => within(a, b) || within(b, a)
  const out = []
  const rectOf = (r) => ({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) })
  const push = (kind, a, b, extra = {}) => out.push({ kind, a: desc(a.el, a.text), b: b ? desc(b.el, b.text) : extra.by, ra: rectOf(a.r), rb: b ? rectOf(b.r) : extra.rb, note: extra.note })

  // ---------------------------------------------------------------- text over text
  for (let i = 0; i < leaves.length; i++) {
    for (let j = i + 1; j < leaves.length; j++) {
      const a = leaves[i], c = leaves[j]
      if (a.blk === c.blk || a.el === c.el) continue
      const o = inter(a.r, c.r)
      if (!o || o.x <= 3 || o.y <= Math.min(a.r.height, c.r.height) * 0.3) continue
      if (!bothSeen(o.cx, o.cy, a.el, c.el)) continue
      push('text', a, c)
    }
  }
  // ---------------------------------------------------------------- controls over controls, text into controls
  for (let i = 0; i < controls.length; i++) {
    for (let j = i + 1; j < controls.length; j++) {
      const a = controls[i], c = controls[j]
      if (a.el.contains(c.el) || c.el.contains(a.el)) continue
      const o = inter(a.r, c.r)
      if (!o || o.x <= 4 || o.y <= 4 || nested(a.r, c.r)) continue
      if (!bothSeen(o.cx, o.cy, a.el, c.el)) continue
      push('control', a, c)
    }
  }
  for (const t of leaves) {
    for (const c of controls) {
      if (c.el.contains(t.el) || t.el.contains(c.el)) continue
      // a control's own visible label sitting next to it (label[for], aria-labelledby)
      if (t.el.closest('label') && t.el.closest('label').contains(c.el)) continue
      const o = inter(t.r, c.r)
      if (!o || o.x <= 3 || o.y <= t.r.height * 0.3 || within(t.r, c.r)) continue
      if (!bothSeen(o.cx, o.cy, t.el, c.el)) continue
      push('control', t, c, { note: 'text runs into a control' })
    }
  }

  // ---------------------------------------------------------------- covered, and hidden under a bar for good
  const scrollsY = (e) => {
    const s = cs(e)
    return (s.overflowY === 'auto' || s.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 1
  }
  // every vertical scroller el sits in, up to a fixed layer (null: a fixed layer that does not scroll)
  const scrollersOf = (el) => {
    const list = []
    for (let e = el.parentElement; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
      if (scrollsY(e)) list.push(e)
      if (cs(e).position === 'fixed') return list
    }
    list.push(document.scrollingElement)
    return list
  }
  const heldInPlace = (e) => {
    const st = cs(e)
    if (st.position === 'fixed') return true
    const b = e.getBoundingClientRect()
    const top = parseFloat(st.top)
    const bottom = parseFloat(st.bottom)
    return (!Number.isNaN(top) && Math.abs(b.top - top) < 2) || (!Number.isNaN(bottom) && Math.abs(VH - b.bottom - bottom) < 2)
  }
  const atEnd = (s, up) => (up ? s.scrollTop <= 1 : s.scrollTop + s.clientHeight >= s.scrollHeight - 1)
  const seenCover = new Set()
  for (const t of [...leaves, ...controls]) {
    const r = t.r
    const xs = r.width > 48 ? [r.left + r.width * 0.2, r.left + r.width / 2, r.left + r.width * 0.8] : [r.left + r.width / 2]
    const y = r.top + r.height / 2
    let hit = null
    for (const x of xs) {
      const stack = document.elementsFromPoint(x, y)
      for (const e of stack) {
        if (e === t.el || t.el.contains(e) || e.contains(t.el)) break
        if (opaque(e)) { hit = e; break }
      }
      if (hit) break
    }
    if (!hit) continue
    // menus, popovers, the lightbox, a tooltip: lying over the page on purpose
    const ov = hit.closest(OVERLAY)
    if (ov && !ov.contains(t.el)) continue
    const layer = layerOf(hit)
    const key = `${t.kind}|${desc(t.el, t.text)}`
    if (seenCover.has(key)) continue
    seenCover.add(key)
    if (layer && !layer.contains(t.el)) {
      const lb = layer.getBoundingClientRect()
      const side = lb.height > VH * 0.8 // a side panel: scrolling up or down never clears it
      // a bar along the top edge, or along the bottom edge, or else whichever side its middle is on
      const up = lb.top <= 2 && lb.bottom < VH - 2 ? true : lb.bottom >= VH - 2 && lb.top > 2 ? false : (lb.top + lb.bottom) / 2 < y
      // itself on a bar held in place (fixed, or sticky and resting at its offset): one bar on
      // another, and scrolling cannot part them while they are held
      const own = layerOf(t.el)
      const held = own && !own.contains(layer) && !layer.contains(own) && heldInPlace(own)
      const scrollers = scrollersOf(t.el)
      const stuck = side || held || scrollers.every((s) => atEnd(s, up))
      if (!stuck) continue
      push('hidden', t, null, { by: desc(layer, ''), rb: rectOf(lb), note: held ? 'a bar under another bar' : side ? 'under a side panel' : up ? 'under a bar above, already scrolled to the top' : 'under a bar below, already scrolled to the end' })
    } else if (!layer || layer.contains(t.el)) {
      push('covered', t, null, { by: desc(hit, ''), rb: rectOf(hit.getBoundingClientRect()) })
    }
  }
  return { findings: out, scope: scope === document.body ? 'page' : desc(scope, ''), leaves: leaves.length, controls: controls.length }
}
/* eslint-enable no-undef */

// With a modal open, mark its main vertical scroller [data-overlap-scroller]: 'inner', 'none'
// (a modal with nothing to scroll), or null (no modal: the page scrolls).
export function markScroller(page) {
  return page.evaluate(() => {
    const modals = [...document.querySelectorAll('[aria-modal="true"], .yarl__portal_open')]
    const m = modals[modals.length - 1]
    if (!m) return null
    let best = null
    for (const e of m.querySelectorAll('*')) {
      const s = getComputedStyle(e)
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 4) {
        if (!best || e.clientHeight * e.clientWidth > best.clientHeight * best.clientWidth) best = e
      }
    }
    if (!best) return 'none'
    best.setAttribute('data-overlap-scroller', '')
    return 'inner'
  })
}

// Scroll the page (or the open modal's main scroller) top to bottom and collect what collides.
// Returns {findings: [{...finding, at: {page, inner}}], steps}.
export async function sweep(page, { settle = 250, maxSteps = 100, onFinding } = {}) {
  const seen = new Map()
  const target = await markScroller(page)
  const scrollTo = (y) => page.evaluate(([t, y]) => {
    const el = t === 'inner' ? document.querySelector('[data-overlap-scroller]') : document.scrollingElement
    // a modal with nothing to scroll: one look, where it stands
    if (t !== 'none') el.scrollTo({ top: y, behavior: 'instant' })
    if (t === 'none') return { y: 0, max: 0, page: window.scrollY, inner: 0 }
    return { y: el.scrollTop, max: el.scrollHeight - el.clientHeight, page: window.scrollY, inner: t === 'inner' ? el.scrollTop : 0 }
  }, [target, y])
  const vh = page.viewportSize().height
  const step = Math.max(120, Math.round(vh * 0.5))
  let y = 0
  let steps = 0
  for (;;) {
    const at = await scrollTo(y)
    await page.waitForTimeout(settle)
    const res = await page.evaluate(detectOverlap)
    steps++
    for (const f of res.findings) {
      const key = `${f.kind}|${f.a}|${f.b}`
      if (seen.has(key)) continue
      const rec = { ...f, at: { page: at.page, inner: at.inner }, scope: res.scope }
      seen.set(key, rec)
      if (onFinding) await onFinding(rec)
    }
    if (at.y >= at.max - 1 || steps >= maxSteps) break
    // a feed that grows as it scrolls: keep going, up to maxSteps
    y = Math.min(at.y + step, at.max)
  }
  return { findings: [...seen.values()], steps }
}

// Outline the boxes of some findings on the page (for a screenshot), and remove them again.
export async function highlight(page, findings) {
  await page.evaluate((fs) => {
    const host = document.createElement('div')
    host.id = 'overlap-highlight'
    host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647'
    for (const f of fs) {
      for (const [r, c] of [[f.ra, '#e0007a'], [f.rb, '#ff8a00']]) {
        if (!r) continue
        const d = document.createElement('div')
        d.style.cssText = `position:absolute;left:${r.x - 2}px;top:${r.y - 2}px;width:${r.w + 4}px;height:${r.h + 4}px;outline:2px solid ${c};background:${c}22`
        host.appendChild(d)
      }
    }
    document.body.appendChild(host)
  }, findings)
}
export const unhighlight = (page) => page.evaluate(() => document.getElementById('overlap-highlight')?.remove())
