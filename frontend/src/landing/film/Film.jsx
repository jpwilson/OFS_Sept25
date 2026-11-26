// The film (owner: film): the hero and the pinned, scroll-driven opening sequence.
//
// Poster-first. The server and the first client render draw a column of finished posters,
// one <section> per scene (mode 'poster'). Once mounted, if motion is allowed, the film
// switches to 'pinned': the wrapper becomes STAGE_SVH tall with one sticky viewport, the
// scenes stack inside it, and engine.js plays the arrivals around each poster. Reduced
// motion, no script, a very short screen or an engine error all leave the posters standing.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FILM_IDS, HUD, SR } from '../content/film.js'
import { SAMPLE_YEAR } from '../content/film.sample.js'
import { onFrame, prefersReducedMotion, refreshScroll, scrollToId, stageProgress } from '../lib/scroll.js'
import { Icon } from '../ui/index.js'
import { FilmEngine } from './engine.js'
import { App, End, Ours } from './scenes/Finale.jsx'
import { Hero } from './scenes/Hero.jsx'
import { MapScene, World } from './scenes/Map.jsx'
import { Read } from './scenes/Read.jsx'
import { Tell } from './scenes/Tell.jsx'
import { Year } from './scenes/Year.jsx'
import s from './stage.module.css'
import { ANCHOR, ORDER, STAGE_SVH } from './timeline.js'

const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect
const MIN_H = 560
const RAIL_WASH = { tell: 'fizz', read: 'zest', map: 'azure', year: 'lime', app: 'paper' }

function canPin() {
  if (prefersReducedMotion()) return false
  if (window.innerHeight < MIN_H) return false
  if (import.meta.env.DEV && /[?&]film=poster\b/.test(window.location.search)) return false
  return true
}

function Hud({ onJump }) {
  return (
    <div className={s.hud}>
      <div className={s.counter} data-f="hud:counter" aria-hidden="true">
        <span className={s.counterRow}>
          <b data-f="hud:month">{HUD.months[0]}</b>
          <span>{SAMPLE_YEAR}</span>
        </span>
        <span className={s.ticks}>
          {HUD.months.map((m, i) => (
            <i key={m} data-f={`hud:tick${i}`} data-on={i === 0 ? '' : undefined} />
          ))}
        </span>
      </div>
      <div className={s.railSlot}>
        <nav className={s.rail} data-f="hud:rail" aria-label={HUD.railLabel}>
          {HUD.rail.map((r, i) => (
            <a key={r.key} className={s.chip} href={r.href} data-f={`rail:${r.key}`} onClick={(e) => onJump(e, r.key)}>
              <span className={s.chipDot} data-wash={RAIL_WASH[r.key]}>
                {r.key === 'app' ? <Icon name="play" size={14} /> : <b>{String(i + 1).padStart(2, '0')}</b>}
              </span>
              <span>{r.label}</span>
            </a>
          ))}
        </nav>
      </div>
    </div>
  )
}

export function Film() {
  const [mode, setMode] = useState('poster')
  const section = useRef(null)
  const pin = useRef(null)
  const engine = useRef(null)
  const failed = useRef(false)
  const before = useRef(null)

  // Decide the mode once mounted, and again when the motion preference or the screen changes.
  useIso(() => {
    const decide = () => {
      const next = !failed.current && canPin() ? 'pinned' : 'poster'
      const el = section.current
      // Remember how far into the poster column the visitor already is, to land on the same scene.
      if (next === 'pinned' && el && el.dataset.mode !== 'pinned') {
        const first = el.querySelector('[data-scene]')
        before.current = { into: -el.getBoundingClientRect().top, h: first ? first.offsetHeight : window.innerHeight }
      }
      setMode(next)
    }
    decide()
    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    if (mq && mq.addEventListener) mq.addEventListener('change', decide)
    window.addEventListener('resize', decide)
    return () => {
      if (mq && mq.removeEventListener) mq.removeEventListener('change', decide)
      window.removeEventListener('resize', decide)
    }
  }, [])

  useIso(() => {
    if (mode !== 'pinned' || !section.current || !pin.current) return undefined
    const fail = (err) => {
      console.error('[film] engine failed; showing the posters instead', err)
      failed.current = true
      setMode('poster')
    }
    let e
    try {
      e = new FilmEngine(section.current, pin.current, { months: HUD.months })
    } catch (err) {
      fail(err)
      return undefined
    }
    engine.current = e
    // The posters were a column; the film is one tall stage. Keep the visitor on the same scene.
    const was = before.current
    before.current = null
    const hash = window.location.hash.slice(1)
    refreshScroll() // the page just grew: let the scroller measure it before any jump
    if (hash && Object.values(FILM_IDS).includes(hash)) scrollToId(hash, { immediate: true })
    else if (was && was.h > 0 && was.into > was.h * 0.5) e.jump(ORDER[Math.min(ORDER.length - 1, Math.round(was.into / was.h))], true)
    const run = (frame) => {
      const el = section.current
      if (!el || failed.current) return
      const r = el.getBoundingClientRect()
      if (r.bottom < -frame.vh || r.top > frame.vh * 2) return
      try {
        e.frame(stageProgress(el), frame)
      } catch (err) {
        fail(err)
      }
    }
    // one frame now, before the browser paints the stacked scenes
    run({ scrollY: window.scrollY, vh: window.innerHeight, vw: window.innerWidth, time: performance.now() })
    const off = onFrame(run)
    refreshScroll()
    return () => {
      off()
      e.destroy()
      engine.current = null
      refreshScroll()
    }
  }, [mode])

  const pinned = mode === 'pinned'
  const ids = pinned ? {} : FILM_IDS
  const onJump = (ev, key) => {
    if (!engine.current) return
    ev.preventDefault()
    engine.current.jump(key)
  }

  return (
    <section
      ref={section}
      id="lp-film"
      className={s.film}
      data-mode={mode}
      aria-label={HUD.filmLabel}
      style={pinned ? { height: `calc(var(--sh) * ${STAGE_SVH / 100})` } : undefined}
    >
      {pinned
        ? Object.keys(ANCHOR).map((k) => <i key={k} id={FILM_IDS[k]} className={s.anchor} style={{ top: `calc(var(--sh) * ${ANCHOR[k] / 100})` }} aria-hidden="true" />)
        : null}
      <div ref={pin} className={s.pin}>
        <Hero />
        <Tell id={ids.tell} />
        <Read id={ids.read} />
        <MapScene id={ids.map} />
        <World />
        <Year id={ids.year} />
        <Ours id={ids.finale} />
        <App id={ids.app} />
        <End />
        <div className={s.rim} data-f="rim" aria-hidden="true" />
        {/* Off-stage scenes are hidden while the film is pinned, so their words are listed once here. */}
        {pinned ? (
          <div className="l-sr">
            <p>{SR.intro}</p>
            <ol>
              {SR.chapters.map((c) => (
                <li key={c.head}>
                  {c.head} {c.body}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        <Hud onJump={onJump} />
      </div>
    </section>
  )
}

