// The paginator (owner: book ENGINE). Book source + edits -> a fully laid-out interior.
//
//   paginate(source, directives, {product, fonts}) -> {pages:[PagePlan], stats, notices}
//   (layoutBook in index.js turns the plans into the display list.)
//
// How it decides, in order:
// 1. Each section is a run of units (text, then the photos that follow it). A dynamic
//    programme lays out each section for each way it can start (left or right page, and what
//    the facing page was), choosing among: an opener (full page, with the first text, or with
//    the lead photo), text pages, text with a photo, and photo pages (full bleed, framed
//    single, pair, trio, grid of four) for groups of one to four consecutive photos.
// 2. Cost = pages × density - the value of each photo's size (its priority × the square root
//    of its share of the page) + cropping + rhythm penalties. Hard rules are never broken: a
//    paragraph shares a spread with the first photo after it, a full-bleed page faces a quiet
//    one, never three grid pages in a row, no slot below its resolution floor, crop caps.
// 3. Sections are chained by page parity; the back matter makes the count even.
// 4. The page count must be even and 20 to 120: a short book opens up (density falls until
//    every photo has its own page, then blank pages before the back matter, with a notice);
//    a long one tightens (density rises; singles only for leads), then reports it cannot fit.
import { pageLimits } from './products.js'
import { MARGIN_IN, SAFE_EXTRA, TYPE, LAYOUT } from './style.js'
import { buildFlow, fillText, flowHeight, framed, photoCandidates, capHeight } from './templates.js'
import { breakParagraph } from './text.js'

// ---------------------------------------------------------------- page geometry

export function makeContext(product, fonts) {
  const t = product.trim, b = product.bleed, sf = product.safe
  const m = {
    top: Math.max(MARGIN_IN.top * 72, sf.top + SAFE_EXTRA),
    bottom: Math.max(MARGIN_IN.bottom * 72, sf.bottom + SAFE_EXTRA),
    outside: Math.max(MARGIN_IN.outside * 72, sf.outside + SAFE_EXTRA),
    inside: Math.max(MARGIN_IN.inside * 72, sf.inside + SAFE_EXTRA),
  }
  const cb = { w: t.w - m.inside - m.outside, h: t.h - m.top - m.bottom }
  // the measure: about 65 characters of story text, from the font's real widths
  const sample = 'We drove out in the dark to the old barn, and the sun came up and lit the peaks pink, one at a time, from the top down.'
  const perChar = fonts.measure('story', TYPE.body.size, sample) / sample.length
  const measure = Math.min(cb.w, Math.round(perChar * TYPE.body.chars))
  const page = {
    w: t.w, h: t.h,
    bleedT: b.top, bleedB: b.bottom,
    bleedW: b.inside + b.outside, bleedH: b.top + b.bottom,
    bleedL: b.outside, // overwritten per side by cbAt
  }
  const ctx = {
    product, fonts, page, margins: m, cb, measure,
    gap: LAYOUT.gap,
    ppi: LAYOUT.ppi,
    leadPpi: Math.max(LAYOUT.leadPpi, product.minPpi),
    wide: cb.w - measure - 24 >= cb.w * 0.38,
  }
  /** Media box, trim box, safe box and content box of a page, in its own media coordinates. */
  ctx.boxes = (side) => {
    const left = side === 'left'
    const bl = left ? b.outside : b.inside
    const br = left ? b.inside : b.outside
    const media = { x: 0, y: 0, w: t.w + bl + br, h: t.h + b.top + b.bottom }
    const trim = { x: bl, y: b.top, w: t.w, h: t.h }
    const sl = left ? sf.outside : sf.inside, sr = left ? sf.inside : sf.outside
    const safe = { x: trim.x + sl, y: trim.y + sf.top, w: t.w - sl - sr, h: t.h - sf.top - sf.bottom }
    const ml = left ? m.outside : m.inside
    const content = { x: trim.x + ml, y: trim.y + m.top, w: cb.w, h: cb.h }
    return { media, trim, bleed: media, safe, content }
  }
  return ctx
}

// ---------------------------------------------------------------- priorities

function priorities(source, directives) {
  const prio = {}
  for (const sec of source.sections) {
    const ids = sec.units.flatMap((u) => u.photos)
    let most = null
    for (const id of ids) if (source.photos[id].reactions > 0 && (!most || source.photos[id].reactions > source.photos[most].reactions)) most = id
    for (const u of sec.units) {
      for (const id of u.photos) {
        const p = source.photos[id]
        let v = 1
        if (p.lead) v += 1.6
        if (p.cover) v += 0.8
        if (u.photos.length === 1) v += 0.6
        if (p.caption) v += 0.1
        if (id === most) v += 1
        if (directives.big.has(id)) v += 6
        if (directives.small.has(id)) v = 0.3
        prio[id] = v
      }
    }
  }
  return prio
}

// ---------------------------------------------------------------- one section

const QUIET = new Set(['quiet', 'opener'])

export function sectionPlans(ctx, source, sec, directives, prio, knobs) {
  const units = sec.units.map((u) => ({ flow: buildFlow(ctx, u.paras), photos: u.photos.map((id) => source.photos[id]) }))
  const hasOpener = sec.kind === 'chapter'
  const anyPhotos = units.some((u) => u.photos.length)
  const H = ctx.cb.h
  const band = hasOpener ? openerBand(ctx, sec) : null
  const memo = new Map()
  const cands = new Map()
  const candsFor = (group) => {
    const key = group.map((p) => p.id).join(',')
    let c = cands.get(key)
    if (!c) {
      const allowBleed = !knobs.tight && !group.some((p) => directives.small.has(p.id))
      c = photoCandidates(ctx, group, { allowBleed })
      if (group.length === 1 && directives.small.has(group[0].id)) {
        const f = framed(ctx, group[0], { maxShare: 0.3 })
        c = f ? [Object.assign(f, { held: true })] : c
      }
      cands.set(key, c)
    }
    return c
  }
  // a photo under text: the area left below the text, if it is enough for a real photo
  const photoUnder = (ph, textH) => {
    const area = { w: ctx.cb.w, h: H - textH - 18 }
    if (area.h < H * 0.36) return null
    const c = framed(ctx, ph, { area })
    return c && c.slots[0].h >= H * 0.28 && c.coverage >= 0.3 ? c : null
  }
  const value = (cand) => cand.slots.reduce((s, sl) => s + (prio[sl.id] || 1) * Math.sqrt(Math.min(1.3, cand.sizeShare[sl.id])), 0)
  const tplOf = (plan) => (plan.kind === 'photos' ? plan.cand.template : plan.kind)
  // a photo given most of a page counts as the section's full-page photo (BOOKS.md rhythm rule)
  const big = (c) => c.slots.length === 1 && !c.held && Object.values(c.sizeShare)[0] >= 0.5

  // state: unit u, text item t, photo p; the side of the next page ('L'|'R'); when it is R,
  // the rhythm kind and template of the left page facing it; the grid run; whether a single
  // photo page has been placed; whether the opener is done; the last page's template; the
  // previous spread's two templates (to vary the rhythm)
  function go(u, t, p, side, facing, leftTpl, grids, single, started, lastTpl, prevSpread) {
    while (u < units.length && t >= units[u].flow.length && p >= units[u].photos.length) { u++; t = 0; p = 0 }
    if (hasOpener && !started && u >= units.length) u = 0
    const key = `${u}|${t}|${p}|${side}|${facing}|${leftTpl}|${grids}|${single}|${started}|${lastTpl}|${prevSpread}`
    if (memo.has(key)) return memo.get(key)
    let best = null
    if (u >= units.length && (!hasOpener || started)) {
      const pen = anyPhotos && !single ? 4 : 0
      best = { cost: pen, plans: [], end: { side, facing: side === 'R' ? facing : null } }
      memo.set(key, best)
      return best
    }
    const nextSide = side === 'L' ? 'R' : 'L'
    /**
     * Consider placing one page. kind: its rhythm kind (quiet, opener, busy, bleed, single,
     * pair, trio, grid). cost: before rhythm. next: [u, t, p, single, started].
     */
    const place = (kind, plan, cost, [nu, nt, np, nsingle, nstarted]) => {
      if (side === 'R' && facing === 'bleed' && !QUIET.has(kind)) return
      if (side === 'R' && kind === 'bleed' && !QUIET.has(facing)) return
      if (kind === 'grid' && grids >= 2) return
      const tpl = tplOf(plan)
      // opening a slim book up spends pages on photos and openers, never on thinner text
      let c = cost + (plan.kind === 'text' ? Math.max(knobs.lambda, 0.7) : knobs.lambda)
      if (knobs.open) {
        if (plan.kind === 'opener') c -= 0.6
        if (plan.cand && plan.kind !== 'photos') c += 0.6 // text and photo sharing a page
      }
      if (tpl === lastTpl && tpl !== 'text') c += 0.15
      let spread = prevSpread
      if (side === 'R') {
        spread = `${leftTpl}/${tpl}`
        if (spread === prevSpread) c += 0.4
      }
      const next = go(nu, nt, np, nextSide, side === 'L' ? kind : null, side === 'L' ? tpl : null, kind === 'grid' ? grids + 1 : 0, nsingle, nstarted, tpl, spread)
      if (!next) return
      const total = c + next.cost
      if (!best || total < best.cost - 1e-9) best = { cost: total, plans: [plan, ...next.plans], end: next.end }
    }

    if (hasOpener && !started) {
      const flow0 = units[0].flow
      const ph0 = units[0].photos[0]
      place('opener', { kind: 'opener', section: sec.id }, 0.15, [0, 0, 0, single, true])
      const room = H - band.textTop
      if (flow0.length) {
        const end = fillText(flow0, 0, room)
        if (end > 0) {
          const textH = flowHeight(flow0, 0, end)
          const finishes = end >= flow0.length && units[0].photos.length
          if (!(finishes && side === 'R')) {
            const fill = textH / room
            place('quiet', { kind: 'opener-text', section: sec.id, unit: 0, from: 0, to: end, flow: flow0, band }, -0.25 + (fill < 0.35 ? 0.5 * (0.35 - fill) / 0.35 : 0), [0, end, 0, single, true])
          }
          // short opening text with the lead photo under it
          if (end >= flow0.length && ph0 && !directives.small.has(ph0.id) && !directives.big.has(ph0.id)) {
            const c = photoUnder(ph0, band.textTop + textH)
            if (c) place('busy', { kind: 'opener-text', section: sec.id, unit: 0, from: 0, to: end, flow: flow0, band, cand: c, textH }, -value(c) * 0.9 - 0.3, [0, end, 1, single || big(c), true])
          }
        }
      } else if (ph0 && !directives.big.has(ph0.id)) {
        const c = photoUnder(ph0, band.textTop - 18)
        if (c) place('busy', { kind: 'opener-photo', section: sec.id, unit: 0, cand: c, band }, -value(c) * 0.9 - 0.1, [0, 0, 1, single || big(c), true])
      }
      memo.set(key, best)
      return best
    }

    const U = units[u]
    if (t < U.flow.length) {
      const flow = U.flow
      const end = fillText(flow, t, H)
      const remainsPhoto = U.photos.length > 0 && p === 0
      const tryText = (to, extra = 0) => {
        if (to <= t) return
        const finishes = to >= flow.length && U.photos.length > 0
        if (finishes && side === 'R') return // the text would end on a right page, its photo overleaf
        const fill = flowHeight(flow, t, to) / H
        const thin = fill < 0.4 ? (0.4 - fill) / 0.4 : 0
        place('quiet', { kind: 'text', section: sec.id, unit: u, from: t, to, flow }, thin + extra, [u, to, p, single, started])
      }
      tryText(end)
      if (remainsPhoto) {
        const ph = U.photos[0]
        // stop early so the rest of the text can sit with the photo
        const room = H - H * 0.4 - capHeight(ctx, ph, ctx.cb.w * 0.7) - 18
        let e2 = end
        while (e2 > t && flowHeight(flow, e2, flow.length) <= room) e2--
        e2++
        if (e2 < end && e2 > t + 3) tryText(fillText(flow, t, flowHeight(flow, t, e2)), 0.05)
        const restH = flowHeight(flow, t, flow.length)
        if (!directives.small.has(ph.id)) {
          const c = photoUnder(ph, restH)
          if (c) place('busy', { kind: 'text-photo', section: sec.id, unit: u, from: t, to: flow.length, cand: c, textH: restH, flow }, -value(c) * 0.95 - 0.1 + (directives.big.has(ph.id) ? 5 : 0), [u, flow.length, 1, single || big(c), started])
        }
        if (ctx.wide && ph.aspect < 1.3 && restH <= H) {
          // short text beside the photo on a wide page
          const area = { w: ctx.cb.w - ctx.measure - 24, h: H }
          const c = framed(ctx, ph, { area })
          if (c && c.slots[0].w >= area.w * 0.6) place('busy', { kind: 'text-photo-side', section: sec.id, unit: u, from: t, to: flow.length, cand: c, flow }, -value(c) - 0.1, [u, flow.length, 1, single || big(c), started])
        }
      }
      memo.set(key, best)
      return best
    }

    // photos
    const left = U.photos.length - p
    // the last photo of a unit with the short text that follows it (a unit of text alone)
    const N = units[u + 1]
    if (left === 1 && N && !N.photos.length && N.flow.length && !directives.small.has(U.photos[p].id)) {
      const ph = U.photos[p]
      const textH = flowHeight(N.flow, 0, N.flow.length)
      const area = { w: ctx.cb.w, h: H - textH - 18 }
      if (area.h >= H * 0.45) {
        const c = framed(ctx, ph, { area })
        if (c && c.coverage >= 0.3) place('busy', { kind: 'photo-text', section: sec.id, unit: u + 1, from: 0, to: N.flow.length, flow: N.flow, cand: c, textH }, -value(c) * 0.95 - 0.1 + (directives.big.has(ph.id) ? 5 : 0), [u + 1, N.flow.length, 0, single || big(c), started])
      }
    }
    const maxK = knobs.onePerPage ? 1 : Math.min(4, left)
    for (let k = 1; k <= maxK; k++) {
      const group = U.photos.slice(p, p + k)
      if (k > 1 && group.some((x) => directives.big.has(x.id))) continue
      for (const c of candsFor(group)) {
        const kind = c.kind === 'bleed' ? 'bleed' : c.held ? 'quiet' : c.kind
        let cost = -value(c) + 2.5 * c.lost
        if (k > 1) cost += 1.2 * Math.max(0, 0.5 - c.coverage) // a page of small photos with white around them
        if (knobs.tight && k === 1 && !group[0].lead && !directives.big.has(group[0].id)) cost += 1.5
        if (knobs.open && k === 1) cost -= 1
        if (k === 1 && facing === 'opener' && side === 'R' && group[0].lead) cost -= 0.5
        const isSingle = k === 1 && !directives.small.has(group[0].id)
        place(kind, { kind: 'photos', section: sec.id, unit: u, from: p, to: p + k, cand: c }, cost, [u, t, p + k, single || isSingle, started])
      }
    }
    memo.set(key, best)
    return best
  }

  return (side, facing) => go(0, 0, 0, side, facing, null, 0, false, false, null, null)
}

/**
 * An opener's colour band: tall enough for the number, the label and the title, measured
 * with the real fonts. Returns {height (from the trim's top), textTop (content-box y where
 * text or the lead photo starts), titleTop (content-box y of the title)}.
 */
export function openerBand(ctx, sec) {
  const st = TYPE.opener
  const lines = breakParagraph(ctx.fonts, [{ text: sec.title || '', font: st.font }], { width: ctx.cb.w * 0.92, size: st.size, tracking: st.tracking }).length
  const titleH = st.size * 0.8 + (Math.max(1, lines) - 1) * st.leading + st.size * 0.25
  const head = 34
  const titleTop = head + 22
  const height = ctx.margins.top + titleTop + titleH + 26
  return { height: Math.round(height), titleTop, textTop: Math.round(height - ctx.margins.top + 26) }
}

// ---------------------------------------------------------------- the whole book

const FRONT = ['title', 'dedication', 'map']

export function paginate(source, directives, { product, fonts }) {
  const ctx = makeContext(product, fonts)
  const limits = pageLimits(product)
  const prio = priorities(source, directives)
  const notices = []
  const front = [{ kind: 'title' }]
  if (directives.dedication) front.push({ kind: 'dedication' })
  if (directives.map && source.route && source.route.stops.filter((s) => s.kind === 'named').length >= 2) front.push({ kind: 'map' })
  const back = []
  if (source.people.length >= 2) back.push({ kind: 'people' }) // a list of one is not "who was there"

  const attempt = (knobs) => {
    let states = new Map([[stateKey(front.length), { cost: 0, plans: [] }]])
    for (const sec of source.sections) {
      const solve = sectionPlans(ctx, source, sec, directives, prio, knobs)
      const next = new Map()
      for (const [k, st] of states) {
        const [side, facing] = k.split('|')
        const r = solve(side, facing === '-' ? null : facing)
        if (!r) continue
        const nk = `${r.end.side}|${r.end.facing || '-'}`
        const total = st.cost + r.cost
        const cur = next.get(nk)
        if (!cur || total < cur.cost - 1e-9) next.set(nk, { cost: total, plans: [...st.plans, ...r.plans] })
      }
      states = next
      if (!states.size) return null
    }
    // back matter, then the colophon on the last (left) page. An odd count folds "Who was
    // there" into the last page; with no one to list, a blank page evens it.
    let best = null
    for (const [, st] of states) {
      const pages = front.length + st.plans.length + back.length + 1
      const odd = pages % 2 === 1
      const merge = odd && back.length > 0
      const filler = odd && !merge ? 1 : 0
      const cost = st.cost + filler * 0.8 + (merge ? 0.1 : 0)
      if (!best || cost < best.cost - 1e-9) best = { cost, plans: st.plans, filler, merge }
    }
    return best
  }
  function stateKey(n) {
    const nextPage = n + 1
    return nextPage % 2 === 0 ? 'L|-' : 'R|quiet'
  }
  const count = (r) => front.length + r.plans.length + (r.merge ? 0 : back.length) + 1 + r.filler

  // density search: the default, then open up or tighten until the count is in range
  const ladder = [
    { lambda: 0.7 },
    { lambda: 0.35, open: true },
    { lambda: 0.1, open: true, onePerPage: true },
  ]
  const tighter = [{ lambda: 1.1 }, { lambda: 1.8, tight: true }, { lambda: 3, tight: true }, { lambda: 5, tight: true }]
  let chosen = null, knobsUsed = null
  let r = attempt(ladder[0])
  if (!r) throw new Error('the book could not be laid out')
  chosen = r; knobsUsed = ladder[0]
  if (count(r) < limits.min) {
    for (const k of ladder.slice(1)) {
      const r2 = attempt(k)
      if (r2 && count(r2) > count(chosen)) { chosen = r2; knobsUsed = k }
      if (count(chosen) >= limits.min) break
    }
  } else if (count(r) > limits.max) {
    for (const k of tighter) {
      const r2 = attempt(k)
      if (r2) { chosen = r2; knobsUsed = k }
      if (count(chosen) <= limits.max) break
    }
  }

  const plans = [...front, ...chosen.plans]
  let pad = 0
  let total = count(chosen)
  if (total < limits.min) {
    pad = limits.min - total
    notices.push({ code: 'slim', message: 'This story makes a slim book. Add another story, or give each photo its own page.' })
  }
  for (let i = 0; i < chosen.filler + pad; i++) plans.push({ kind: 'blank', reason: i < chosen.filler ? 'even' : 'slim' })
  if (chosen.merge) plans.push({ kind: 'colophon', people: true })
  else plans.push(...back, { kind: 'colophon' })
  total = plans.length
  if (total > limits.max) notices.push({ code: 'too-long', message: `This story needs ${total} pages, more than a book can hold (${limits.max}). Leave out a section, or remove some photos.` })
  return { ctx, plans, notices, knobs: knobsUsed, limits }
}

export { FRONT }
