// The choreography (owner: film), round two: one function per scene, called every frame the
// scene is on stage. e is the FilmEngine; S is the film's clock in svh. Every call writes an
// offset from the hold and ends at zero, so a scene at rest is its poster.
import { clamp, easeInOutCubic, easeOutCubic, lerp, win } from '../lib/math.js'
import { KITCHEN as KS } from '../content/film.sample.js'
import { back, bump, f1, f3, settle, w, wi } from './ease.js'
import * as L from './layout.js'
import { pick } from './layout.js'
import * as T from './timeline.js'
import { AGES, TOP } from './years.js'

const pad2 = (n) => String(n).padStart(2, '0')
const pc = (v) => `${f1(v * 100)}%`
const mmss = (sec) => `${Math.floor(sec / 60)}:${pad2(sec % 60)}`

/** One quick pop as the colour front passes a scene's subject. */
const arrive = (S, fl) => 1 + 0.05 * bump(win(S, fl[0] + 5, fl[0] + 24))

// =========================================================================================
// HERO: a walk through the five audiences
// =========================================================================================
const STEPS = T.STEPS
const HC = L.HERO
const CROWD = Object.keys(HC.crowd)
const GROUPS = Object.fromEntries(CROWD.map((id) => [id, HC.crowd[id].g.split(' ')]))
const RUN = CROWD.filter((id) => GROUPS[id].includes('custom'))
const REST = CROWD.filter((id) => !GROUPS[id].includes('custom'))
/** Depth order from how far back someone stands: nearer the camera is drawn on top. */
const zOf = (lift) => Math.round(50 - lift * 3)

/** Where the walk is: from and to are step indexes, m is how far the move between them has gone, a is when it began. */
function heroAt(S) {
  const B = T.HERO
  let to = 0
  for (let i = 1; i < STEPS.length; i++) if (S >= B.move[STEPS[i]][0]) to = i
  if (to === 0) return { from: 0, to: 0, m: 0, a: 0 }
  const mv = B.move[STEPS[to]]
  const m = win(S, mv[0], mv[1])
  return m >= 1 ? { from: to, to, m: 0, a: mv[0] } : { from: to - 1, to, m, a: mv[0] }
}

/** Where one person stands at one step. */
function standing(id, step, k) {
  const p = HC.crowd[id]
  const custom = step === 'custom'
  const pos = pick(custom ? p.c : p.f, k)
  return {
    up: custom || GROUPS[id].includes(step) ? 1 : 0,
    x: pos.x,
    lift: pos.lift || 0,
    s: pos.s,
    tint: custom && !GROUPS[id].includes('custom') ? 0.5 : 0,
  }
}

/** How far one person is through the move to a step: people go one after another, slowly. */
function turn(id, to, S, a) {
  if (to === 'close' || to === 'followers') {
    const i = HC.order[to].indexOf(id)
    return i < 0 ? 1 : win(S, a + i * 4, a + i * 4 + 26)
  }
  const mi = RUN.indexOf(id)
  const ni = REST.indexOf(id)
  // Custom Group: everyone else steps back first, then the group steps forward
  if (to === 'custom') return mi >= 0 ? win(S, a + 14 + mi * 3, a + 36 + mi * 3) : win(S, a + ni * 2, a + 22 + ni * 2)
  // Public: they all come back to where they stood
  return mi >= 0 ? win(S, a + mi * 3, a + 22 + mi * 3) : win(S, a + 2 + ni * 2, a + 24 + ni * 2)
}

function hero(e, S) {
  const B = T.HERO
  const k = e.k
  const at = heroAt(S)
  const from = STEPS[at.from]
  const to = STEPS[at.to]
  const moving = at.from !== at.to
  const em = easeInOutCubic(at.m)
  const pos = at.from + (moving ? em : 0)

  // leaving for chapter 01
  const c = w(S, B.copyOut)
  const ce = easeInOutCubic(c)

  // ---- the camera: close on the household alone, easing back as the group grows
  const cam = lerp(pick(HC.camera, k)[from], pick(HC.camera, k)[to], em)
  e.n('hero:group').tf(Math.abs(cam - 1) < 0.0005 ? '' : `scale(${f3(cam)})`)

  // ---- the people
  CROWD.forEach((id, i) => {
    const name = `hero:${id}`
    const a = e.A.get(name)
    if (!a) return
    const f = pick(HC.crowd[id].f, k)
    const s0 = standing(id, from, k)
    const s1 = moving ? standing(id, to, k) : s0
    const t = moving ? turn(id, to, S, at.a) : 1
    const te = t * t * (3 - 2 * t)
    const out = win(S, B.crowdOut[0] + i * 3, B.crowdOut[0] + i * 3 + 22)
    const rising = s1.up > s0.up
    const up = (rising ? settle(t) * s1.up : lerp(s0.up, s1.up, te)) * (1 - out * out * (3 - 2 * out))
    if (up <= 0.001) {
      e.hide(name)
      return
    }
    const lift = lerp(s0.lift, s1.lift, te)
    e.put(name, lerp(s0.x, s1.x, te) - f.x, -(lift - (f.lift || 0)), lerp(s0.s, s1.s, te) / f.s)
    a.rise.tf(`translate3d(0,${f1((1 - up) * 104)}%,0) rotate(${f1(rising ? (1 - clamp(t)) * (i % 2 ? -3 : 3) : 0)}deg)`)
    a.sh.op(clamp(up * 1.7 - 0.5))
    a.tint.alpha(lerp(s0.tint, s1.tint, te))
    const z = zOf(lift)
    if (z !== a.z) {
      a.z = z
      a.box.style.zIndex = String(z)
    }
  })
  e.put('hero:family')

  // ---- Public: strangers at the edges, and their tag
  const pub = STEPS.indexOf('public')
  const mvPub = B.move.public
  HC.strangers.forEach((_, i) => {
    const name = `hero:x${i}`
    const a = e.A.get(name)
    if (!a) return
    const t = at.to < pub ? 0 : at.from === pub ? 1 : win(S, mvPub[0] + 8 + i * 3, mvPub[0] + 28 + i * 3)
    const out = win(S, B.crowdOut[0] - 4 + i * 2, B.crowdOut[0] + i * 2 + 20)
    const up = settle(t) * (1 - out * out * (3 - 2 * out))
    if (up <= 0.001) {
      e.hide(name)
      return
    }
    e.put(name)
    a.rise.tf(`translate3d(0,${f1((1 - up) * 104)}%,0)`)
  })
  HC.anyone.forEach((_, i) => {
    const t = at.to < pub ? 0 : at.from === pub ? 1 : win(S, mvPub[1] - 10 + i * 2, mvPub[1] + i * 2)
    e.popIn(`hero:any${i}`, t * (1 - c), 0.5, i ? 5 : -5, 2)
  })

  // ---- the word and the readout change with the people: old out the top, new in from below
  STEPS.forEach((slug, i) => {
    const d = clamp(i - pos, -1, 1)
    const tf = `translate3d(0,${f1(d * 105)}%,0)`
    e.n(`hero:w-${slug}`).tf(tf)
    // the readout's other values are hidden, not only moved out of its window
    const c = e.n(`hero:c-${slug}`)
    c.tf(tf)
    c.css('visibility', Math.abs(d) >= 1 ? 'hidden' : 'visible')
  })
  e.followSwitch(STEPS[Math.round(pos)])

  // ---- Private: the family's albums, which step aside and fade as the first people arrive
  const away = e.phone ? 9 : 18
  HC.albums.forEach((al, i) => {
    const name = `hero:album${i}`
    const slot = pick(al, k)
    if (!slot) return
    const mv = B.move.close
    const t = win(S, mv[0] + i * 3, mv[0] + i * 3 + 26)
    if (t >= 1) {
      e.hide(name)
      return
    }
    const te = t * t * (3 - 2 * t)
    const dir = slot.x < 0 ? -1 : 1
    e.put(name, dir * away * te, -3 * te, 1 - 0.14 * te, dir * 6 * te, 1 - win(t, 0.3, 0.95))
  })

  // ---- the copy
  const top = e.n('hero:top')
  top.show(c < 1)
  top.op(1 - c)
  top.tf(c <= 0 ? '' : `translate3d(0,${f1(-ce * 0.07 * e.H)}px,0)`)
  const words = e.n('hero:words')
  words.show(c < 1)
  words.op(1 - c)
  // on portrait screens and on a tablet on its side the sub line shares the stage with the crowd, so it steps aside
  const subOut = e.phone || e.W <= 1300 ? w(S, B.subOut) : 0
  for (const name of ['hero:sub', 'hero:cta', 'hero:small', 'hero:can', 'hero:note', 'hero:console']) {
    const n = e.n(name)
    const o = name === 'hero:sub' ? (1 - subOut) * (1 - c * 1.25) : 1 - c * 1.25
    n.show(o > 0.001)
    n.op(o)
    n.tf(c <= 0 ? '' : `translate3d(0,${f1(ce * 30)}px,0)`)
  }
}

// =========================================================================================
// shared: a print that pops to full size, then settles as a thumbnail in its slot
// =========================================================================================
/**
 * slot: where it rests ({x, y, s} with s its drawn scale); pop: where it shows large ({x, y}).
 * t runs 0..1 over its whole turn: it grows out to the pop spot, holds, then settles.
 */
function popPrint(e, name, t, slot, pop) {
  const n = e.n(name)
  if (!n.el) return
  if (t <= 0) {
    e.hide(name)
    return
  }
  const a = win(t, 0, 0.3)
  const b = win(t, 0.62, 1)
  const be = b * b * (3 - 2 * b)
  // it travels on a smooth curve (a fast start reads as a snap); only its size pops
  const k = Math.min(1, settle(a)) * (1 - be)
  const big = 1 / (slot.s || 1)
  const sc = b > 0 ? lerp(big, 1, be) : lerp(0.3 * big, big, back(a, 1.3))
  // the slot is drawn scaled down, so a move inside it is scaled back up to land on the pop spot
  e.put(name, (pop.x - slot.x) * k * big, -(pop.y - slot.y) * k * big, sc, -(slot.r || 0) * k, clamp(a * 4))
  // its caption and tag are only legible while it is large
  if (!n.caps) n.caps = [...n.el.querySelectorAll('figcaption, [data-poponly]')]
  const o = String(f3(clamp((k - 0.55) / 0.3)))
  if (n.capO !== o) {
    n.capO = o
    for (const el of n.caps) el.style.opacity = o
  }
}

// =========================================================================================
// 01 COAST: the route
// =========================================================================================
function coast(e, S) {
  const B = T.COAST
  const far = e.phone ? 0.5 : 1
  e.ghost('coast:ghost', S, T.FLOOD.coast)
  e.copy('coast', S, B.copy)
  e.put('coast:family', 0, 0, arrive(S, T.FLOOD.coast))

  // the campervan rolls in and dips on its brakes
  const vn = w(S, B.van)
  if (vn <= 0) e.hide('coast:van')
  else e.put('coast:van', -(1 - easeOutCubic(vn)) * 70 * far, 0, 1, 1.4 * bump(win(vn, 0.7, 1)), clamp(vn * 6))
  const lh = w(S, B.lighthouse)
  if (lh <= 0) e.hide('coast:lighthouse')
  else e.put('coast:lighthouse', 0, (1 - back(lh, 1.3)) * 22, lerp(0.8, 1, easeOutCubic(lh)), 0, clamp(lh * 4))
  e.dropIn('coast:waymarker', w(S, B.waymarker), 40)

  // the route draws itself along the floor; each pin pops as the line reaches it
  const rt = w(S, B.route)
  const route = e.n('coast:route')
  route.show(rt > 0)
  route.clip(rt >= 1 ? '' : `inset(-20% ${pc(1 - (0.04 + rt * 0.96))} -20% 0)`)
  for (let i = 0; i < 6; i++) {
    const t = wi(S, B.pin, i)
    e.popIn(`coast:pin${i}`, win(t, 0, 0.6), 0.2, 0, 3)
    if (e.phone) {
      // on a phone each print shows large over the family's feet, then sits on its pin
      popPrint(e, `coast:print${i}`, win(S, B.pin.a + i * B.pin.step + 3, B.pin.a + (i + 1) * B.pin.step + 5), pick(L.COAST.prints, e.k)[i], { x: clamp(pick(L.COAST.prints, e.k)[i].x * 0.6, -12, 12), y: 9 })
    } else {
      const p = win(t, 0.25, 1)
      if (p <= 0) e.hide(`coast:print${i}`)
      else e.put(`coast:print${i}`, 0, (1 - back(p, 1.8)) * 9, lerp(0.3, 1, back(p, 1.8)), (i % 2 ? 1 : -1) * (1 - easeOutCubic(p)) * 14, clamp(p * 4))
    }
  }
  e.flyIn('coast:icecream', w(S, B.icecream), -20 * far, -24, -140)
  e.flyIn('coast:binoculars', w(S, B.binoculars), 26 * far, -22, 100)
  e.dropIn('coast:flask', w(S, B.flask), 40)
  e.slideIn('coast:journey', w(S, B.journey), 36 * far, 4, 0.86)
  e.fadeUp('coast:aud', w(S, B.aud), 14)
  e.fadeUp('coast:bl', win(S, B.readouts[0], B.readouts[0] + 22), 24)
  e.fadeUp('coast:br', win(S, B.readouts[0] + 14, B.readouts[1]), 24)
}

// =========================================================================================
// 02 TETONS: seven days, thirteen stops
// =========================================================================================
function tetons(e, S) {
  const B = T.TETONS
  const k = e.k
  const far = e.phone ? 0.5 : 1
  const LT = L.TETONS
  e.ghost('tetons:ghost', S, T.FLOOD.tetons)
  e.copy('tetons', S, B.copy)
  e.put('tetons:family', 0, 0, arrive(S, T.FLOOD.tetons))

  // the range rises behind them; the car rolls in; the cabin, the moose and the canoe arrive
  const rg = w(S, B.range)
  if (rg <= 0) e.hide('tetons:range')
  else e.put('tetons:range', 0, (1 - easeOutCubic(rg)) * 16, lerp(0.94, 1, easeOutCubic(rg)), 0, clamp(rg * 3))
  const sv = w(S, B.suv)
  if (sv <= 0) e.hide('tetons:suv')
  else e.put('tetons:suv', -(1 - easeOutCubic(sv)) * 70 * far, 0, 1, 1.2 * bump(win(sv, 0.7, 1)), clamp(sv * 6))
  const cb = w(S, B.cabin)
  if (cb <= 0) e.hide('tetons:cabin')
  else e.put('tetons:cabin', 0, (1 - back(cb, 1.3)) * 18, lerp(0.84, 1, easeOutCubic(cb)), 0, clamp(cb * 4))
  e.popIn('tetons:lantern', win(S, B.cabin[1], B.cabin[1] + 10), 0.4, 0, 2)
  e.slideIn('tetons:moose', w(S, B.moose), 40 * far, 0)
  e.slideIn('tetons:canoe', w(S, B.canoe), -46 * far, 0)
  e.dropIn('tetons:boots', win(S, B.canoe[1] - 6, B.canoe[1] + 10), 40)

  // the day chips drop in, the route draws, and all thirteen stops appear, quiet
  for (let d = 0; d < 7; d++) {
    const t = wi(S, B.chips, d)
    const n = e.n(`tetons:day${d}`)
    n.show(t > 0)
    n.op(clamp(t * 3))
    n.tf(t >= 1 ? '' : `translate3d(0,${f1(-(1 - back(t, 1.8)) * 40)}px,0)`)
  }
  const rt = w(S, B.route)
  const route = e.n('tetons:route')
  route.show(rt > 0)
  route.clip(rt >= 1 ? '' : `inset(-20% ${pc(1 - (0.04 + rt * 0.96))} -20% 0)`)
  for (let i = 0; i < 13; i++) e.popIn(`tetons:pin${i}`, win(rt, (i / 13) * 0.8, (i / 13) * 0.8 + 0.2), 0.2, 0, 2)

  // day by day: the chip moves on, that day's stops light and its two prints pop
  const day = S < B.days.a ? -1 : Math.min(6, Math.floor((S - B.days.a) / B.days.step))
  if (day !== e.geo.tetonsDay) {
    e.geo.tetonsDay = day
    for (let d = 0; d < 7; d++) e.n(`tetons:day${d}`).attr('data-on', d === day)
    for (let i = 0; i < 13; i++) {
      const pin = e.n(`tetons:pin${i}`)
      if (pin.el && pin.el.firstElementChild) {
        if (L.TETON_DAY[i] <= day) pin.el.firstElementChild.setAttribute('data-on', '')
        else pin.el.firstElementChild.removeAttribute('data-on')
      }
    }
    if (day >= 0 && e.geo.tetonsDays) {
      e.n('tetons:dayn').text(`${e.geo.tetonsWord} ${pad2(day + 1)}`)
      e.n('tetons:place').text(e.geo.tetonsDays[day])
    }
  }
  e.fadeUp('tetons:days', win(S, B.chips.a - 4, B.chips.a + 8), 10)
  const place = e.n('tetons:place')
  place.op(day < 0 ? 0 : 1)
  e.n('tetons:dayn').op(day < 0 ? 0 : 1)
  const pop = pick(LT.pop, k)
  for (let d = 0; d < 7; d++) {
    const start = B.days.a + d * B.days.step
    for (let j = 0; j < 2; j++) {
      const i = d * 2 + j
      const t = win(S, start + j * 2.5, start + B.days.step - 1 + j * 2.5)
      popPrint(e, `tetons:print${i}`, t, pick(LT.prints, k)[i], { x: pop.x[d] + (j ? pop.gap : -pop.gap), y: pop.y + (j ? -1.4 : 1.4) })
    }
  }

  // the real map of the trip lands, and the grandparents rise to follow it
  e.slideIn('tetons:journey', w(S, B.journey), 36 * far, 4, 0.86)
  e.riseIn('tetons:joe', w(S, B.joe), 0)
  e.riseIn('tetons:ruth', w(S, B.ruth), 1)
  e.fadeUp('tetons:aud', w(S, B.aud), 14)
  e.fadeUp('tetons:bl', win(S, B.readouts[0], B.readouts[0] + 22), 24)
  e.fadeUp('tetons:br', win(S, B.readouts[0] + 14, B.readouts[1]), 24)
}

// =========================================================================================
// 03 THE WORLD
// =========================================================================================
const TRIPS = Object.keys(L.WORLD.trips)
const CARDS = Object.keys(L.WORLD.cards)
function world(e, S) {
  const B = T.WORLD
  const far = e.phone ? 0.5 : 1
  e.ghost('world:ghost', S, T.FLOOD.world)
  e.copy('world', S, B.copy)
  e.put('world:family', 0, 0, arrive(S, T.FLOOD.world))
  e.slideIn('world:timeline', win(S, B.cards.a + 30, B.cards.a + 50), -30 * far, 0, 0.9)

  // the dotted map spreads from home across the wall
  const mp = easeOutCubic(w(S, B.map))
  const dots = e.n('world:map')
  dots.show(mp > 0)
  dots.clip(mp >= 1 ? '' : `circle(${f1(mp * 120)}% at ${e.geo.homeX || '50%'} ${e.geo.homeY || '50%'})`)

  // the stories near home group into one bubble
  const hm = w(S, B.home)
  e.n('world:l-home').op(win(hm, 0.3, 1))
  if (hm <= 0) e.hide('world:cluster')
  else e.put('world:cluster', 0, (1 - back(hm, 1.5)) * 18, lerp(0.4, 1, back(hm, 1.5)), 0, clamp(hm * 4))

  // the family's own trips: a pin, then its print
  TRIPS.forEach((id, i) => {
    const t = wi(S, B.pins, i)
    e.popIn(`world:pin-${id}`, win(t, 0, 0.6), 0.2, 0, -5)
    e.popIn(`world:trip-${id}`, win(t, 0.3, 1), 0.3, i % 2 ? 10 : -10, 4)
  })
  // the relatives' own stories land, one by one
  CARDS.forEach((id, i) => {
    const t = wi(S, B.cards, i)
    e.popIn(`world:pin-${id}`, win(t, 0, 0.45), 0.2, 0, -5)
    e.flyIn(`world:card-${id}`, win(t, 0.2, 1), (i % 2 ? 22 : -22) * far, -24, (i % 2 ? 1 : -1) * 20, 0.6)
    e.n(`world:l-${id}`).op(win(t, 0.7, 1))
  })
  e.fadeUp('world:bl', w(S, B.readouts), 24)
}

// =========================================================================================
// 04 WEDDING
// =========================================================================================
function wedding(e, S) {
  const B = T.WEDDING
  const far = e.phone ? 0.5 : 1
  e.ghost('wedding:ghost', S, T.FLOOD.wedding)
  e.copy('wedding', S, B.copy)
  e.put('wedding:couple', 0, 0, arrive(S, T.FLOOD.wedding))

  // the flower arch rises behind them; the cake lands at the side
  const ar = w(S, B.arch)
  if (ar <= 0) e.hide('wedding:arch')
  else e.put('wedding:arch', 0, (1 - back(ar, 1.3)) * 30, lerp(0.86, 1, easeOutCubic(ar)), 0, clamp(ar * 4))
  e.slideIn('wedding:cake', w(S, B.cake), -30 * far, 0)

  // six prints fly up into a gallery wall
  for (let i = 0; i < 6; i++) {
    const t = wi(S, B.wall, i)
    const col = i % 3
    e.flyIn(`wedding:w${i}`, t, (26 + col * 6) * far, 34 + (i > 2 ? 10 : 0), (i % 2 ? 1 : -1) * 34, 0.6)
  }
  e.flyIn('wedding:bouquet', w(S, B.bouquet), -8, -30, -160)

  // a clip: the ring fills with the scroll
  e.popIn('wedding:video', w(S, B.video), 0.5, -5, 4)
  e.n('wedding:ring').css('--p', String(Math.round(w(S, B.ring) * 100)))
  e.slideIn('wedding:lightbox', w(S, B.lightbox), 30 * far, 6, 0.86)

  // the family arrives, dressed up
  e.riseIn('wedding:family', w(S, B.family), 0)
  ;['joe', 'ruth', 'finn'].forEach((id, i) => e.riseIn(`wedding:${id}`, wi(S, B.guests, i), i + 1))
  e.flyIn('wedding:confetti', w(S, B.confetti), 30 * far, -24, 220)
  e.dropIn('wedding:flutes', w(S, B.flutes), 50)

  // reactions, then comments from the people who can open it
  const rx = w(S, B.reactions)
  e.put('wedding:reactions', 0, 0, 1, 0, clamp(rx * 4))
  for (let i = 0; i < 3; i++) {
    const t = win(rx, i * 0.22, i * 0.22 + 0.56)
    const n = e.n(`wedding:rx${i}`)
    n.show(t > 0)
    n.op(clamp(t * 4))
    n.tf(t >= 1 ? '' : `translate3d(0,${f1((1 - back(t, 2.4)) * 16)}px,0) scale(${lerp(0.4, 1, back(t, 2.4))})`)
  }
  for (let i = 0; i < 2; i++) e.popIn(`wedding:c${i}`, wi(S, B.comments, i), 0.7, i ? 4 : -4, 5)

  e.fadeUp('wedding:aud', w(S, B.aud), 14)
  e.fadeUp('wedding:bl', win(S, B.readouts[0], B.readouts[0] + 22), 24)
  e.fadeUp('wedding:br', win(S, B.readouts[0] + 14, B.readouts[1]), 24)
}


// =========================================================================================
// 05 KITCHEN
// =========================================================================================
function measureKitchen(e) {
  const fan = pick(L.KITCHEN.fan, e.k)
  const fy = e.fy.kitchen
  const prints = []
  for (let i = 0; i < KS.prints.length; i++) {
    const n = e.n(`kitchen:print${i}`)
    if (!n.el) continue
    const c = e.centre(n.el)
    const k = i - 2.5
    const tx = e.cx + (fan.x + k * fan.dx) * e.u
    const ty = fy - (fan.y - Math.abs(k) * fan.dy) * e.u
    // it flies in from beyond the left edge of the stage
    const from = (tx + fan.w * e.u) / e.u
    prints[i] = { dx: (tx - c.x) / e.u, dy: (ty - c.y) / e.u, s: (fan.w * e.u) / Math.max(1, c.w), r: fan.r[i], from }
  }
  const cn = e.n('kitchen:count')
  let count = null
  if (cn.el) {
    const c = e.centre(cn.el)
    count = { dx: (e.cx + fan.x * e.u - c.x) / e.u, dy: (fy - (fan.y + fan.w * 0.6) * e.u - c.y) / e.u }
  }
  e.geo.kitchen = { prints, count }
}

function kitchen(e, S) {
  const B = T.KITCHEN
  const g = e.geo.kitchen
  const far = e.phone ? 0.55 : 1
  e.ghost('kitchen:ghost', S, T.FLOOD.kitchen)
  e.copy('kitchen', S, B.copy)
  e.put('kitchen:maya', 0, 0, arrive(S, T.FLOOD.kitchen))

  // the kitchen lands, then finishes itself: each stage wipes up from the floor over the last
  e.dropIn('kitchen:kitchen', w(S, B.kitchen), 46)
  const wipes = [0, 1, 2].map((i) => easeInOutCubic(win(S, B.sections.a + i * B.sections.step + 2, B.sections.a + i * B.sections.step + B.sections.dur - 2)))
  let active = -1
  for (let i = 0; i < 4; i++) {
    const a = i === 0 ? 1 : wipes[i - 1] // how far this stage has risen
    const b = i < 3 ? wipes[i] : 0 // how far the next one has covered it
    const n = e.n(`kitchen:k${i}`)
    const on = a > 0 && b < 1
    n.alpha(on ? 1 : 0)
    if (on) n.clip(a >= 1 ? '' : `inset(${pc(1 - a)} 0 0 0)`)
    if (i > 0 && a > 0 && a < 1) active = i - 1
  }
  const level = e.n('kitchen:level')
  level.alpha(active >= 0 ? 1 : 0)
  if (active >= 0) {
    level.tf(`translate3d(0,${f1((1 - wipes[active]) * e.geo.kitchenH)}px,0)`)
    e.n('kitchen:leveltag').text(KS.sections[active].heading)
  }

  // six prints fan in from the left, one after another, then dock into the page
  let landed = 0
  const S0 = B.sections
  for (let i = 0; i < 6; i++) {
    const p = g && g.prints[i]
    if (!p) continue
    const t = wi(S, B.prints, i)
    if (t > 0.5) landed++
    if (t <= 0) {
      e.hide(`kitchen:print${i}`)
      continue
    }
    // when it docks: the inline three go with their sections, the gallery three after
    const inline = KS.sections.findIndex((sec) => sec.print === i)
    const at = inline >= 0 ? S0.a + inline * S0.step + 5 : S0.a + 2 * S0.step + 12 + KS.gallery.indexOf(i) * 5
    const d = easeInOutCubic(win(S, at, at + 20))
    const fe = back(t, 1.2)
    const fx = p.dx - (1 - fe) * p.from
    const fyo = p.dy + (1 - fe) * 6
    const fr = p.r + (1 - easeOutCubic(t)) * -40
    const arc = bump(d) * -7
    e.put(`kitchen:print${i}`, lerp(fx, 0, d), lerp(fyo, 0, d) + arc, lerp(p.s, 1, d), lerp(fr, 0, d), clamp(t * 4))
  }
  // the counter rides with the fan, then goes home to the page
  if (g && g.count) {
    const t = win(S, B.prints.a - 4, B.prints.a + 6)
    const d = easeInOutCubic(win(S, S0.a + 2 * S0.step + 20, S0.a + 2 * S0.step + 36))
    if (t <= 0) e.hide('kitchen:count')
    else e.put('kitchen:count', lerp(g.count.dx, 0, d), lerp(g.count.dy, 0, d) + bump(d) * -4, lerp(1.25, 1, d), 0, t)
    e.n('kitchen:countn').text(pad2(d > 0 ? 6 : landed))
    e.n('kitchen:gpre').text(d > 0.5 ? e.geo.galleryPre : '')
  }
  e.slideIn('kitchen:swatches', w(S, B.swatches), -26 * far, 0)

  // the ways in: photos alone, or with a few words, or with a voice note; and it can ask questions
  e.fadeUp('kitchen:waysLabel', win(S, B.ways.a - 6, B.ways.a + 4), 8)
  for (let i = 0; i < 4; i++) {
    const t = wi(S, B.ways, i)
    const n = e.n(`kitchen:way${i}`)
    n.show(t > 0)
    n.op(clamp(t * 4))
    n.tf(t >= 1 ? '' : `translate3d(${f1((1 - back(t, 1.8)) * 26)}px,0,0) scale(${f3(lerp(0.6, 1, back(t, 1.8)))})`)
  }

  // she talks: the waveform and the timer run with the scroll, the words stream
  e.popIn('kitchen:voice', w(S, B.voice), 0.5, -6, 3)
  const talk = w(S, B.talk)
  e.n('kitchen:wave').clip(talk >= 1 ? '' : `inset(0 ${pc(1 - talk)} 0 0)`)
  e.n('kitchen:timer').text(mmss(Math.round(talk * KS.voiceSeconds)))
  const nw = KS.transcript.length
  for (let i = 0; i < nw; i++) e.n(`kitchen:tw${i}`).op(win(talk, (i / nw) * 0.94, (i / nw) * 0.94 + 0.06))
  e.flyIn('kitchen:mic', w(S, B.mic), 22 * far, -18, 90)

  // the page writes itself
  const pg = w(S, B.page)
  const paper = e.n('kitchen:paper')
  paper.show(pg > 0)
  paper.op(clamp(pg * 3))
  paper.tf(pg >= 1 ? '' : `translate3d(0,${f1((1 - back(pg, 1.4)) * 8 * e.u)}px,0) scale(${lerp(0.9, 1, back(pg, 1.4))})`)
  e.fadeUp('kitchen:ptag', win(S, B.page[0] + 8, B.page[1] + 2), 8)
  e.fadeUp('kitchen:ptitle', w(S, B.title), 12)
  for (let i = 0; i < 3; i++) e.fadeUp(`kitchen:sec${i}`, win(S, S0.a + i * S0.step, S0.a + i * S0.step + 12), 12)
  e.fadeUp('kitchen:pchips', w(S, B.chips), 8)
  e.flyIn('kitchen:roller', w(S, B.roller), -30 * far, -20, -120)
  e.dropIn('kitchen:pots', w(S, B.pots), 26)

  // a sticker slaps on
  const st = w(S, B.sticker)
  if (st <= 0) e.hide('kitchen:sticker')
  else e.put('kitchen:sticker', 0, 0, lerp(2.1, 1, back(st, 2.6)), lerp(-22, 0, easeOutCubic(st)), clamp(st * 5))

  // and the people chosen for this story rise to read it
  e.riseIn('kitchen:ruth', w(S, B.ruth), 0)
  e.riseIn('kitchen:kate', w(S, B.kate), 1)
  e.fadeUp('kitchen:aud', w(S, B.aud), 14)
  e.fadeUp('kitchen:bl', win(S, B.readouts[0], B.readouts[0] + 22), 24)
  e.fadeUp('kitchen:br', win(S, B.readouts[0] + 14, B.readouts[1]), 24)
}


// =========================================================================================
// 06 MARATHON: staged around who can open it
// =========================================================================================
const CLUB = Object.keys(L.RACE.club)
function race(e, S) {
  const B = T.RACE
  const far = e.phone ? 0.5 : 1
  e.ghost('race:ghost', S, T.FLOOD.race)
  e.copy('race', S, B.copy)
  e.put('race:tom', 0, 0, arrive(S, T.FLOOD.race))

  // the finish arch slides up behind him; the barrier lands, and the family cheers behind it
  const ar = w(S, B.arch)
  if (ar <= 0) e.hide('race:arch')
  else e.put('race:arch', 0, (1 - back(ar, 1.3)) * 30, lerp(0.86, 1, easeOutCubic(ar)), 0, clamp(ar * 4))
  e.dropIn('race:barrier', w(S, B.barrier), 44)
  ;['ivy', 'leo', 'maya'].forEach((id, i) => e.riseIn(`race:${id}`, wi(S, B.squad, i), i))
  e.dropIn('race:shoe', w(S, B.shoe), 50)

  // the photos and the clip of the last mile
  for (let i = 0; i < 2; i++) e.flyIn(`race:print${i}`, wi(S, B.prints, i), (i ? -1 : 1) * 24 * far, 30, (i ? 1 : -1) * 30, 0.6)
  e.slideIn('race:lightbox', wi(S, B.prints, 2), 26 * far, 6, 0.86)
  e.popIn('race:video', w(S, B.video), 0.5, -5, 4)
  e.n('race:ring').css('--p', String(Math.round(w(S, B.ring) * 100)))

  // exactly the right crowd: the audience lands as a card, its three members one by one, and they rise under it
  const ch = w(S, B.chip)
  if (ch <= 0) e.hide('race:chip')
  else e.put('race:chip', 0, 0, lerp(1.5, 1, back(ch, 2.2)), lerp(-8, 0, easeOutCubic(ch)), clamp(ch * 5))
  CLUB.forEach((id, i) => {
    const t = wi(S, B.club, i)
    const row = e.n(`race:m-${id}`)
    row.show(t > 0)
    row.op(clamp(t * 4))
    row.tf(t >= 1 ? '' : `translate3d(${f1((1 - back(win(t, 0, 0.6), 1.8)) * 18)}px,0,0)`)
    e.riseIn(`race:${id}`, win(t, 0.15, 1), i)
  })
  e.flyIn('race:medal', w(S, B.props), -10, -30, -160)
  e.flyIn('race:banana', win(S, B.props[0] + 6, B.props[1] + 6), 26 * far, -24, 220)
  e.dropIn('race:cowbell', w(S, B.props), 50)
  e.fadeUp('race:bl', win(S, B.readouts[0], B.readouts[0] + 22), 24)
}

// =========================================================================================
// 07 THROUGH THE YEARS: the same two kids at five ages
// =========================================================================================
const NST = AGES.length
const KIDS = ['ivy', 'leo']

function year(e, S) {
  const B = T.YEAR
  const far = e.phone ? 0.5 : 1
  const A = pick(L.STAGE.year, e.k).A
  const Y = e.geo.years || { labels: [], chips: [] }
  e.ghost('year:ghost', S, T.FLOOD.year)
  e.copy('year', S, B.copy)

  /** Place one of this scene's pieces: an offset in u, a scale, a turn, and always an explicit opacity. */
  const set = (n, dx, dy, sc, r, o) => {
    if (!n.el) return
    const x = dx * e.u + e.px * n.par
    const yy = dy * e.u + e.py * n.par * 0.35
    const still = Math.abs(x) < 0.05 && Math.abs(yy) < 0.05 && Math.abs(sc - 1) < 0.0005 && Math.abs(r) < 0.02
    n.tf(still ? '' : `translate3d(${f1(x)}px,${f1(yy)}px,0) rotate(${f1(r)}deg) scale(${f3(sc)})`)
    n.alpha(o)
  }

  // the eight tabs drop in, one after another
  for (let i = 0; i < 8; i++) {
    const t = wi(S, B.tabs, i)
    const n = e.n(`year:tab${i}`)
    n.show(t > 0)
    n.op(clamp(t * 3))
    n.tf(t >= 1 ? '' : `translate3d(0,${f1(-(1 - back(t, 1.8)) * 44)}px,0) rotate(${f1((1 - easeOutCubic(t)) * (i % 2 ? 8 : -8))}deg)`)
  }

  // which age they are, and how far into growing to the next
  let from = 0
  let to = 0
  let t = 0
  for (let i = 0; i < NST - 1; i++) {
    const a = B.grow.a + i * B.grow.step
    if (S < a) break
    const tt = win(S, a, a + B.grow.dur)
    if (tt >= 1) {
      from = to = i + 1
      t = 0
    } else {
      from = i
      to = i + 1
      t = tt
    }
  }
  const moving = from !== to
  const g0 = win(t, 0, 0.42)
  const grow = moving ? g0 * g0 * (3 - 2 * g0) : 0 // they stretch to the next height
  const w0 = moving ? win(t, 0.34, 0.78) : 0
  const wipe = w0 * w0 * (3 - 2 * w0) // the measuring line rises: older below it, younger above
  const shown = moving && t >= 0.56 ? to : from // the age the label, the chips and the photographs speak for
  const first = w(S, B.first)

  // the pair: one body per child at every moment (the line divides them; it never shows two)
  const ga = AGES[from]
  const gb = AGES[to]
  const ratio = moving ? gb.vis / ga.vis : 1
  for (let i = 0; i < NST; i++) {
    const n = e.n(`year:pair${i}`)
    if (!n.el) continue
    if (i === from) {
      set(n, 0, 0, moving ? lerp(1, ratio, grow) : i === 0 ? arrive(S, T.FLOOD.year) : 1, 0, 1)
      // above the line: the younger pair, stretched to the line's scale
      n.clip(moving && wipe > 0 ? `inset(0 0 ${pc(1 - (ga.feet - wipe * (ga.feet - ga.head)))} 0)` : '')
    } else if (i === to && moving && wipe > 0) {
      set(n, 0, 0, 1 + 0.03 * bump(win(t, 0.78, 1)), 0, 1)
      // below the line: the older pair
      n.clip(wipe >= 1 ? '' : `inset(${pc(gb.feet - wipe * (gb.feet - gb.head))} 0 0 0)`)
    } else {
      n.alpha(0)
    }
  }
  const level = e.n('year:level')
  level.alpha(moving ? win(t, 0.28, 0.38) * (1 - win(t, 0.8, 0.9)) : 0)
  level.tf(moving ? `translate3d(0,${f1(-wipe * gb.vis * A * e.u)}px,0)` : '')

  // the height chart: its rails, then a pencil mark for each child at each age
  e.fadeUp('year:marks-ivy', w(S, B.chart), 0)
  e.fadeUp('year:marks-leo', win(S, B.chart[0] + 4, B.chart[1] + 4), 0)
  for (const who of KIDS) {
    for (let j = 0; j < NST; j++) {
      const v = j === 0 ? first : j <= from ? 1 : moving && j === to ? win(t, 0.76, 0.96) : 0
      const n = e.n(`year:mk-${who}${j}`)
      n.alpha(clamp(v * 3))
      n.tf(v >= 1 ? '' : `translateY(50%) scale(${f3(lerp(0.3, 1, back(v, 2.2)))})`)
    }
  }

  // how old they are, riding just above their heads
  const top = moving ? lerp(ga.vis, gb.vis, Math.max(grow, wipe)) : ga.vis
  const age = e.n('year:age')
  const dy = (TOP - top) * A + (1 - easeOutCubic(first)) * 2
  const pop = (moving ? 1 + 0.1 * bump(win(t, 0.46, 0.76)) : 1) * lerp(0.6, 1, back(first, 2))
  if (age.el) {
    age.show(first > 0)
    age.op(clamp(first * 4))
    age.tf(Math.abs(dy) < 0.005 && Math.abs(pop - 1) < 0.0005 ? '' : `translate3d(0,${f1(dy * e.u)}px,0) scale(${f3(pop)})`)
  }
  if (shown !== e.geo.yearShown) {
    e.geo.yearShown = shown
    if (Y.labels[shown]) e.n('year:agetext').text(Y.labels[shown])
    const on = Y.chips[shown] || []
    for (let i = 0; i < 8; i++) e.n(`year:tab${i}`).attr('data-on', on.includes(i))
  }

  // that year's two photographs: the old pair leaves, the new pair is dealt in
  for (let s = 0; s < NST; s++) {
    for (let j = 0; j < 2; j++) {
      const n = e.n(`year:photo${s}-${j}`)
      if (!n.el) continue
      const side = j ? 1 : -1
      if (moving && s === from) {
        const out = win(t, 0.06 + j * 0.06, 0.44 + j * 0.06)
        const o2 = out * out * (3 - 2 * out)
        set(n, side * 20 * far * o2, 5 * o2, 1 - 0.12 * o2, side * 9 * o2, 1 - o2)
      } else if (moving && s === to) {
        const v = win(t, 0.5 + j * 0.1, 0.9 + j * 0.1)
        const k = settle(v)
        set(n, side * 26 * far * (1 - k), -10 * (1 - k), lerp(0.7, 1, k), side * 14 * (1 - k), clamp(v * 4))
      } else if (!moving && s === from) {
        const v = s === 0 ? win(S, B.first[0] + j * 6, B.first[1] + j * 6) : 1
        const k = settle(v)
        set(n, side * 26 * far * (1 - k), -10 * (1 - k), lerp(0.7, 1, k), side * 14 * (1 - k), clamp(v * 4))
      } else {
        n.alpha(0)
      }
    }
  }

  // the phone: the view toggle flicks through the four views
  e.slideIn('year:device', w(S, B.device), -30 * far, 0, 0.9)
  e.fadeUp('year:toggle', win(S, B.device[0] + 6, B.device[1] + 4), 12)
  let view = 0
  let vt = 1
  B.views.forEach((at, i) => {
    if (S >= at) {
      view = (i + 1) % 4
      vt = win(S, at, at + B.viewDur)
    }
  })
  for (let i = 0; i < 4; i++) {
    e.n(`year:view${i}`).attr('data-on', i === view)
    const scr = e.n(`year:screen${i}`)
    if (!scr.el) continue
    const before = (view + 3) % 4
    if (i === view) {
      scr.alpha(1)
      scr.clip(vt >= 1 ? '' : `inset(0 0 0 ${pc(1 - easeOutCubic(vt))})`)
      scr.el.style.zIndex = '2'
    } else if (i === before && vt < 1) {
      scr.alpha(1)
      scr.clip('')
      scr.el.style.zIndex = '1'
    } else {
      scr.alpha(0)
      scr.el.style.zIndex = ''
    }
  }

  e.fadeUp('year:bl', win(S, B.readouts[0], B.readouts[0] + 22), 24)
  e.fadeUp('year:br', win(S, B.readouts[0] + 14, B.readouts[1]), 24)
}

// =========================================================================================
// FINALE: the portrait
// =========================================================================================
const OURS_CROWD = ['ruth', 'sam', 'marcus', 'joe', 'kate', 'priya', 'finn', 'deb']
const OURS_TAGS = Object.keys(L.OURS.tags)
const OURS_PARTS = [
  ['ours:arch', 0, -60, 0],
  ['ours:van', -90, -10, -6],
  ['ours:cabin', 90, -10, 6],
  ['ours:family', 0, 70, 0],
  ['ours:ruth', -70, 30, -10],
  ['ours:sam', 70, 30, 10],
  ['ours:marcus', -80, -30, 8],
  ['ours:joe', 80, -30, -8],
  ['ours:kate', -90, 20, -12],
  ['ours:priya', 90, 20, 12],
  ['ours:finn', -100, -20, 8],
  ['ours:deb', 100, -20, -8],
  ['ours:pots', -40, 60, 140],
  ['ours:bucket', 40, 60, -140],
  ['ours:balloons', -20, -70, -40],
]

function ours(e, S) {
  const B = T.OURS
  const far = e.phone ? 0.45 : 1
  e.ghost('ours:ghost', S, T.FLOOD.ours)
  e.copy('ours', S, B.copy)

  // everyone and everything flies in from an exploded position into one portrait
  const asm = w(S, B.assemble)
  const n = OURS_PARTS.length
  OURS_PARTS.forEach(([name, dx, dy, spin], i) => {
    const t = win(asm, (i / (n - 1)) * 0.56, (i / (n - 1)) * 0.56 + 0.44)
    if (t <= 0) return e.hide(name)
    const k = back(t, 1.15)
    e.put(name, dx * far * (1 - k), dy * far * (1 - k), 1 + (1 - k) * 0.4, spin * (1 - easeOutCubic(t)), clamp(t * 4))
    // the crowd's shadows belong to the switch (CSS); only the rest are written here
    const a = OURS_CROWD.includes(name.slice(5)) ? null : e.A.get(name)
    if (a) a.sh.op(clamp(t * 2 - 1))
  })

  // each story is tagged with its audience
  OURS_TAGS.forEach((id, i) => {
    const t = wi(S, B.tags, i)
    e.popIn(`ours:t-${id}`, t, 0.5, i % 2 ? 6 : -6, 2)
    const l = e.n(`ours:l-${id}`)
    l.op(win(t, 0.5, 1))
  })
  e.fadeUp('ours:console', w(S, B.console), 30)

  // the whole portrait shrinks into a white-bordered print
  const sh = easeInOutCubic(w(S, B.shrink))
  const g = e.n('ours:group')
  g.tf(sh <= 0 ? '' : `scale(${f3(lerp(1, 0.34, sh))}) rotate(${f1(-3 * sh)}deg)`)
  e.n('ours:print').alpha(win(sh, 0, 0.3))
  if (sh > 0) {
    const o = 1 - win(sh, 0, 0.4)
    e.n('ours:copy').op(o)
    e.n('ours:console').op(o)
    e.n('ours:ghost').op(o)
    OURS_TAGS.forEach((id) => {
      e.n(`ours:t-${id}`).op(o)
      e.n(`ours:l-${id}`).op(o)
    })
  } else e.n('ours:ghost').op(1)
}


// =========================================================================================
// FINALE: the app
// =========================================================================================
function app(e, S) {
  const B = T.APP
  const kk = e.k
  e.ghost('app:ghost', S, T.FLOOD.app)
  // the real feed opens from where the print was, and settles large and tilted
  const f = w(S, B.feed)
  const g = e.geo.app
  if (f <= 0) e.hide('app:feed')
  else {
    const t = win(f, 0.25, 1)
    const k = easeInOutCubic(t)
    e.put('app:feed', (g ? g.dx : 0) * (1 - k), (g ? g.dy : 0) * (1 - k), lerp(0.3, 1, back(t, 1.2)), lerp(6, 0, k), clamp(f * 5))
  }
  e.copy('app', S, B.copy)
  // the other screens fan out from behind it, one by one
  const feed = pick(L.APP.feed, kk)
  L.APP.fan.forEach((slot, i) => {
    const s = pick(slot, kk)
    const t = wi(S, B.fan, i)
    if (!s) return
    if (t <= 0) {
      e.hide(`app:r${i}`)
      return
    }
    const k = back(t, 1.4)
    e.put(`app:r${i}`, (feed.x - s.x) * (1 - k) * 0.8, -(feed.y - s.y) * (1 - k) * 0.8, lerp(0.6, 1, k), -(s.r || 0) * (1 - easeOutCubic(t)), clamp(t * 4))
  })
  ;['ruth', 'joe', 'sam'].forEach((id, i) => e.riseIn(`app:${id}`, wi(S, B.readers, i), i))
}

// =========================================================================================
// FINALE: the close
// =========================================================================================
function end(e, S) {
  const B = T.END
  // the photograph settles as it opens
  const p = easeOutCubic(w(S, B.plate))
  const plate = e.n('end:plate')
  plate.tf(p >= 1 ? '' : `scale(${f3(lerp(1.12, 1, p))})`)
  // the print's bottom border slides up with the closing line
  const c = w(S, B.copy)
  const band = e.n('end:band')
  band.show(c > 0)
  band.tf(c >= 1 ? '' : `translate3d(0,${f1((1 - easeOutCubic(c)) * 100)}%,0)`)
  e.headline('end', win(S, B.copy[0] + 6, B.copy[1] + 8))
  e.fadeUp('end:card', win(S, B.copy[0] + 10, B.copy[1] + 8), 20)
  e.fadeUp('end:note', win(S, B.copy[0] + 14, B.copy[1] + 10), 10)
}


// =========================================================================================
export const BEATS = { hero, coast, tetons, world, wedding, kitchen, race, year, ours, app, end }

/** Layout-dependent numbers, read once per resize with the poster showing. */
export function MEASURE(e) {
  const k = e.k
  // where home sits inside the dotted map, for the map's reveal
  const box = pick(L.WORLD.box, k)
  const home = pick(L.WORLD.home, k)
  const V = L.WORLD_VIEW
  const hgt = (box.w * (V.lat0 - V.lat1)) / (V.lon1 - V.lon0)
  e.geo.homeX = `${f1(((home.x - box.x0) / box.w) * 100)}%`
  e.geo.homeY = `${f1(((box.top - home.y) / hgt) * 100)}%`
  // the Tetons day label is rewritten as the days go by: remember its word
  const dn = e.n('tetons:dayn')
  if (dn.el && !e.geo.tetonsWord) e.geo.tetonsWord = dn.el.textContent.replace(/[\s\d]+$/, '')
  e.geo.tetonsDay = undefined
  e.geo.yearShown = undefined
  e.atPoster(() => {
    const pre = e.n('kitchen:gpre')
    if (pre.el && e.geo.galleryPre == null) e.geo.galleryPre = pre.el.textContent
    const kn = e.n('kitchen:kitchen')
    e.geo.kitchenH = kn.el ? kn.el.offsetHeight : 0
    if (e.scenes.kitchen) measureKitchen(e)
    // the feed opens from the middle of the screen, where the portrait shrank to
    const fd = e.n('app:feed')
    if (fd.el) {
      const c = e.centre(fd.el)
      e.geo.app = { dx: (e.cx - c.x) / e.u, dy: (e.H * 0.48 - c.y) / e.u }
    }
  })
}
