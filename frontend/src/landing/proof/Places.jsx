// 7. Places (lp-places): the journey map of one trip, and every story on one map. (owner: proof)
import { useEffect, useRef, useState } from 'react'
import { PLACES } from '../content/proof.js'
import { COAST_STOPS } from '../content/proof.sample.js'
import { Head, Label, Print, Cutout, GhostWord, Icon, Reveal } from '../ui/index.js'
import { CropShot } from './CropShot.jsx'
import { prefersReducedMotion } from '../lib/scroll.js'
import { cx } from '../ui/cx.js'
import { PIcon } from './shared.jsx'
import s from './Places.module.css'

const P = PLACES

// The drawing. Maine's six stops are real coordinates (content/proof.sample.js). The first two are
// far apart; the last four sit close together on Mount Desert Island, so the main map marks them
// with a box and an inset draws them larger. Equirectangular, scaled for latitude.
const VB = { w: 600, h: 400 }
const K = Math.cos((44 * Math.PI) / 180)
const INSET_FROM = 2 // stops 3 to 6 are drawn in the inset

function project(pts, box, pad) {
  const xs = pts.map((p) => p.lng * K)
  const ys = pts.map((p) => p.lat)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const sc = Math.min((box.w - 2 * pad.x) / (maxX - minX || 1), (box.h - 2 * pad.y) / (maxY - minY || 1))
  const ox = box.x + (box.w - (maxX - minX) * sc) / 2 + (pad.dx || 0)
  const oy = box.y + (box.h - (maxY - minY) * sc) / 2
  return pts.map((p) => ({ ...p, x: ox + (p.lng * K - minX) * sc, y: oy + (maxY - p.lat) * sc }))
}

// Catmull-Rom through the points, as cubic Beziers.
function smooth(pts) {
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    d += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)},${(p1.y + (p2.y - p0.y) / 6).toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)},${(p2.y - (p3.y - p1.y) / 6).toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}

const MAIN = project(COAST_STOPS, { x: 0, y: 0, w: VB.w, h: VB.h }, { x: 60, y: 70 })
const CLUSTER = MAIN.slice(INSET_FROM)
const CBOX = (() => {
  const xs = CLUSTER.map((p) => p.x)
  const ys = CLUSTER.map((p) => p.y)
  return { x: Math.min(...xs) - 16, y: Math.min(...ys) - 16, w: Math.max(...xs) - Math.min(...xs) + 32, h: Math.max(...ys) - Math.min(...ys) + 32 }
})()
const IBOX = { x: 290, y: 184, w: 296, h: 206 }
const INSET = project(COAST_STOPS.slice(INSET_FROM), { ...IBOX, y: IBOX.y + 22, h: IBOX.h - 22 }, { x: 44, y: 30, dx: -70 })
const MAIN_D = smooth(MAIN.slice(0, INSET_FROM + 1))
const INSET_D = smooth(INSET)
// Where each name sits beside its pin: [dx, dy, anchor].
const LABEL = [
  [24, 6, 'start'],
  [0, -44, 'middle'],
  [24, -2, 'start'],
  [24, -2, 'start'],
  [24, -2, 'start'],
  [24, -2, 'start'],
]

function Pin({ p, i, active, setActive, label }) {
  return (
    <g className={s.pin} data-on={i === active || undefined} style={{ '--i': i, transformOrigin: `${p.x}px ${p.y}px` }} onMouseEnter={() => setActive(i)}>
      <ellipse cx={p.x} cy={p.y + 3} rx="13" ry="4" fill="rgba(16,27,59,.25)" />
      <g className={s.pinBody} style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
        <circle cx={p.x} cy={p.y - 16} r="16" fill="var(--pin-fill)" stroke="var(--l-ink)" strokeWidth="3" />
        <path d={`M${p.x - 7},${p.y - 4} L${p.x},${p.y + 2} L${p.x + 7},${p.y - 4}`} fill="var(--pin-fill)" stroke="var(--l-ink)" strokeWidth="3" strokeLinejoin="round" />
        <text x={p.x} y={p.y - 11} textAnchor="middle" className={s.pinNum}>
          {i + 1}
        </text>
      </g>
      {label ? (
        <text x={p.x + LABEL[i][0]} y={p.y + LABEL[i][1]} textAnchor={LABEL[i][2]} className={cx(s.pinLabel, i >= INSET_FROM && s.pinLabelInset)}>
          {p.name}
        </text>
      ) : null}
    </g>
  )
}

function RouteMap({ active, setActive }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return undefined
    el.setAttribute('data-armed', '')
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          el.setAttribute('data-drawn', '')
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -20% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div className={s.route} ref={ref}>
      <div className={s.routeHead}>
        <Label strong>{P.routeLabel}</Label>
        <span className={s.north} aria-hidden="true">
          N
        </span>
      </div>
      <div className={s.mapBox}>
        <svg className={s.svg} viewBox={`0 0 ${VB.w} ${VB.h}`} role="img" aria-label={`${P.routeLabel}: ${COAST_STOPS.map((x) => x.name).join(', ')}`}>
          <defs>
            <pattern id="lp-places-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="rgba(16,27,59,.08)" strokeWidth="1" />
            </pattern>
            <mask id="lp-places-draw">
              <path className={s.drawMask} d={MAIN_D} pathLength="1" fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="round" />
            </mask>
            <mask id="lp-places-draw-inset">
              <path className={cx(s.drawMask, s.drawLate)} d={INSET_D} pathLength="1" fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="round" />
            </mask>
          </defs>
          <rect width={VB.w} height={VB.h} fill="url(#lp-places-grid)" />
          <path d={MAIN_D} fill="none" stroke="var(--l-white)" strokeWidth="9" strokeLinecap="round" mask="url(#lp-places-draw)" />
          <path d={MAIN_D} fill="none" stroke="var(--l-ink)" strokeWidth="3.5" strokeDasharray="10 9" strokeLinecap="round" mask="url(#lp-places-draw)" />
          {/* the island cluster, marked on the main map and drawn larger in the inset */}
          <rect className={s.cbox} x={CBOX.x} y={CBOX.y} width={CBOX.w} height={CBOX.h} rx="8" />
          {CLUSTER.map((p, k) => (
            <circle key={p.id} cx={p.x} cy={p.y} r="4" className={s.cdot} data-on={k + INSET_FROM === active || undefined} />
          ))}
          <path className={s.cleader} d={`M${CBOX.x + CBOX.w / 2},${CBOX.y + CBOX.h} L${IBOX.x + IBOX.w - 40},${IBOX.y}`} />
          <g className={s.inset}>
            <rect x={IBOX.x} y={IBOX.y} width={IBOX.w} height={IBOX.h} rx="14" className={s.ibox} />
            <text x={IBOX.x + 14} y={IBOX.y + 22} className={s.ilabel}>
              {P.insetLabel}
            </text>
            <path d={INSET_D} fill="none" stroke="var(--l-white)" strokeWidth="9" strokeLinecap="round" mask="url(#lp-places-draw-inset)" />
            <path d={INSET_D} fill="none" stroke="var(--l-ink)" strokeWidth="3.5" strokeDasharray="10 9" strokeLinecap="round" mask="url(#lp-places-draw-inset)" />
          </g>
          {/* start flag */}
          <g className={s.flag} transform={`translate(${MAIN[0].x + 16}, ${MAIN[0].y - 50})`}>
            <path d="M0 0V40" stroke="var(--l-ink)" strokeWidth="3" />
            <path d="M0 1h30l-7 8 7 8H0z" fill="var(--l-lime)" stroke="var(--l-ink)" strokeWidth="2.5" strokeLinejoin="round" />
          </g>
          {MAIN.slice(0, INSET_FROM).map((p, i) => (
            <Pin key={p.id} p={p} i={i} active={active} setActive={setActive} label />
          ))}
          {INSET.map((p, k) => (
            <Pin key={p.id} p={p} i={k + INSET_FROM} active={active} setActive={setActive} label />
          ))}
        </svg>
      </div>
      <p className={s.sample}>{P.routeSample}</p>
      <ol className={s.fan} aria-label={P.stopsLabel}>
        {COAST_STOPS.map((st, i) => (
          <li key={st.id} className={s.fanItem} style={{ '--i': i, '--tilt': `${[-4, 2.5, -2, 3.5, -3, 2][i]}deg` }}>
            <button
              type="button"
              className={s.stopCard}
              data-on={i === active || undefined}
              aria-pressed={i === active}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
            >
              <Print id={st.photo} alt={st.caption} tilt={0} className={s.stopPrint} sizes="(max-width: 760px) 30vw, 140px" />
              <span className={s.stopNum}>{i === 0 ? <PIcon name="flag" size={12} /> : null}{i + 1}</span>
              <span className={s.stopName}>{st.name}</span>
              <span className={s.stopWhen}>
                {st.day}
                <br />
                {st.time}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function Places() {
  const [active, setActive] = useState(0)
  const [mode, setMode] = useState('trip')
  return (
    <section id={P.id} data-wash="azure" className={s.section}>
      <GhostWord className={s.ghost}>{P.head.mark}</GhostWord>
      <div className={cx('l-wrap', s.inner)}>
        <div className={s.header}>
          <Label dot>{P.eyebrow}</Label>
          <Head before={P.head.before} mark={P.head.mark} after={P.head.after} className={s.head} />
          <p className="l-lede">{P.lede}</p>
        </div>

        <div className={s.grid}>
          <Reveal className={s.colRoute}>
            <RouteMap active={active} setActive={setActive} />
          </Reveal>

          <Reveal className={s.colReal} delay={120}>
            <fieldset className={s.switch}>
              <legend className={s.switchLegend}>{P.switchLabel}</legend>
              <div className={s.switchTrack} data-mode={mode}>
                {P.modes.map((m) => (
                  <label key={m.id} className={s.switchOpt}>
                    <input type="radio" name="lp-places-mode" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} className={s.switchInput} />
                    <span>{m.label}</span>
                  </label>
                ))}
                <span className={s.switchThumb} aria-hidden="true" />
              </div>
            </fieldset>
            <div className={s.shots}>
              {P.modes.map((m) => (
                <div key={m.id} className={s.shotLayer} data-on={mode === m.id || undefined} aria-hidden={mode !== m.id || undefined}>
                  <CropShot id={m.shot} alt={m.alt} caption={m.caption} />
                </div>
              ))}
            </div>
            <ul className={s.facts}>
              {P.facts.map((f, i) => (
                <Reveal as="li" key={f.label} className={s.fact} i={i}>
                  <span className={s.factLabel}>{f.label}</span>
                  {f.value ? <span className={s.factValue}>{f.value}</span> : null}
                  <span className={s.factText}>{f.text}</span>
                </Reveal>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>

      <div className={s.scene}>
        <div className={cx('l-wrap', s.sceneInner)}>
          <p className={s.byHand}>
            <Icon name="pin" size={20} />
            {P.byHand}
          </p>
          <div className={s.props} aria-hidden="true">
            <Cutout id="o-lighthouse" className={s.lighthouse} sizes="260px" />
            <Cutout id="o-campervan" className={s.van} shadow sizes="(max-width: 760px) 60vw, 440px" />
            <Cutout id="p-kate-pack" className={s.kate} shadow sizes="160px" />
          </div>
        </div>
      </div>
    </section>
  )
}
