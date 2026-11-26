// The film's engine (owner: film). One instance per pinned Film. Every frame it turns scroll
// progress (plus the pointer) into transforms, opacities and clip-paths written straight to
// elements found by their data-f names. No React state, no layout reads in the frame loop.
//
// The rule that keeps posters honest: with no inline style an element sits at its HOLD, drawn
// by CSS. Every helper here writes an OFFSET from that hold and clears the inline style when
// the offset reaches zero, so a scene at rest is exactly its poster.
import { clamp, easeOutCubic, lerp, win } from '../lib/math.js'
import { scrollToY } from '../lib/scroll.js'
import { BEATS, MEASURE } from './beats.js'
import { back, bump, drop, f1, f3, floodEase, w } from './ease.js'
import { STAGE } from './layout.js'
import * as T from './timeline.js'

// ---- a cached element: only touches the DOM when a value really changed -------------------
class N {
  constructor(el) {
    this.el = el
    this.o = null
    this.t = null
    this.v = null
    this.c = null
    this.x = null
    this.par = el ? Number(el.getAttribute('data-par')) || 0 : 0
  }
  show(on) {
    if (on !== this.v) {
      this.v = on
      this.el.style.visibility = on ? '' : 'hidden'
    }
    return this
  }
  op(o) {
    const r = f3(clamp(o))
    if (r !== this.o) {
      this.o = r
      this.el.style.opacity = r >= 1 ? '' : String(r)
    }
    return this
  }
  /** Opacity written as a number even at 1, for elements whose poster state is transparent. */
  alpha(o) {
    const r = 'a' + f3(clamp(o))
    if (r !== this.o) {
      this.o = r
      this.el.style.opacity = r.slice(1)
    }
    return this
  }
  tf(t) {
    if (t !== this.t) {
      this.t = t
      this.el.style.transform = t
    }
    return this
  }
  clip(c) {
    if (c !== this.c) {
      this.c = c
      this.el.style.clipPath = c
    }
    return this
  }
  text(x) {
    if (x !== this.x) {
      this.x = x
      this.el.textContent = x
    }
    return this
  }
  /** A CSS custom property (for a ring that fills, a line that draws). */
  css(k, v) {
    if (!this.vars) this.vars = {}
    if (this.vars[k] !== v) {
      this.vars[k] = v
      this.el.style.setProperty(k, v)
    }
    return this
  }
  attr(k, on) {
    if (on) this.el.setAttribute(k, '')
    else this.el.removeAttribute(k)
    return this
  }
  /** Back to the poster. */
  reset() {
    const st = this.el.style
    st.visibility = ''
    st.opacity = ''
    st.transform = ''
    st.clipPath = ''
    if (this.vars) for (const k of Object.keys(this.vars)) st.removeProperty(k)
    this.vars = null
    this.o = this.t = this.v = this.c = null
  }
}
/** Stands in for an element that is not on the page, so a typo never throws mid-scroll. */
const NIL = new Proxy(
  {},
  {
    get: (_, k) => (k === 'el' ? null : k === 'par' ? 0 : () => NIL),
  },
)

export class FilmEngine {
  constructor(section, pin, opts = {}) {
    this.section = section
    this.pin = pin
    this.monthNames = opts.months || []
    this.E = new Map()
    this.words = new Map()
    this.scenes = {}
    this.missing = new Set()
    this.dead = false

    pin.querySelectorAll('[data-f]').forEach((el) => this.E.set(el.getAttribute('data-f'), new N(el)))
    pin.querySelectorAll('[data-hw]').forEach((el) => {
      const id = el.getAttribute('data-hw')
      if (!this.words.has(id)) this.words.set(id, [])
      this.words.get(id).push(new N(el))
    })
    // parts of an actor that the engine moves separately from its wrapper
    this.A = new Map()
    pin.querySelectorAll('[data-actor]').forEach((el) => {
      const rise = el.querySelector('[data-rise]')
      const sh = el.querySelector('[data-shadow]')
      this.A.set(el.getAttribute('data-f'), { rise: rise ? new N(rise) : NIL, sh: sh ? new N(sh) : NIL })
    })
    pin.querySelectorAll('[data-scene]').forEach((el) => {
      this.scenes[el.getAttribute('data-scene')] = { el, root: new N(el), live: null }
    })
    this.rim = this.n('rim')

    this.reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    this.hover = typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches

    // geometry (set in resize)
    this.W = 0
    this.H = 0
    this.u = 1
    this.cx = 0
    this.phone = false
    this.Rmax = 1
    this.fy = {}
    this.geo = {}

    // live state
    this.S = 0
    this.key = ''
    this.force = true
    this.last = 0
    this.px = 0
    this.py = 0
    this.tx = 0
    this.ty = 0
    this.active = ''
    this.month = -1

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(pin)
    this.resize()
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => !this.dead && this.resize())

    this.onPointer = (e) => {
      this.tx = clamp((e.clientX / Math.max(1, window.innerWidth)) * 2 - 1, -1, 1)
      this.ty = clamp((e.clientY / Math.max(1, window.innerHeight)) * 2 - 1, -1, 1)
    }
    if (this.hover && !this.reduced) window.addEventListener('pointermove', this.onPointer, { passive: true })

    this.timers = []
    this.cleanup = []
    this.grab()
    this.intro()
    this.holdBack()
  }

  /**
   * Stacking every scene in one viewport would make the browser fetch every lazy image at
   * once. So the images of scenes that are not coming up yet are parked (their src put
   * aside) and given back one scene ahead of the scroll, in order, then decoded.
   */
  holdBack() {
    this.parked = {}
    T.ORDER.forEach((k, i) => {
      // the hero is on screen and chapter 01 is next: the browser's own lazy loading has them
      if (i < 2) return
      const sc = this.scenes[k]
      if (!sc) return
      const list = []
      sc.el.querySelectorAll('img').forEach((img) => {
        if (img.complete && img.naturalWidth) return
        const src = img.getAttribute('src')
        const srcset = img.getAttribute('srcset')
        if (!src) return
        list.push({ img, src, srcset })
        img.removeAttribute('srcset')
        img.removeAttribute('src')
      })
      this.parked[k] = list
    })
  }
  warm(k) {
    const list = this.parked && this.parked[k]
    if (!list) return
    this.parked[k] = null
    list.forEach(({ img, src, srcset }) => {
      // a cut-out this screen does not use (the other layout's) stays lazy
      if (srcset) img.setAttribute('srcset', srcset)
      img.setAttribute('src', src)
      if (img.offsetParent === null && getComputedStyle(img).position !== 'fixed') return
      img.loading = 'eager'
      const ready = () => img.decode && img.decode().catch(() => undefined)
      if (img.complete) ready()
      else img.addEventListener('load', ready, { once: true })
    })
  }

  /** Dragging across a switch picks whatever is under the pointer (a click already works natively). */
  grab() {
    this.pin.querySelectorAll('[data-aud]').forEach((fs) => {
      let down = false
      const at = (e) => {
        const el = document.elementFromPoint(e.clientX, e.clientY)
        const label = el && el.closest ? el.closest('label') : null
        if (!label || !fs.contains(label)) return
        const input = label.querySelector('input')
        if (input && !input.checked) input.checked = true
      }
      const onDown = () => {
        down = true
        this.stopIntro(false)
      }
      const onMove = (e) => {
        if (down) at(e)
      }
      const onUp = () => {
        down = false
      }
      const onKey = () => this.stopIntro(false)
      fs.addEventListener('pointerdown', onDown)
      fs.addEventListener('keydown', onKey)
      window.addEventListener('pointermove', onMove, { passive: true })
      window.addEventListener('pointerup', onUp, { passive: true })
      window.addEventListener('pointercancel', onUp, { passive: true })
      this.cleanup.push(() => {
        fs.removeEventListener('pointerdown', onDown)
        fs.removeEventListener('keydown', onKey)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
      })
    })
  }

  /**
   * The switch's opening play, once: Private, then Close Family, then back to Followers,
   * where it rests. Skipped under reduced motion or if the visitor has already scrolled;
   * any touch of the switch or the scroll wheel ends it.
   */
  intro() {
    const fs = this.pin.querySelector('[data-scene="hero"] [data-aud]')
    if (!fs || this.reduced || window.scrollY > 8) return
    // ?intro=0 skips the play (used when shooting checkpoint sheets)
    if (/[?&]intro=0\b/.test(window.location.search)) return
    this.introFs = fs
    const pick = (v) => {
      const el = fs.querySelector(`input[value="${v}"]`)
      if (el) el.checked = true
    }
    this.introPick = pick
    this.timers.push(
      setTimeout(() => pick('private'), 1000),
      setTimeout(() => pick('close'), 1950),
      setTimeout(() => {
        pick('followers')
        this.introFs = null
      }, 3000),
    )
  }
  /** rest: put the switch back on Followers (when scrolling ended the play, not the visitor's own choice). */
  stopIntro(rest) {
    if (!this.introFs) return
    this.timers.forEach((t) => clearTimeout(t))
    this.timers = []
    if (rest) this.introPick('followers')
    this.introFs = null
  }

  destroy() {
    this.dead = true
    this.ro.disconnect()
    window.removeEventListener('pointermove', this.onPointer)
    this.timers.forEach((t) => clearTimeout(t))
    this.cleanup.forEach((fn) => fn())
    if (this.parked) for (const k of Object.keys(this.parked)) this.warm(k)
    this.E.forEach((n) => n.reset())
    this.words.forEach((list) => list.forEach((n) => n.reset()))
    this.A.forEach((a) => {
      if (a.rise.el) a.rise.reset()
      if (a.sh.el) a.sh.reset()
    })
    Object.values(this.scenes).forEach((s) => {
      s.root.reset()
      s.el.removeAttribute('data-live')
    })
  }

  // ---- lookups ----------------------------------------------------------------------------
  n(name) {
    const n = this.E.get(name)
    if (n) return n
    if (!this.missing.has(name)) {
      this.missing.add(name)
      if (import.meta.env && import.meta.env.DEV) console.warn(`[film] no element data-f="${name}"`)
    }
    return NIL
  }

  // ---- geometry ----------------------------------------------------------------------------
  resize() {
    const W = this.pin.clientWidth
    const H = this.pin.clientHeight
    if (!W || !H) return
    this.W = W
    this.H = H
    this.phone = W / H <= 0.9
    this.u = this.phone ? Math.min(H / 100, W * 0.0216) : Math.min(H / 100, W * 0.00625)
    this.cx = W / 2
    const k = this.phone ? 'm' : 'd'
    for (const key of T.ORDER) this.fy[key] = (STAGE[key][k].floor / 100) * H
    this.Rmax = Math.hypot(W / 2, H) + 0.06 * H
    // Positions that depend on layout are read here, never in the frame loop.
    try {
      MEASURE(this)
    } catch (err) {
      console.warn('[film] measure failed', err)
    }
    this.force = true
  }

  /** Centre of an element in pin coordinates, with every engine transform taken off first. */
  centre(el) {
    const p = this.pin.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    return { x: r.left - p.left + r.width / 2, y: r.top - p.top + r.height / 2, w: r.width, h: r.height }
  }
  /** Run fn with the poster showing (inline transforms off), then mark everything dirty. */
  atPoster(fn) {
    const saved = []
    this.E.forEach((n) => {
      if (n.el.style.transform) {
        saved.push(n)
        n.el.style.transform = ''
      }
    })
    try {
      fn()
    } finally {
      saved.forEach((n) => {
        n.el.style.transform = n.t || ''
      })
    }
  }

  // ---- things to grab -----------------------------------------------------------------------
  /** Glide to where a scene rests. */
  jump(key, immediate) {
    const S = T.HOLD[key]
    if (S == null) return
    const r = this.section.getBoundingClientRect()
    const top = r.top + window.scrollY
    const range = Math.max(0, r.height - window.innerHeight)
    scrollToY(top + (S / T.SPAN) * range, { immediate: !!immediate })
  }

  // ---- the frame ----------------------------------------------------------------------------
  frame(p, f) {
    if (this.dead || !this.W) return
    const S = p * T.SPAN
    this.S = S
    if (this.introFs && S > 3) this.stopIntro(true)
    const dt = this.last ? Math.min(0.05, (f.time - this.last) / 1000) : 0.016
    this.last = f.time
    this.time = f.time

    // pointer parallax, eased
    if (this.hover && !this.reduced) {
      const e = 1 - Math.exp(-dt * 5)
      this.px += (this.tx - this.px) * e
      this.py += (this.ty - this.py) * e
      if (Math.abs(this.tx - this.px) < 0.002) this.px = this.tx
      if (Math.abs(this.ty - this.py) < 0.002) this.py = this.ty
    }

    const key = `${S.toFixed(2)}|${this.px.toFixed(3)}|${this.py.toFixed(3)}`
    if (key === this.key && !this.force) return
    this.key = key
    this.force = false

    this.floods(S)
    for (const k of T.ORDER) {
      const sc = this.scenes[k]
      if (sc && sc.live && BEATS[k]) BEATS[k](this, S)
    }
    this.hud(S)
  }

  /** Which scenes are on stage, and how far each wash has flooded. */
  floods(S) {
    let rimOn = false
    T.ORDER.forEach((k, i) => {
      const sc = this.scenes[k]
      if (!sc) return
      if (this.parked && this.parked[k] && S >= T.LIVE[k][0] - 300 && S <= T.LIVE[k][1] + 300) this.warm(k)
      const live = S >= T.LIVE[k][0] && S <= T.LIVE[k][1]
      if (live !== sc.live) {
        sc.live = live
        sc.root.attr('data-live', live)
      }
      if (!live) return
      const fl = T.FLOOD[k]
      if (!fl) return
      const v = floodEase(w(S, fl))
      if (v >= 1) {
        sc.root.clip('')
        return
      }
      const R = v * this.Rmax
      // the app and the close open from the middle of the screen, where the print sits
      const at = `${f1(this.cx)}px ${f1(k === 'app' || k === 'end' ? this.H * 0.48 : this.fy[k])}px`
      sc.root.clip(`circle(${f1(R)}px at ${at})`)
      if (!rimOn && v > 0) {
        rimOn = true
        this.rim.show(true)
        this.rim.el.style.zIndex = String(i * 2)
        this.rim.clip(`circle(${f1(R + 0.012 * this.H)}px at ${at})`)
        this.rim.op(0.7 * (1 - v * v))
      }
    })
    if (!rimOn) this.rim.show(false)
  }

  // ---- motion helpers: each writes an offset from the hold ----------------------------------

  /** Offset an element from its hold: dx, dy in u, scale, rotation in degrees, opacity. */
  put(name, dx = 0, dy = 0, s = 1, r = 0, o = 1, sy = s) {
    const n = this.n(name)
    if (!n.el) return n
    const x = dx * this.u + this.px * n.par
    const y = dy * this.u + this.py * n.par * 0.35
    const still = Math.abs(x) < 0.05 && Math.abs(y) < 0.05 && Math.abs(s - 1) < 0.0005 && Math.abs(sy - 1) < 0.0005 && Math.abs(r) < 0.02
    n.show(o > 0.001)
    n.tf(still ? '' : `translate3d(${f1(x)}px,${f1(y)}px,0) rotate(${f1(r)}deg) scale(${f3(s)},${f3(sy)})`)
    n.op(o)
    return n
  }
  hide(name) {
    const n = this.n(name)
    if (n.el) n.show(false)
    return n
  }

  /** People rise from below the floor line. t: 0 below, 1 standing; overshoots on the way. */
  riseIn(name, t, i = 0, out = 0) {
    const a = this.A.get(name)
    if (!a) return
    if (t <= 0 || out >= 1) {
      this.hide(name)
      return
    }
    this.put(name)
    const e = back(t, 1.9) * (1 - out * out)
    const wob = (1 - clamp(t)) * (i % 2 ? -5 : 5)
    a.rise.tf(e >= 0.9995 && out <= 0 ? '' : `translate3d(0,${f1((1 - e) * 104)}%,0) rotate(${f1(wob)}deg)`)
    a.sh.op(clamp(t * 1.7 - 0.5) * (1 - out))
  }
  /** Something in the air: flies in from (fx, fy) u away, overshoots, settles. */
  flyIn(name, t, fx, fy, spin = 0, s0 = 0.55) {
    if (t <= 0) return this.hide(name)
    const e = back(t, 1.25)
    return this.put(name, fx * (1 - e), fy * (1 - e), lerp(s0, 1, e), spin * (1 - easeOutCubic(t)), clamp(t * 5))
  }
  /** Something heavy: drops from `h` u above, lands, squashes, rebounds once. */
  dropIn(name, t, h = 70) {
    if (t <= 0) return this.hide(name)
    const d = drop(t)
    const squash = 1 - 0.08 * bump(win(t, 0.52, 0.8))
    const n = this.put(name, 0, -d * h, 1, 0, clamp(t * 6), squash)
    const a = this.A.get(name)
    if (a) a.sh.op(clamp(1 - d * 2.6))
    return n
  }
  /** A pop: scales up past its size and settles. */
  popIn(name, t, s0 = 0.4, r0 = 0, dy = 0) {
    if (t <= 0) return this.hide(name)
    const e = back(t, 2.2)
    return this.put(name, 0, dy * (1 - e), lerp(s0, 1, e), r0 * (1 - easeOutCubic(t)), clamp(t * 4))
  }
  /** Slides in from (fx, fy) u away and settles without overshoot. */
  slideIn(name, t, fx, fy, s0 = 1) {
    if (t <= 0) return this.hide(name)
    const e = easeOutCubic(t)
    return this.put(name, fx * (1 - e), fy * (1 - e), lerp(s0, 1, e), 0, clamp(t * 3))
  }
  /** Copy and instruments: a short rise and fade. dy in px. */
  fadeUp(name, t, dy = 18) {
    const n = this.n(name)
    if (!n.el) return n
    if (t <= 0) return n.show(false)
    const e = easeOutCubic(t)
    n.show(true)
    n.tf(e >= 0.9995 ? '' : `translate3d(0,${f1((1 - e) * dy)}px,0)`)
    n.op(e)
    return n
  }
  /** A headline arrives word by word, each landing a little past its mark. */
  headline(id, t) {
    const list = this.words.get(id)
    if (!list) return
    const n = list.length
    const st = n > 1 ? 0.56 / (n - 1) : 0
    list.forEach((wd, i) => {
      const a = win(t, i * st, i * st + 0.44)
      const e = back(a, 1.3)
      wd.op(clamp(a * 2.2))
      wd.tf(a >= 1 ? '' : `translate3d(0,${f3((1 - e) * 0.62)}em,0) rotate(${f1((1 - e) * 3)}deg)`)
    })
  }
  /** The chapter copy block: eyebrow and slate, then the head word by word, then the sentence. */
  copy(k, S, r) {
    const a = r[0]
    this.fadeUp(`${k}:copy`, win(S, a, a + 10), 10)
    this.headline(k, win(S, a + 2, r[1]))
    const b = this.n(`${k}:body`)
    if (b.el) {
      const e = easeOutCubic(win(S, r[1] - 12, r[1] + 6))
      b.op(e)
      b.tf(e >= 0.9995 ? '' : `translate3d(0,${f1((1 - e) * 12)}px,0)`)
    }
  }
  /** The ghost word settles into place as its colour arrives. */
  ghost(name, S, fl) {
    const n = this.n(name)
    if (!n.el) return
    const v = easeOutCubic(w(S, fl))
    const x = this.px * -9
    const y = (1 - v) * 0.05 * this.H + this.py * -4
    const sc = lerp(1.16, 1, v)
    n.tf(Math.abs(x) < 0.05 && Math.abs(y) < 0.05 && sc < 1.0005 ? '' : `translate3d(${f1(x)}px,${f1(y)}px,0) scale(${f3(sc)})`)
  }

  // ---- HUD: the month counter and the rail ---------------------------------------------------
  hud(S) {
    // the month runs with the scroll between scenes and rests on each scene's own month
    let m = 0
    for (let i = 1; i < T.ORDER.length; i++) {
      const k = T.ORDER[i]
      const prev = T.ORDER[i - 1]
      const fl = T.FLOOD[k] || [T.LIVE[k][0], T.LIVE[k][0] + 20]
      const t = win(S, fl[0] - 14, fl[1] - 6)
      if (t > 0) m = lerp(T.MONTH[prev], T.MONTH[k], t)
    }
    const mi = Math.round(m)
    if (mi !== this.month) {
      this.month = mi
      this.n('hud:month').text(this.monthNames[mi] || '')
      for (let i = 0; i < 12; i++) this.n(`hud:tick${i}`).attr('data-on', i <= mi)
    }
    const counter = this.n('hud:counter')
    const cIn = win(S, 70, 100)
    const cOut = win(S, T.FLOOD.app[0] - 6, T.FLOOD.app[0] + 14)
    counter.show(cIn > 0 && cOut < 1)
    counter.op(cIn * (1 - cOut))

    // rail: appears with chapter 01, leaves before the close
    const rail = this.n('hud:rail')
    const rIn = win(S, 82, 112)
    const rOut = win(S, T.FLOOD.end[0] - 4, T.FLOOD.end[0] + 14)
    // it steps aside while the portrait's own switch is on stage
    const mid = win(S, T.FLOOD.ours[0] - 6, T.FLOOD.ours[0] + 10) * (1 - win(S, T.FLOOD.app[0] + 14, T.FLOOD.app[0] + 34))
    const ro = easeOutCubic(rIn) * (1 - rOut) * (1 - mid)
    rail.show(ro > 0)
    rail.op(ro)
    rail.tf(rIn >= 1 ? '' : `translate3d(0,${f1((1 - easeOutCubic(rIn)) * 40)}px,0)`)

    let active = ''
    if (S >= T.FLOOD.tell[0] + 12) active = 'tell'
    if (S >= T.FLOOD.read[0] + 12) active = 'read'
    if (S >= T.FLOOD.map[0] + 12) active = 'map'
    if (S >= T.FLOOD.year[0] + 12) active = 'year'
    if (S >= T.FLOOD.ours[0] + 12) active = ''
    if (S >= T.FLOOD.app[0] + 12) active = 'app'
    if (active !== this.active) {
      if (this.active) this.n(`rail:${this.active}`).attr('data-active', false)
      if (active) this.n(`rail:${active}`).attr('data-active', true)
      this.active = active
    }
  }
}
