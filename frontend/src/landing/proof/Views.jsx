// 8. Views (lp-views): four views of the same year, then browsing by category. (owner: proof)
// Wide screens with motion: a pinned sideways reel driven by scroll (and by drag).
// Otherwise: the same reel as a native sideways scroller with snap points.
import { useMemo, useRef, useState } from 'react'
import { VIEWS } from '../content/proof.js'
import { SAMPLE_CARDS } from '../content/proof.sample.js'
import { Head, Label, Device, Shot, Stage, Cutout, GhostWord, Reveal, SHOT_CAPTION } from '../ui/index.js'
import { clamp, remap } from '../lib/math.js'
import { scrollToY } from '../lib/scroll.js'
import { cx } from '../ui/cx.js'
import { usePinMode, pad2 } from './shared.jsx'
import s from './Views.module.css'

const V = VIEWS
const OWN = '__own'

function Reel({ pinned, trackRef, stageRef }) {
  const drag = useRef(null)
  const onDown = (e) => {
    if (!pinned || e.button !== 0) return
    const st = stageRef.current
    const tr = trackRef.current
    if (!st || !tr) return
    const travel = Math.max(1, tr.scrollWidth - tr.parentElement.clientWidth)
    const scrollLen = Math.max(1, st.offsetHeight - window.innerHeight)
    drag.current = { x: e.clientX, y: window.scrollY, k: scrollLen / travel, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 4) d.moved = true
    scrollToY(Math.max(0, d.y - dx * d.k), { immediate: true })
  }
  const onUp = (e) => {
    drag.current = null
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }
  return (
    <div className={s.reelWin} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} data-drag={pinned || undefined}>
      <ol className={s.track} ref={trackRef}>
        {V.reel.map((r, i) => (
          <li key={r.id} className={s.card} data-f="view" data-i={i}>
            <Device id={r.shot} alt={`The ${r.name} view on a phone, showing the sample family's stories`} caption={false} className={s.device} />
            <div className={s.cardText}>
              <span className={s.cardNum}>
                {pad2(i + 1)} / {pad2(V.reel.length)}
              </span>
              <h3 className={s.cardName}>{r.name}</h3>
              <p className={s.cardBody}>{r.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className={s.reelFoot}>
        <span className={s.cap}>{SHOT_CAPTION}</span>
        <span className={s.hint}>
          {V.dragHint}
        </span>
      </div>
    </div>
  )
}

function Browse() {
  const [sel, setSel] = useState([])
  const toggle = (c) => setSel((v) => (v.includes(c) ? v.filter((x) => x !== c) : [...v, c]))
  // The feed's rule: show a story when any of its categories is selected (Feed.jsx:107-113).
  const shown = useMemo(() => (sel.length ? SAMPLE_CARDS.filter((c) => c.categories.some((k) => sel.includes(k))) : SAMPLE_CARDS), [sel])
  const sig = sel.join('|')
  const chips = [...V.categories.map((c) => ({ id: c, label: c })), { id: OWN, label: V.ownChip }]
  return (
    <>
    <div className={cx('l-wrap', s.browse)}>
      <div className={s.browseHead}>
        <h3 className={s.browseTitle}>{V.browseHead}</h3>
        <p className={s.browseLede}>{V.browseLede}</p>
      </div>
      <div className={s.chips} role="group" aria-label={V.browseHead}>
        <button type="button" className={s.chip} aria-pressed={sel.length === 0} onClick={() => setSel([])}>
          {V.all}
        </button>
        {chips.map((c) => (
          <button key={c.id} type="button" className={cx(s.chip, c.id === OWN && s.own)} aria-pressed={sel.includes(c.id)} onClick={() => toggle(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <p className={s.count} aria-live="polite">
        {V.showing} {shown.length} {V.of} {SAMPLE_CARDS.length} {V.stories}
      </p>
      <div className={s.shelf}>
      <Cutout id="p-leo-school" className={s.kidL} shadow sizes="120px" />
      <ul className={s.cards}>
        {SAMPLE_CARDS.map((c) => {
          const on = shown.includes(c)
          return (
            <li key={c.id} className={s.feedCard} data-on={on || undefined} hidden={!on} style={{ '--k': shown.indexOf(c) }} data-sig={sig}>
              <div className={s.feedInner} key={sig}>
                <Shot id={c.shot} alt={`Feed card: ${c.title}`} caption={false} sizes="(max-width: 760px) 80vw, 240px" />
                <span className={s.feedMeta}>
                  <span className={s.feedCat}>{c.categories.join(' · ')}</span>
                  <span className={s.feedTitle}>{c.title}</span>
                </span>
              </div>
            </li>
          )
        })}
        {shown.length === 0 ? <li className={s.empty}>{V.emptyOwn}</li> : null}
        <li className={s.kidsSlot} aria-hidden="true">
          <Cutout id="p-leo-school" className={s.kidM} shadow sizes="90px" />
          <Cutout id="p-ivy-trophy" className={s.kidM} shadow sizes="90px" />
        </li>
      </ul>
      <Cutout id="p-ivy-trophy" className={s.kidR} shadow sizes="120px" />
      </div>
    </div>
    <div className={s.floorBand}>
      <div className={cx('l-wrap', s.floorInner)}>
        <p className={s.cap}>{SHOT_CAPTION}</p>
        <div className={s.filters}>
          <Label>{V.filtersLabel}</Label>
          <ul className={s.filterRow}>
            {V.filters.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
    </>
  )
}

export function Views() {
  const mode = usePinMode(900)
  const pinned = mode === 'pin'
  const trackRef = useRef(null)
  const stageRef = useRef(null)
  const lastI = useRef(-1)
  const modeRef = useRef(mode)
  modeRef.current = mode

  const onProgress = (p, pin) => {
    const tr = trackRef.current
    if (!tr) return
    if (modeRef.current !== 'pin') {
      tr.style.transform = ''
      return
    }
    const travel = Math.max(0, tr.scrollWidth - tr.parentElement.clientWidth)
    const pp = clamp(remap(p, 0.06, 0.94, 0, 1))
    tr.style.transform = `translate3d(${(-pp * travel).toFixed(1)}px, 0, 0)`
    pin.style.setProperty('--p', pp.toFixed(4))
    const i = Math.round(pp * (V.reel.length - 1))
    if (i === lastI.current) return
    lastI.current = i
    tr.querySelectorAll('[data-f="view"]').forEach((el) => el.toggleAttribute('data-on', Number(el.getAttribute('data-i')) === i))
  }

  return (
    <section id={V.id} data-wash="lime" className={s.section} data-mode={mode}>
      <Stage svh={300} pinned={pinned} onProgress={onProgress} className={s.stage} pinClassName={s.pin} stageRef={stageRef} aria-label={V.head.before + ' ' + V.head.mark}>
        <GhostWord className={s.ghost}>{V.head.mark}</GhostWord>
        <div className={cx('l-wrap', s.top)}>
          <div className={s.header}>
            <Label dot>{V.eyebrow}</Label>
            <Head before={V.head.before} mark={V.head.mark} after={V.head.after} className={s.head} />
            <p className={s.lede}>{V.lede}</p>
          </div>
          <div className={s.progress} aria-hidden="true">
            <span className={s.bar} />
          </div>
        </div>
        <Reel pinned={pinned} trackRef={trackRef} stageRef={stageRef} />
      </Stage>
      <Reveal>
        <Browse />
      </Reveal>
    </section>
  )
}
