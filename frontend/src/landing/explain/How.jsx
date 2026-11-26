// 3. How (lp-how): four steps on a path that draws itself (pinned, tide).
// Poster-first: the server and reduced-motion visitors get the four stations stacked;
// once mounted with motion allowed the stage pins and the path drives the stations.
import { useEffect, useRef } from 'react'
import { HOW } from '../content/explain.js'
import { ROUTES } from '../content/routes.js'
import { Button, Head, Label, Readout, Shot, Stage, cx } from '../ui/index.js'
import { clamp, easeOutBack, lerp, smoothstep, win } from '../lib/math.js'
import { scrollToY } from '../lib/scroll.js'
import { two, usePinnedMode } from './shared.js'
import s from './How.module.css'

const N = HOW.stations.length
// Horizontal path (desktop), viewBox 0 0 1000 120; vertical path (phone), viewBox 0 0 60 1000.
const PATH_H = 'M 10 84 C 90 84 130 30 230 34 S 360 98 470 72 S 600 18 700 40 S 860 104 990 50'
const PATH_V = 'M 30 10 C 30 120 8 170 12 260 S 52 420 46 520 S 10 660 16 760 S 32 920 30 990'
const NODES = [0.02, 0.35, 0.66, 0.98]
const REST = 0.62
// Phones: each capture is cropped to its most telling region (zoom, focus x, focus y).
const CROP = {
  'ui-groups': [2.2, '0%', '16%'],
  'ui-quickadd-modes': [1.2, '50%', '10%'],
  'ui-story-comments': [1.8, '0%', '42%'],
} // share of each step the rider rests at its station before moving on

/** Where along the path (0..1) the rider is at overall progress p. */
function riderAt(p) {
  const i = Math.min(N - 1, Math.floor(p * N))
  const t = p * N - i
  if (i === N - 1) return NODES[i]
  return lerp(NODES[i], NODES[i + 1], smoothstep(win(t, REST, 1)))
}

/** Step i's opacity at progress p (crossfade around the step boundaries). */
function shown(i, p) {
  const a = i / N
  const b = (i + 1) / N
  const vin = i === 0 ? 1 : smoothstep(win(p, a - 0.012, a + 0.012))
  const vout = i === N - 1 ? 1 : 1 - smoothstep(win(p, b - 0.012, b + 0.012))
  return clamp(Math.min(vin, vout))
}

function Track({ vertical, pathRef, lineRef, nodesRef, riderRef, onJump }) {
  const d = vertical ? PATH_V : PATH_H
  return (
    <div className={cx(s.track, vertical ? s.trackV : s.trackH)}>
      <svg viewBox={vertical ? '0 0 60 1000' : '0 0 1000 120'} preserveAspectRatio="none" aria-hidden="true">
        <path ref={pathRef} d={d} className={s.ghost} vectorEffect="non-scaling-stroke" />
        <path ref={lineRef} d={d} className={s.line} pathLength={1} vectorEffect="non-scaling-stroke" />
      </svg>
      <div ref={nodesRef} className={s.nodes}>
        {HOW.stations.map((st, i) => (
          <button key={st.short} type="button" className={s.node} onClick={() => onJump(i)} aria-label={`Step ${i + 1} of ${N}: ${st.short}`}>
            <i aria-hidden="true">{i + 1}</i>
            <span>{st.short}</span>
          </button>
        ))}
      </div>
      <span ref={riderRef} className={s.rider} aria-hidden="true" />
    </div>
  )
}

function Visual({ st, i }) {
  if (i === 0) {
    return (
      <div className={s.pass}>
        <Label strong>Free trial</Label>
        <div className={s.passRow}>
          {st.readouts.map((r) => (
            <Readout key={r.label} label={r.label} value={r.value} unit={r.unit} size="lg" className={s.passReadout} />
          ))}
        </div>
        <Button href={ROUTES.signup} size="lg" arrow trackAs="lp_how_start">
          {st.cta}
        </Button>
      </div>
    )
  }
  return (
    <div
      className={s.shotBox}
      style={CROP[st.shot] ? { '--z': CROP[st.shot][0], '--ox': CROP[st.shot][1], '--oy': CROP[st.shot][2] } : undefined}
    >
      <Shot id={st.shot} alt={st.shotAlt} className={s.shot} sizes="(max-width: 760px) 80vw, 560px" />
      {st.readouts ? (
        <div className={s.shotReadouts}>
          {st.readouts.map((r) => (
            <Readout key={r.label} label={r.label} value={r.value} size="md" />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function How() {
  const mode = usePinnedMode()
  const pinned = mode === 'pinned'
  const stage = useRef(null)
  const stations = useRef(null)
  const step = useRef(null)
  const parts = {
    h: { path: useRef(null), line: useRef(null), nodes: useRef(null), rider: useRef(null), len: 0, pts: [] },
    v: { path: useRef(null), line: useRef(null), nodes: useRef(null), rider: useRef(null), len: 0, pts: [] },
  }
  const geo = useRef(parts)
  geo.current = parts

  // Measure both paths and place the station buttons on them.
  useEffect(() => {
    if (!pinned) return
    for (const key of ['h', 'v']) {
      const g = geo.current[key]
      const el = g.path.current
      if (!el) continue
      const L = el.getTotalLength()
      const [vw, vh] = key === 'h' ? [1000, 120] : [60, 1000]
      g.len = L
      g.box = [vw, vh]
      const kids = g.nodes.current ? g.nodes.current.children : []
      NODES.forEach((f, i) => {
        const pt = el.getPointAtLength(f * L)
        const k = kids[i]
        if (k) {
          k.style.left = `${(pt.x / vw) * 100}%`
          k.style.top = `${(pt.y / vh) * 100}%`
        }
      })
    }
  }, [pinned])

  const onProgress = (p) => {
    const f = riderAt(p)
    const cur = Math.min(N - 1, Math.floor(p * N))
    for (const key of ['h', 'v']) {
      const g = geo.current[key]
      if (!g.len || !g.path.current) continue
      if (g.line.current) g.line.current.style.strokeDashoffset = String(1 - f)
      const pt = g.path.current.getPointAtLength(f * g.len)
      const [vw, vh] = g.box
      if (g.rider.current) {
        g.rider.current.style.left = `${(pt.x / vw) * 100}%`
        g.rider.current.style.top = `${(pt.y / vh) * 100}%`
      }
      const kids = g.nodes.current ? g.nodes.current.children : []
      for (let i = 0; i < kids.length; i++) {
        const k = kids[i]
        const on = f >= NODES[i] - 0.005 ? (i === cur ? 'cur' : 'past') : ''
        if (k.dataset.on !== on) {
          if (on) k.dataset.on = on
          else delete k.dataset.on
          if (on === 'cur') k.setAttribute('aria-current', 'step')
          else k.removeAttribute('aria-current')
        }
      }
    }
    if (step.current) step.current.textContent = two(cur + 1)

    const list = stations.current ? stations.current.children : []
    for (let i = 0; i < list.length; i++) {
      const v = shown(i, p)
      const k = list[i]
      k.style.opacity = String(v)
      k.style.visibility = v < 0.01 ? 'hidden' : 'visible'
      // the station pops open: text slides, the visual springs up from a tilt
      const local = clamp(p * N - i)
      const pop = easeOutBack(clamp(win(local, 0, 0.28) + (i === 0 ? 1 : 0)))
      const txt = k.firstElementChild
      const vis = k.lastElementChild
      if (txt) txt.style.transform = `translate3d(0, ${(1 - v) * 22}px, 0)`
      if (vis) vis.style.transform = `translate3d(0, ${(1 - pop) * 60}px, 0) rotate(${lerp(4, 0, pop)}deg) scale(${lerp(0.86, 1, pop)})`
    }
  }

  const jump = (i) => {
    const el = stage.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    const range = el.offsetHeight - window.innerHeight
    scrollToY(top + range * ((i + REST * 0.5) / N))
  }

  return (
    <Stage
      id="lp-how"
      svh={330}
      wash="tide"
      pinned={pinned}
      onProgress={pinned ? onProgress : undefined}
      stageRef={stage}
      className={s.stage}
      pinClassName={s.pin}
      data-mode={mode}
      aria-labelledby="lp-how-h"
    >
      <div className={cx('l-wrap', s.in)}>
        <div className={s.top}>
          <div className={s.titles}>
            <Label dot strong>
              {HOW.label}
            </Label>
            <Head id="lp-how-h" className={s.head} {...HOW.head} />
          </div>
          <div className={s.meter} aria-hidden={pinned ? undefined : true}>
            <span className="l-mono">{HOW.stepLabel}</span>
            <b>
              <span ref={step}>01</span>
              <em>/{two(N)}</em>
            </b>
          </div>
        </div>

        {pinned ? (
          <>
            <Track pathRef={parts.h.path} lineRef={parts.h.line} nodesRef={parts.h.nodes} riderRef={parts.h.rider} onJump={jump} />
            <Track vertical pathRef={parts.v.path} lineRef={parts.v.line} nodesRef={parts.v.nodes} riderRef={parts.v.rider} onJump={jump} />
          </>
        ) : null}

        <ol ref={stations} className={s.stations}>
          {HOW.stations.map((st, i) => (
            <li key={st.short} className={s.station}>
              <div className={s.text}>
                <span className={s.n} aria-hidden="true">
                  {two(i + 1)}
                </span>
                <h3 className={s.title}>{st.title}</h3>
                {st.lines.map((t) => (
                  <p key={t}>{t}</p>
                ))}
              </div>
              <div className={s.vis}>
                <Visual st={st} i={i} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Stage>
  )
}
