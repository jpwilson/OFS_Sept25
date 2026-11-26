// The family tree, drawn in the landing's look (owner: proof). Also the reference design for the
// app's own tree: generations as rows, couples joined, children hanging from their parents' join,
// in-laws placed beside the person they married, one dashed "Add a relative".
//
// Geometry is in a 1000-wide box. Two layouts share every x: `wide` (tablet and desktop) and
// `tall` (phone: rows further apart, faces relatively larger, no relation labels). People are
// HTML over an SVG of the lines; both read the same numbers, so they always meet.
//
// It grows when it scrolls into view: the couple, then the parents above, then the children,
// then the rest. Server, no script and reduced motion: complete and static (nothing is hidden
// until script arms it).
import { useEffect, useRef } from 'react'
import { FAMILY, shortName } from '../content/proof.js'
import { Icon } from '../ui/index.js'
import { prefersReducedMotion } from '../lib/scroll.js'
import { cx } from '../ui/cx.js'
import s from './FamilyTree.module.css'
import aJoe from './avatars/joe.webp'
import aRuth from './avatars/ruth.webp'
import aMaya from './avatars/maya.webp'
import aTom from './avatars/tom.webp'
import aKate from './avatars/kate.webp'
import aJames from './avatars/james.webp'
import aIvy from './avatars/ivy.webp'
import aLeo from './avatars/leo.webp'
import aBiscuit from './avatars/biscuit.webp'
import aFinn from './avatars/finn.webp'

const T = FAMILY.tree
const AVATAR = { joe: aJoe, ruth: aRuth, maya: aMaya, tom: aTom, kate: aKate, marcus: aJames, ivy: aIvy, leo: aLeo, biscuit: aBiscuit, finn: aFinn }

// columns (shared) and rows (per layout)
const X = { joe: 125, ruth: 500, add: 875, maya: 125, tom: 375, kate: 625, marcus: 875, ivy: 95, leo: 250, biscuit: 405, finn: 750 }
const ROW = { joe: 0, ruth: 0, add: 0, maya: 1, tom: 1, kate: 1, marcus: 1, ivy: 2, leo: 2, biscuit: 2, finn: 2 }
const L = {
  wide: { h: 640, rows: [92, 322, 552], d: 104, kid: 0.88 },
  tall: { h: 1180, rows: [120, 590, 1060], d: 168, kid: 0.86 },
}
// growth: 0 the couple, 1 the parents above, 2 the children, 3 the rest
const STEP = { maya: 0, tom: 0, joe: 1, ruth: 1, ivy: 2, leo: 2, biscuit: 2, kate: 3, marcus: 3, finn: 3, add: 3 }
const P = (id, k) => ({ x: X[id], y: L[k].rows[ROW[id]] })

/** An orthogonal path through points, with rounded elbows of radius r. */
function elbow(pts, r = 22) {
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const a = Math.min(r, Math.hypot(x1 - x0, y1 - y0) / 2, Math.hypot(x2 - x1, y2 - y1) / 2)
    const ux = Math.sign(x1 - x0)
    const uy = Math.sign(y1 - y0)
    const vx = Math.sign(x2 - x1)
    const vy = Math.sign(y2 - y1)
    d += ` L${x1 - ux * a},${y1 - uy * a} Q${x1},${y1} ${x1 + vx * a},${y1 + vy * a}`
  }
  const e = pts[pts.length - 1]
  return `${d} L${e[0]},${e[1]}`
}

/** Every line of the tree for one layout: { id, d, tone, step, dashed, tick:[x,y] }. */
function lines(k) {
  const p = (id) => P(id, k)
  const r1 = L[k].rows[1]
  const r0 = L[k].rows[0]
  // bars sit below the midpoint, clear of the name and relation under each face
  const bar1 = r0 + (r1 - r0) * 0.56 // under the parents
  const bar2 = r1 + (L[k].rows[2] - r1) * 0.62 // under the couples
  const mt = (p('maya').x + p('tom').x) / 2
  const kj = (p('kate').x + p('marcus').x) / 2
  return [
    // the couples
    { id: 'mt', d: `M${p('maya').x},${r1} L${p('tom').x},${r1}`, tone: 'fizz', step: 0, tick: [mt, r1] },
    { id: 'kj', d: `M${p('kate').x},${r1} L${p('marcus').x},${r1}`, tone: 'violet', step: 3 },
    // Grandpa Joe, Maya's father
    { id: 'joe', d: `M${p('joe').x},${p('joe').y} L${p('maya').x},${r1}`, tone: 'azure', step: 1, tick: [p('joe').x, r0 + (r1 - r0) * 0.6] },
    // Nana Ruth, mother of Tom and of Kate
    { id: 'ruth-tom', d: elbow([[p('ruth').x, p('ruth').y], [p('ruth').x, bar1], [p('tom').x, bar1], [p('tom').x, r1]]), tone: 'zest', step: 1 },
    { id: 'ruth-kate', d: elbow([[p('ruth').x, bar1], [p('kate').x, bar1], [p('kate').x, r1]]), tone: 'zest', step: 3 },
    // Ivy, Leo and Biscuit hang from Maya and Tom's join
    ...['ivy', 'leo', 'biscuit'].map((id) => ({ id: `mt-${id}`, d: elbow([[mt, r1], [mt, bar2], [p(id).x, bar2], [p(id).x, p(id).y]]), tone: 'lime', step: 2, dashed: id === 'biscuit' })),
    // Finn hangs from Kate and James's join
    { id: 'kj-finn', d: elbow([[kj, r1], [kj, bar2], [p('finn').x, bar2], [p('finn').x, p('finn').y]]), tone: 'violet', step: 3 },
  ]
}

function Lines({ k }) {
  const ls = lines(k)
  return (
    <svg className={cx(s.svg, s[k])} viewBox={`0 0 1000 ${L[k].h}`} preserveAspectRatio="none" aria-hidden="true">
      {ls.map((l) => (
        <path key={`u-${l.id}`} d={l.d} className={s.under} data-tone={l.tone} style={{ '--step': l.step }} pathLength="1" />
      ))}
      {ls.map((l) => (
        <path key={`i-${l.id}`} d={l.d} className={cx(s.ink, l.dashed && s.dashed)} style={{ '--step': l.step }} pathLength={l.dashed ? undefined : 1} />
      ))}
    </svg>
  )
}

function Person({ p }) {
  const id = p.id
  const name = p.name || shortName(id)
  const kid = ROW[id] === 2
  return (
    <li
      className={cx(s.node, p.you && s.you, p.tag && s.tag, kid && s.kid)}
      style={{ '--x': X[id] / 10, '--yw': (P(id, 'wide').y / L.wide.h) * 100, '--yt': (P(id, 'tall').y / L.tall.h) * 100, '--step': STEP[id] }}
    >
      <span className={s.photo}>
        <img src={AVATAR[id]} alt="" width="256" height="256" loading="lazy" decoding="async" />
      </span>
      {p.you ? <span className={s.youTag}>{T.you}</span> : null}
      {p.tag ? <span className={s.tagTag}>{T.tagLabel}</span> : null}
      <span className={s.label}>
        <span className={s.name}>{name}</span>
        {p.you ? null : <span className={s.rel}>{p.rel}</span>}
      </span>
    </li>
  )
}

/** The ticks on confirmed relationships, placed like the people. */
function Ticks() {
  const ticks = lines('wide').filter((l) => l.tick)
  const tall = Object.fromEntries(lines('tall').filter((l) => l.tick).map((l) => [l.id, l.tick]))
  return ticks.map((l) => (
    <li
      key={l.id}
      className={s.tick}
      style={{ '--x': l.tick[0] / 10, '--yw': (l.tick[1] / L.wide.h) * 100, '--yt': (tall[l.id][1] / L.tall.h) * 100, '--step': l.step + 0.6 }}
      aria-hidden="true"
    >
      <Icon name="check" size={14} />
    </li>
  ))
}

export function FamilyTree({ className }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return undefined
    // arm only when it is still below the fold, so a reload mid-page never hides it
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return undefined
    el.setAttribute('data-armed', '')
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          el.setAttribute('data-grown', '')
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -18% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const label = `${T.label}: ${T.people.map((p) => `${p.name || shortName(p.id)}, ${p.rel}`).join('; ')}.`
  return (
    <figure className={cx(s.frame, className)} ref={ref} role="img" aria-label={label}>
      <div className={s.tree}>
        <Lines k="wide" />
        <Lines k="tall" />
        <ul className={s.people}>
          {T.people.map((p) => (
            <Person key={p.id} p={p} />
          ))}
          <li className={cx(s.node, s.add)} style={{ '--x': X.add / 10, '--yw': (P('add', 'wide').y / L.wide.h) * 100, '--yt': (P('add', 'tall').y / L.tall.h) * 100, '--step': STEP.add }}>
            <span className={s.photo}>
              <Icon name="plus" size={28} />
            </span>
            <span className={s.label}>
              <span className={s.name}>{T.add}</span>
            </span>
          </li>
          <Ticks />
        </ul>
      </div>
    </figure>
  )
}

/** One person in the tree's style, on its own (the tag card below the tree). */
export function TreePerson({ id, name, rel, tag }) {
  return (
    <div className={cx(s.solo, tag && s.tag)}>
      <span className={s.photo}>
        <img src={AVATAR[id]} alt="" width="256" height="256" loading="lazy" decoding="async" />
      </span>
      {tag ? <span className={s.tagTag}>{tag}</span> : null}
      <span className={s.label}>
        <span className={s.name}>{name}</span>
        <span className={s.rel}>{rel}</span>
      </span>
    </div>
  )
}

export const TREE_LAYOUT = L
