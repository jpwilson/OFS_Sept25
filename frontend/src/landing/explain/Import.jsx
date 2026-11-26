// 5. Import (lp-import): Smart Import sorts a pile of photos into albums (pinned, azure).
// The canvas follows the rules in backend/app/utils/photo_clustering.py; each rule card
// prints the lines it rests on. Poster-first: flow mode shows the five states as a stack.
import { useEffect, useRef } from 'react'
import { IMPORT as I } from '../content/explain.js'
import { IMPORT_ALBUMS, IMPORT_PICKED, IMPORT_SEGMENTS, IMPORT_UNDATED } from '../content/explain.sample.js'
import { ArtImg, Button, Cutout, Head, Label, Section, Shot, Stage, cx } from '../ui/index.js'
import { clamp, smoothstep, win } from '../lib/math.js'
import { scrollToY } from '../lib/scroll.js'
import { ImportScene, STATES } from './importScene.js'
import { two, usePinnedMode } from './shared.js'
import s from './Import.module.css'

const DATA = {
  segments: IMPORT_SEGMENTS,
  undated: IMPORT_UNDATED,
  albums: IMPORT_ALBUMS,
  text: { unsorted: I.unsorted, trip: I.trip, weekend: I.weekend, away: I.away, home: I.home, picker: I.picker },
}
/** The progress at which state i is fully arrived (for the picker: every photo ticked). */
const HOLD = (i) => (i + 0.6) / STATES
const fill = (t, n) => t.replace('{n}', String(n))

/** A canvas that sizes itself to its box. fixed: draw one state and stop. */
function useScene(boxRef, canvasRef, fixed) {
  const scene = useRef(null)
  useEffect(() => {
    const box = boxRef.current
    const canvas = canvasRef.current
    if (!box || !canvas) return
    const sc = new ImportScene(canvas, DATA)
    scene.current = sc
    if (fixed != null) sc.set(HOLD(fixed))
    const fit = () => {
      const r = box.getBoundingClientRect()
      sc.resize(Math.max(1, r.width), Math.max(1, r.height))
      sc.draw()
    }
    fit()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null
    if (ro) ro.observe(box)
    // images arrive after the first draw; repaint while any are still loading
    let raf = 0
    let tries = 0
    const poll = () => {
      sc.draw()
      if (++tries < 240) raf = requestAnimationFrame(poll)
    }
    if (fixed != null) raf = requestAnimationFrame(poll)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ((sc.dirty = true), sc.draw()))
    return () => {
      if (ro) ro.disconnect()
      cancelAnimationFrame(raf)
      scene.current = null
    }
  }, [boxRef, canvasRef, fixed])
  return scene
}

function RuleCard({ st, i }) {
  return (
    <div className={s.card}>
      <div className={s.cardTop}>
        <span className="l-mono">
          {two(i + 1)} / {two(STATES)}
        </span>
        <h3 className={s.cardName}>{st.name}</h3>
      </div>
      <p className={s.say}>{st.say}</p>
      <ul className={s.rules}>
        {st.rules.map((r) => (
          <li key={r.text}>
            <p>{r.text}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Legend() {
  return (
    <div className={s.legend} aria-hidden="true">
      <span className={s.lgBreak}>
        <i data-k="long" />
        {I.breakLong}
      </span>
      <span className={s.lgBreak}>
        <i data-k="moved" />
        {I.breakMoved}
      </span>
      <span className={s.lgZone}>
        <i data-k="home" />
        {I.home}
      </span>
      <span className={s.lgZone}>
        <i data-k="away" />
        {I.away}
      </span>
    </div>
  )
}

function CanvasBox({ fixed, sceneRef, onShuffle, children, className }) {
  const box = useRef(null)
  const canvas = useRef(null)
  const scene = useScene(box, canvas, fixed)
  if (sceneRef) sceneRef.current = scene
  return (
    <div className={cx(s.canvasBox, className)}>
      <div ref={box} className={s.canvasWrap}>
        <canvas ref={canvas} className={s.canvas} aria-hidden="true" />
      </div>
      <span className={s.stageLabel}>{I.stageLabel}</span>
      {onShuffle ? (
        <Button size="md" variant="ghost" className={s.shuffle} onClick={() => onShuffle(scene.current)}>
          {I.shuffle}
        </Button>
      ) : null}
      {children}
    </div>
  )
}

/**
 * The pick state as plain HTML, for the prerender, no script and reduced motion: the
 * illustrated phone with its grid, every photo of the sample roll ticked, the count at its
 * final value. The canvas draws the same picker in motion.
 */
const PICKER_CELLS = 24
const PICKER_PHOTOS = IMPORT_SEGMENTS.flatMap((g) => g.photos)
function Picker() {
  const cells = []
  for (let c = 0, j = 0; c < PICKER_CELLS; c++) {
    const decoy = c % 5 === 2
    cells.push({ c, decoy, id: PICKER_PHOTOS[decoy ? (c * 7) % PICKER_PHOTOS.length : j++ % PICKER_PHOTOS.length] })
  }
  return (
    <div className={cx(s.canvasBox, s.pickerBox)}>
      <div className={s.phone} role="img" aria-label={`${I.picker.title}: ${fill(I.picker.selected, IMPORT_PICKED)}`}>
        <p className={s.phoneTitle} aria-hidden="true">
          {I.picker.title}
        </p>
        <ul className={s.phoneGrid} aria-hidden="true">
          {cells.map((k) => (
            <li key={k.c} data-on={k.decoy ? undefined : ''}>
              <ArtImg id={k.id} alt="" sizes="80px" />
              <i />
            </li>
          ))}
        </ul>
        <p className={s.phoneFoot} aria-hidden="true">
          <b>{fill(I.picker.selected, IMPORT_PICKED)}</b>
          <span>{fill(I.picker.button, IMPORT_PICKED)}</span>
        </p>
      </div>
      <span className={s.stageLabel}>{I.stageLabel}</span>
    </div>
  )
}

function Pinned() {
  const stage = useRef(null)
  const root = useRef(null)
  const cards = useRef(null)
  const sceneHolder = useRef(null)
  const last = useRef(-1)

  const onProgress = (p) => {
    const sc = sceneHolder.current && sceneHolder.current.current
    if (sc) {
      sc.set(p)
      sc.draw()
    }
    const f = clamp(p) * STATES
    const cur = Math.min(STATES - 1, Math.floor(f))
    if (cur !== last.current && root.current) {
      last.current = cur
      root.current.setAttribute('data-state', String(cur))
      root.current.querySelectorAll('[data-chip]').forEach((c, k) => {
        c.dataset.on = k < cur ? 'past' : k === cur ? 'cur' : ''
        if (k === cur) c.setAttribute('aria-current', 'step')
        else c.removeAttribute('aria-current')
      })
    }
    const list = cards.current ? cards.current.children : []
    for (let i = 0; i < list.length; i++) {
      const a = i / STATES
      const b = (i + 1) / STATES
      const vin = i === 0 ? 1 : smoothstep(win(p, a - 0.012, a + 0.012))
      const vout = i === STATES - 1 ? 1 : 1 - smoothstep(win(p, b - 0.012, b + 0.012))
      const v = clamp(Math.min(vin, vout))
      const k = list[i]
      k.style.opacity = String(v)
      k.style.visibility = v < 0.01 ? 'hidden' : 'visible'
      k.style.transform = `translate3d(${(1 - v) * 28}px, 0, 0) rotate(${(1 - v) * 2}deg)`
    }
  }

  const jump = (i) => {
    const el = stage.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    scrollToY(top + (el.offsetHeight - window.innerHeight) * HOLD(i))
  }
  const shuffle = (sc) => {
    if (!sc) return
    sc.shuffle()
    sc.draw()
    if (last.current !== 1) jump(1)
  }

  return (
    <Stage id="lp-import" svh={430} wash="azure" pinned onProgress={onProgress} stageRef={stage} className={s.stage} pinClassName={s.pin} data-mode="pinned" aria-labelledby="lp-import-h">
      <div ref={root} className={cx('l-wrap', s.in)} data-state="0">
        <div className={s.top}>
          <Label dot strong>
            {I.label}
          </Label>
          <Head id="lp-import-h" className={s.head} {...I.head} />
        </div>
        <CanvasBox sceneRef={sceneHolder} onShuffle={shuffle} className={s.pinCanvas}>
          <Legend />
        </CanvasBox>
        <div className={s.side}>
          <ol className={s.chips}>
            {I.states.map((st, i) => (
              <li key={st.key}>
                <button type="button" data-chip="" data-on={i === 0 ? 'cur' : ''} onClick={() => jump(i)}>
                  <i aria-hidden="true">{i + 1}</i>
                  <span>{st.name}</span>
                </button>
              </li>
            ))}
          </ol>
          <div ref={cards} className={s.cards}>
            {I.states.map((st, i) => (
              <RuleCard key={st.key} st={st} i={i} />
            ))}
          </div>
        </div>
      </div>
    </Stage>
  )
}

function Flow() {
  return (
    <Section id="lp-import" wash="azure" className={s.flow} aria-labelledby="lp-import-h">
      <div className={s.top}>
        <Label dot strong>
          {I.label}
        </Label>
        <Head id="lp-import-h" className={s.head} {...I.head} />
      </div>
      <ol className={s.frames}>
        {I.states.map((st, i) => (
          <li key={st.key} className={s.frame} data-state={i}>
            {i === 0 ? (
              <Picker />
            ) : (
              <CanvasBox fixed={i} className={s.frameCanvas} onShuffle={i === 1 ? (sc) => sc && (sc.shuffle(), sc.draw()) : null}>
                {i === 3 || i === 4 ? <Legend /> : null}
              </CanvasBox>
            )}
            <RuleCard st={st} i={i} />
          </li>
        ))}
      </ol>
    </Section>
  )
}

function Captures() {
  const c = I.captures
  return (
    <Section wash="azure" pad="sm" className={s.caps}>
      <div className={s.capsTop}>
        <Label dot strong>
          {c.label}
        </Label>
        <p className="l-lede">{I.lede}</p>
        <p className={cx('l-small', s.sampleNote)}>{I.sampleNote}</p>
      </div>
      <div className={s.capsRow}>
        <Shot id={c.drop.id} alt={c.drop.alt} caption={c.drop.caption} className={s.cap1} sizes="(max-width: 760px) 92vw, 480px" />
        <div className={s.cap2Wrap}>
          <Shot id={c.albums.id} alt={c.albums.alt} caption={c.albums.caption} className={s.cap2} sizes="(max-width: 760px) 92vw, 820px" />
          <Cutout id="g-kids-biscuit" alt={I.kidsAlt} className={s.kids} shadow sizes="(max-width: 760px) 50vw, 320px" />
        </div>
      </div>
    </Section>
  )
}

export function Import() {
  const mode = usePinnedMode()
  return (
    <>
      {mode === 'pinned' ? <Pinned /> : <Flow />}
      <Captures />
    </>
  )
}
