// The choreography (owner: film): one function per scene, called every frame the scene is on
// stage. e is the FilmEngine; S is the film's clock in svh. Every call writes an offset from
// the hold and ends at zero, so a scene at rest is its poster.
import { clamp, easeInOutCubic, easeOutCubic, lerp, win } from '../lib/math.js'
import { YEAR as YEAR_COPY } from '../content/film.js'
import { KITCHEN } from '../content/film.sample.js'
import { back, bump, f1, f3, w, wi } from './ease.js'
import * as L from './layout.js'
import * as T from './timeline.js'

const CROWD = ['ruth', 'kate', 'joe', 'marcus', 'sam', 'priya', 'finn', 'deb']
const pad2 = (n) => String(n).padStart(2, '0')
const mmss = (sec) => `${Math.floor(sec / 60)}:${pad2(sec % 60)}`
const pc = (v) => `${f1(v * 100)}%`

/** One quick pop as the colour front passes a scene's subject. */
const arrive = (S, fl) => 1 + 0.05 * bump(win(S, fl[0] + 5, fl[0] + 24))

// =========================================================================================
// HERO
// =========================================================================================
function hero(e, S) {
  const H = T.HERO
  const c = w(S, H.copyOut)
  const ce = easeInOutCubic(c)

  const top = e.n('hero:top')
  top.show(c < 1)
  top.op(1 - c)
  top.tf(c <= 0 ? '' : `translate3d(0,${f1(-ce * 0.07 * e.H)}px,0)`)
  for (const name of ['hero:sub', 'hero:cta', 'hero:small', 'hero:can', 'hero:note']) {
    const n = e.n(name)
    n.show(c < 1)
    n.op(1 - c * 1.25)
    n.tf(c <= 0 ? '' : `translate3d(0,${f1(ce * 30)}px,0)`)
  }
  e.put('hero:card', 26 * ce, -10 * ce, 1 - 0.2 * ce, 8 * ce, 1 - c)
  e.n('hero:leader').op(1 - c * 2)
  e.n('hero:dot').op(1 - c * 2)

  // the switch tucks itself away
  const k = w(S, H.consoleOut)
  const ke = easeInOutCubic(k)
  const con = e.n('hero:console')
  con.show(k < 1)
  con.op(1 - k * k)
  con.tf(k <= 0 ? '' : `translate3d(0,${f1(ke * 46)}px,0) scale(${1 - 0.3 * ke})`)

  // the crowd steps back, the ones furthest out first
  CROWD.forEach((id, i) => {
    const t = easeInOutCubic(win(S, H.crowdBack[0] + (7 - i) * 3, H.crowdBack[1] - i * 3))
    const dir = i % 2 ? 1 : -1
    e.put(`hero:${id}`, dir * (2 + i * 0.7) * t, -4.2 * t, 1 - 0.3 * t)
  })
  for (let i = 0; i < 3; i++) e.put(`hero:x${i}`, 0, 0, 1, 0, 1 - win(S, 12, 40))
  for (const name of ['hero:anyL', 'hero:anyR']) e.put(name, 0, 0, 1, 0, 1 - win(S, 10, 30))

  const f = easeInOutCubic(w(S, H.familyOut))
  e.put('hero:family', 0, 0, 1 - 0.06 * f)
  e.put('hero:maya', 0, 0, 1 - 0.06 * f)
  e.put('hero:biscuit', 0, 0, 1 - 0.06 * f)
}

// =========================================================================================
// 01 TELL
// =========================================================================================
function measureTell(e) {
  const fan = L.TELL.fan[e.phone ? 'm' : 'd']
  const fy = e.fy.tell
  const prints = []
  for (let i = 0; i < KITCHEN.prints.length; i++) {
    const n = e.n(`tell:print${i}`)
    if (!n.el) continue
    const c = e.centre(n.el)
    const k = i - 2.5
    const tx = e.cx + (fan.x + k * fan.dx) * e.u
    const ty = fy - (fan.y - Math.abs(k) * fan.dy) * e.u
    // it flies in from beyond the left edge of the stage
    const from = (tx + fan.w * e.u) / e.u
    prints[i] = { dx: (tx - c.x) / e.u, dy: (ty - c.y) / e.u, s: (fan.w * e.u) / Math.max(1, c.w), r: fan.r[i], from }
  }
  const cn = e.n('tell:count')
  let count = null
  if (cn.el) {
    const c = e.centre(cn.el)
    count = { dx: (e.cx + fan.x * e.u - c.x) / e.u, dy: (fy - (fan.y + fan.w * 0.6) * e.u - c.y) / e.u }
  }
  e.geo.tell = { prints, count }
}

function tell(e, S) {
  const B = T.TELL
  const g = e.geo.tell
  const far = e.phone ? 0.55 : 1
  e.ghost('tell:ghost', S, T.FLOOD.tell)
  e.copy('tell', S, B.copy)
  e.put('tell:maya', 0, 0, arrive(S, T.FLOOD.tell))

  // the kitchen lands, then finishes itself: each stage wipes up from the floor over the last
  e.dropIn('tell:kitchen', w(S, B.kitchen), 46)
  const wipes = [0, 1, 2].map((i) => easeInOutCubic(win(S, B.sections.a + i * B.sections.step + 2, B.sections.a + i * B.sections.step + B.sections.dur - 2)))
  let active = -1
  for (let i = 0; i < 4; i++) {
    const a = i === 0 ? 1 : wipes[i - 1] // how far this stage has risen
    const b = i < 3 ? wipes[i] : 0 // how far the next one has covered it
    const n = e.n(`tell:k${i}`)
    const on = a > 0 && b < 1
    n.alpha(on ? 1 : 0)
    if (on) n.clip(a >= 1 ? '' : `inset(${pc(1 - a)} 0 0 0)`)
    if (i > 0 && a > 0 && a < 1) active = i - 1
  }
  const level = e.n('tell:level')
  level.alpha(active >= 0 ? 1 : 0)
  if (active >= 0) {
    level.tf(`translate3d(0,${f1((1 - wipes[active]) * e.geo.kitchenH)}px,0)`)
    e.n('tell:leveltag').text(KITCHEN.sections[active].heading)
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
      e.hide(`tell:print${i}`)
      continue
    }
    // when it docks: the inline three go with their sections, the gallery three after
    const inline = KITCHEN.sections.findIndex((sec) => sec.print === i)
    const at = inline >= 0 ? S0.a + inline * S0.step + 5 : S0.a + 2 * S0.step + 12 + KITCHEN.gallery.indexOf(i) * 5
    const d = easeInOutCubic(win(S, at, at + 20))
    const fe = back(t, 1.2)
    const fx = p.dx - (1 - fe) * p.from
    const fyo = p.dy + (1 - fe) * 6
    const fr = p.r + (1 - easeOutCubic(t)) * -40
    const arc = bump(d) * -7
    e.put(`tell:print${i}`, lerp(fx, 0, d), lerp(fyo, 0, d) + arc, lerp(p.s, 1, d), lerp(fr, 0, d), clamp(t * 4))
  }
  // the counter rides with the fan, then goes home to the page
  if (g && g.count) {
    const t = win(S, B.prints.a - 4, B.prints.a + 6)
    const d = easeInOutCubic(win(S, S0.a + 2 * S0.step + 20, S0.a + 2 * S0.step + 36))
    if (t <= 0) e.hide('tell:count')
    else e.put('tell:count', lerp(g.count.dx, 0, d), lerp(g.count.dy, 0, d) + bump(d) * -4, lerp(1.25, 1, d), 0, t)
    e.n('tell:countn').text(pad2(d > 0 ? 6 : landed))
    e.n('tell:gpre').text(d > 0.5 ? e.geo.galleryPre : '')
  }
  e.slideIn('tell:swatches', w(S, B.swatches), -26 * far, 0)

  // she talks: the waveform and the timer run with the scroll, the words stream
  e.popIn('tell:voice', w(S, B.voice), 0.5, -6, 3)
  const talk = w(S, B.talk)
  e.n('tell:wave').clip(talk >= 1 ? '' : `inset(0 ${pc(1 - talk)} 0 0)`)
  e.n('tell:timer').text(mmss(Math.round(talk * KITCHEN.voiceSeconds)))
  const nw = KITCHEN.transcript.length
  for (let i = 0; i < nw; i++) e.n(`tell:tw${i}`).op(win(talk, (i / nw) * 0.94, (i / nw) * 0.94 + 0.06))
  e.flyIn('tell:mic', w(S, B.mic), 22 * far, -18, 90)

  // the page writes itself
  const pg = w(S, B.page)
  const paper = e.n('tell:paper')
  paper.show(pg > 0)
  paper.op(clamp(pg * 3))
  paper.tf(pg >= 1 ? '' : `translate3d(0,${f1((1 - back(pg, 1.4)) * 8 * e.u)}px,0) scale(${lerp(0.9, 1, back(pg, 1.4))})`)
  e.fadeUp('tell:ptag', win(S, B.page[0] + 8, B.page[1] + 2), 8)
  e.fadeUp('tell:ptitle', w(S, B.title), 12)
  for (let i = 0; i < 3; i++) e.fadeUp(`tell:sec${i}`, win(S, S0.a + i * S0.step, S0.a + i * S0.step + 12), 12)
  e.fadeUp('tell:pchips', w(S, B.chips), 8)
  e.flyIn('tell:roller', w(S, B.roller), -30 * far, -20, -120)
  e.dropIn('tell:pots', w(S, B.pots), 26)

  // a sticker slaps on
  const st = w(S, B.sticker)
  if (st <= 0) e.hide('tell:sticker')
  else e.put('tell:sticker', 0, 0, lerp(2.1, 1, back(st, 2.6)), lerp(-22, 0, easeOutCubic(st)), clamp(st * 5))

  // and the people chosen for this story rise to read it
  e.riseIn('tell:ruth', w(S, B.ruth), 0)
  e.riseIn('tell:kate', w(S, B.kate), 1)
  e.fadeUp('tell:aud', w(S, B.aud), 14)
  e.fadeUp('tell:bl', win(S, B.readouts[0], B.readouts[0] + 22), 24)
  e.fadeUp('tell:br', win(S, B.readouts[0] + 14, B.readouts[1]), 24)
}

// =========================================================================================
// 02 READ
// =========================================================================================
function read(e, S) {
  const B = T.READ
  const far = e.phone ? 0.5 : 1
  e.ghost('read:ghost', S, T.FLOOD.read)
  e.copy('read', S, B.copy)
  e.put('read:tom', 0, 0, arrive(S, T.FLOOD.read))

  // the finish arch slides up behind him; the barrier lands at the side
  const ar = w(S, B.arch)
  if (ar <= 0) e.hide('read:arch')
  else e.put('read:arch', 0, (1 - back(ar, 1.3)) * 30, lerp(0.86, 1, easeOutCubic(ar)), 0, clamp(ar * 4))
  e.dropIn('read:barrier', w(S, B.barrier), 44)

  // six prints fly up into a gallery wall
  for (let i = 0; i < 6; i++) {
    const t = wi(S, B.wall, i)
    const col = i % 3
    e.flyIn(`read:w${i}`, t, (26 + col * 6) * far, 34 + (i > 2 ? 10 : 0), (i % 2 ? 1 : -1) * 34, 0.6)
  }
  e.flyIn('read:medal', w(S, B.medal), -8, -30, -160)
  e.dropIn('read:shoe', w(S, B.shoe), 50)

  // a clip: the ring fills with the scroll
  e.popIn('read:video', w(S, B.video), 0.5, -5, 4)
  e.n('read:ring').css('--p', String(Math.round(w(S, B.ring) * 100)))
  e.slideIn('read:lightbox', w(S, B.lightbox), 30 * far, 6, 0.86)

  // the cheer squad pops in
  ;['ivy', 'leo', 'maya', 'sam'].forEach((id, i) => e.riseIn(`read:${id}`, wi(S, B.squad, i), i))
  e.flyIn('read:banana', w(S, B.banana), 30 * far, -24, 220)
  e.dropIn('read:cowbell', w(S, B.cowbell), 50)

  // reactions, then comments from the people who can open it
  const rx = w(S, B.reactions)
  e.put('read:reactions', 0, 0, 1, 0, clamp(rx * 4))
  for (let i = 0; i < 3; i++) {
    const t = win(rx, i * 0.22, i * 0.22 + 0.56)
    const n = e.n(`read:rx${i}`)
    n.show(t > 0)
    n.op(clamp(t * 4))
    n.tf(t >= 1 ? '' : `translate3d(0,${f1((1 - back(t, 2.4)) * 16)}px,0) scale(${lerp(0.4, 1, back(t, 2.4))})`)
  }
  for (let i = 0; i < 2; i++) e.popIn(`read:c${i}`, wi(S, B.comments, i), 0.7, i ? 4 : -4, 5)

  e.fadeUp('read:aud', w(S, B.aud), 14)
  e.fadeUp('read:bl', win(S, B.readouts[0], B.readouts[0] + 22), 24)
  e.fadeUp('read:br', win(S, B.readouts[0] + 14, B.readouts[1]), 24)
}

// =========================================================================================
// 03 MAP: the route
// =========================================================================================
function map(e, S) {
  const B = T.MAP
  const far = e.phone ? 0.5 : 1
  e.ghost('map:ghost', S, T.FLOOD.map)
  e.copy('map', S, B.copy)
  e.put('map:family', 0, 0, arrive(S, T.FLOOD.map))

  // the campervan rolls in and dips on its brakes
  const vn = w(S, B.van)
  if (vn <= 0) e.hide('map:van')
  else e.put('map:van', -(1 - easeOutCubic(vn)) * 70 * far, 0, 1, 1.4 * bump(win(vn, 0.7, 1)), clamp(vn * 6))
  const lh = w(S, B.lighthouse)
  if (lh <= 0) e.hide('map:lighthouse')
  else e.put('map:lighthouse', 0, (1 - back(lh, 1.3)) * 22, lerp(0.8, 1, easeOutCubic(lh)), 0, clamp(lh * 4))
  e.dropIn('map:waymarker', w(S, B.waymarker), 40)

  // the route draws itself along the floor; each pin pops as the line reaches it
  const rt = w(S, B.route)
  const route = e.n('map:route')
  route.show(rt > 0)
  route.clip(rt >= 1 ? '' : `inset(-20% ${pc(1 - (0.04 + rt * 0.96))} -20% 0)`)
  for (let i = 0; i < 6; i++) {
    const t = wi(S, B.pin, i)
    e.popIn(`map:pin${i}`, win(t, 0, 0.6), 0.2, 0, 3)
    const p = win(t, 0.25, 1)
    if (p <= 0) e.hide(`map:print${i}`)
    else e.put(`map:print${i}`, 0, (1 - back(p, 1.8)) * 9, lerp(0.3, 1, back(p, 1.8)), (i % 2 ? 1 : -1) * (1 - easeOutCubic(p)) * 14, clamp(p * 4))
  }
  e.flyIn('map:icecream', w(S, B.icecream), -20 * far, -24, -140)
  e.flyIn('map:binoculars', w(S, B.binoculars), 26 * far, -22, 100)
  e.dropIn('map:flask', w(S, B.flask), 40)
  e.slideIn('map:journey', w(S, B.journey), 36 * far, 4, 0.86)
  e.fadeUp('map:aud', w(S, B.aud), 14)
  e.fadeUp('map:bl', win(S, B.readouts[0], B.readouts[0] + 22), 24)
  e.fadeUp('map:br', win(S, B.readouts[0] + 14, B.readouts[1]), 24)

  // beat B: everything eases back, and all but the family lets go
  const bk = easeInOutCubic(w(S, B.back))
  const grp = e.n('map:group')
  grp.tf(bk <= 0 ? '' : `scale(${f3(lerp(1, 0.6, bk))})`)
  if (bk > 0) {
    const o = 1 - win(bk, 0, 0.6)
    for (const name of ['map:waymarker', 'map:flask', 'map:icecream', 'map:binoculars', 'map:journey', 'map:route']) e.n(name).op(o)
    for (let i = 0; i < 6; i++) {
      e.n(`map:pin${i}`).op(o)
      e.n(`map:print${i}`).op(o)
    }
    for (const name of ['map:copy', 'map:bl', 'map:br']) e.n(name).op(1 - win(bk, 0, 0.5))
    e.n('map:ghost').op(1 - win(bk, 0.2, 0.9))
  } else e.n('map:ghost').op(1)
}

// =========================================================================================
// the world
// =========================================================================================
const WORLD_CARDS = ['joe', 'kate', 'marcus', 'ruth']
function world(e, S) {
  const B = T.WORLD
  const far = e.phone ? 0.5 : 1
  const on = S >= B.cut
  e.scenes.world.root.show(on)
  if (!on) return
  e.put('world:family')
  e.put('world:van')
  e.put('world:lighthouse')
  const g = e.n('world:ghost')
  g.op(w(S, B.ghost))
  e.ghost('world:ghost', S, [B.ghost[0], B.ghost[1] + 20])
  e.copy('world', S, B.copy)

  // the dotted map spreads from home across the wall
  const mp = easeOutCubic(w(S, B.map))
  const dots = e.n('world:map')
  dots.show(mp > 0)
  dots.clip(mp >= 1 ? '' : `circle(${f1(mp * 110)}% at ${e.geo.homeX || '50%'} ${e.geo.homeY || '30%'})`)

  // the whole route is now one pin: it rises from the family to its place on the map
  const hm = w(S, B.home)
  const line = e.n('world:l-home')
  line.op(win(hm, 0.3, 1))
  if (hm <= 0) e.hide('world:cluster')
  else e.put('world:cluster', 0, (1 - back(hm, 1.5)) * 26, lerp(0.4, 1, back(hm, 1.5)), 0, clamp(hm * 4))

  // the relatives' own stories land, one by one
  let count = 5
  WORLD_CARDS.forEach((id, i) => {
    const t = wi(S, B.cards, i)
    if (t > 0.6 && (id === 'kate' || id === 'ruth')) count++
    e.flyIn(`world:card-${id}`, t, (i % 2 ? 26 : -26) * far, -30, (i % 2 ? 1 : -1) * 24, 0.6)
    e.n(`world:l-${id}`).op(win(t, 0.6, 1))
  })
  e.popIn('world:pin-madeira', win(wi(S, B.cards, 0), 0.3, 0.9), 0.2, 0, -6)
  e.popIn('world:pin-osaka', win(wi(S, B.cards, 2), 0.3, 0.9), 0.2, 0, -6)
  e.n('world:count').text(String(count))
  e.fadeUp('world:bl', w(S, B.readouts), 24)
}

// =========================================================================================
// 04 YEAR
// =========================================================================================
const YEAR_STEPS = YEAR_COPY.steps
const YEAR_SETS = Object.keys(L.YEAR.sets)
const YEAR_REST = YEAR_STEPS[YEAR_STEPS.length - 1]
const YEAR_TAB = Object.fromEntries(YEAR_SETS.map((c) => [c, YEAR_COPY.categories.indexOf(c)]))
const YEAR_DEAL = [...YEAR_SETS.filter((c) => c !== YEAR_REST), YEAR_REST]

function year(e, S) {
  const B = T.YEAR
  const far = e.phone ? 0.5 : 1
  e.ghost('year:ghost', S, T.FLOOD.year)
  e.copy('year', S, B.copy)

  // the eight tabs drop in, one after another
  for (let i = 0; i < 8; i++) {
    const t = wi(S, B.tabs, i)
    const n = e.n(`year:tab${i}`)
    n.show(t > 0)
    n.op(clamp(t * 3))
    n.tf(t >= 1 ? '' : `translate3d(0,${f1(-(1 - back(t, 1.8)) * 44)}px,0) rotate(${f1((1 - easeOutCubic(t)) * (i % 2 ? 8 : -8))}deg)`)
  }

  // which category the scroll is on, and how far into the swap to it
  let step = 0
  let sw = 1
  for (let i = 0; i < B.steps.length; i++) {
    if (S >= B.steps[i]) {
      step = i + 1
      sw = win(S, B.steps[i], B.steps[i] + B.stepDur)
    }
  }
  const cur = YEAR_STEPS[step]
  const prev = YEAR_STEPS[Math.max(0, step - 1)]
  const first = arrive(S, T.FLOOD.year)

  // kids and props: the old set drops out through the floor, the new one pops up. Never two bodies at once.
  for (const cat of YEAR_SETS) {
    const isCur = cat === cur
    const isPrev = cat === prev && step > 0 && sw < 0.5
    const actors = [...L.YEAR.sets[cat].map((a) => `year:k-${a.key}`), ...L.YEAR.props[cat].map((a) => `year:p-${a.key}`)]
    actors.forEach((name, i) => {
      const n = e.n(name)
      if (!n.el) return
      if (isPrev) {
        const o = win(sw, 0, 0.46)
        n.alpha(1 - o)
        n.tf(`translate3d(0,${f1(o * o * 5 * e.u)}px,0) scale(${f3(1 - 0.12 * o)})`)
      } else if (isCur && (step === 0 || sw >= 0.5)) {
        const t = step === 0 ? 1 : win(sw, 0.5 + i * 0.05, 0.95 + i * 0.02)
        const pop = step === 0 ? first : lerp(0.72, 1, back(t, 2.2))
        n.alpha(step === 0 ? 1 : clamp(t * 5))
        const px = e.px * n.par
        n.tf(Math.abs(pop - 1) < 0.0005 && Math.abs(px) < 0.05 ? '' : `translate3d(${f1(px)}px,${f1((1 - Math.min(1, pop)) * 3 * e.u)}px,0) scale(${f3(pop)})`)
      } else {
        n.alpha(0)
      }
    })
    // the tab follows
    const tab = e.n(`year:tab${YEAR_TAB[cat]}`)
    if (tab.el) tab.attr('data-on', isCur && (step === 0 || sw >= 0.3))
  }

  // the matching feed card deals onto the pile
  YEAR_DEAL.forEach((cat, i) => {
    const name = `year:card-${cat}`
    const n = e.n(name)
    if (!n.el) return
    const at = cat === YEAR_REST ? B.copy[0] + 26 : B.steps[YEAR_STEPS.indexOf(cat) - 1] + 3
    const t = win(S, at, at + 14)
    e.flyIn(name, t, 34 * far, -26, i % 2 ? 26 : -26, 0.7)
    // the birthday card comes back to the top when the scroll returns to it
    const top = cat === YEAR_REST ? (S >= B.steps[3] + 4 ? 12 : 5) : 6 + i
    if (n.z !== top) {
      n.z = top
      n.el.parentElement.style.zIndex = String(top)
    }
    if (cat === YEAR_REST && step === 4) {
      const hop = bump(win(S, B.steps[3] + 2, B.steps[3] + 14))
      if (hop > 0) e.put(name, 0, -4 * hop, 1 + 0.06 * hop, -3 * hop)
    }
  })

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

  e.riseIn('year:joe', w(S, B.joe), 0)
  e.riseIn('year:ruth', w(S, B.ruth), 1)
  e.fadeUp('year:aud', w(S, B.aud), 14)
  e.fadeUp('year:bl', win(S, B.readouts[0], B.readouts[0] + 22), 24)
  e.fadeUp('year:br', win(S, B.readouts[0] + 14, B.readouts[1]), 24)
}

// =========================================================================================
// FINALE: the portrait
// =========================================================================================
const OURS_CROWD = ['ruth', 'sam', 'marcus', 'joe', 'kate', 'priya', 'finn', 'deb']
const OURS_TAGS = ['kitchen', 'marathon', 'coast', 'ivy', 'joe']
const OURS_PARTS = [
  ['ours:arch', 0, -60, 0],
  ['ours:van', -90, -10, -6],
  ['ours:lighthouse', 90, -10, 6],
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
  const far = e.phone ? 0.5 : 1
  e.ghost('app:ghost', S, T.FLOOD.app)
  // the real feed opens from where the print was
  const f = w(S, B.feed)
  const g = e.geo.app
  if (f <= 0) e.hide('app:feed')
  else {
    const k = easeInOutCubic(win(f, 0.25, 1))
    e.put('app:feed', (g ? g.dx : 0) * (1 - k), (g ? g.dy : 0) * (1 - k), lerp(0.36, 1, back(win(f, 0.25, 1), 1.2)), lerp(-3, 0, k), clamp(f * 5))
  }
  e.copy('app', S, B.copy)
  for (let i = 0; i < 4; i++) e.slideIn(`app:r${i}`, wi(S, B.rail, i), 26 * far, 0, 0.9)
  e.riseIn('app:ruth', win(S, B.copy[0] + 4, B.copy[0] + 22), 0)
  e.riseIn('app:joe', win(S, B.copy[0] + 12, B.copy[0] + 30), 1)
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
export const BEATS = { hero, tell, read, map, world, year, ours, app, end }

/** Layout-dependent numbers, read once per resize with the poster showing. */
export function MEASURE(e) {
  e.atPoster(() => {
    const pre = e.n('tell:gpre')
    if (pre.el && e.geo.galleryPre == null) e.geo.galleryPre = pre.el.textContent
    const k = e.n('tell:kitchen')
    e.geo.kitchenH = k.el ? k.el.offsetHeight : 0
    if (e.scenes.tell) measureTell(e)
    // the feed opens from the middle of the screen, where the portrait shrank to
    const fd = e.n('app:feed')
    if (fd.el) {
      const c = e.centre(fd.el)
      e.geo.app = { dx: (e.cx - c.x) / e.u, dy: (e.H * 0.48 - c.y) / e.u }
    }
    // where home sits inside the dotted map, for the map's reveal
    const k2 = e.phone ? 'm' : 'd'
    const box = L.WORLD.box[k2]
    const home = L.WORLD.home[k2]
    e.geo.homeX = `${f1(((home.x - box.x0) / box.w) * 100)}%`
    e.geo.homeY = `${f1(((box.top - home.y) / (box.w / 3)) * 100)}%`
  })
}
