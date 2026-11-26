// Journey map inside a story (owner: MAP). PLAN-DAYLIGHT 2.7 and 3. The frozen props:
//   <JourneyMap journey activeStopId onStopSelect mode="panel|sheet|strip" playing onPlayingChange />
// journey: buildJourney(event, parsed). onStopSelect(stopId) is the host's scrollToStop.
// playing / onPlayingChange are optional (uncontrolled when absent). Also optional:
// onRead(stopId) adds "Read from here" on the active stop.
//
//   strip   the phone's inline card: the SVG route sketch, static, no gestures, so the
//           page never traps a scroll. The host adds its own Play and Open map buttons.
//   panel   the desktop map beside the story. It fills its parent's height (give the
//           sticky aside one); 560px when the parent has none. MapLibre loads when the
//           panel comes within one viewport of the screen.
//   sheet   content for a full-screen sheet: the map, swipeable stop cards and the actions.
//           It fills its parent. <JourneySheet> is the ready-made full-screen host.
//
// Levels (PLAN 3.6): full and lite draw the live map (JourneyLive, a lazy chunk); static
// (no WebGL2, the chunk or the tiles did not arrive) draws the sketch and the list of
// stops. The sketch is also the first paint while the live map loads.
import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { currentLevel, preloadMapLibre } from './engine.js'
import { RouteSketch, dayColor } from './RouteSketch.jsx'
import { stopName } from './labels.js'
import { wallTime } from './when.js'
import { Button } from '../ui/Button.jsx'
import { IconButton } from '../ui/IconButton.jsx'
import { overlayRoot, useModal } from '../ui/overlay.js'
import { cx } from '../ui/cx.js'
import s from './JourneyMap.module.css'

const Live = lazy(() => import('./JourneyLive.jsx'))

const WHY = {
  webgl2: 'This browser cannot draw the live map, so here is the route as a sketch.',
  chunk: 'The live map did not download. Here is the route as a sketch.',
  tiles: 'The map tiles did not arrive. Here is the route as a sketch.',
  style: 'The map tiles did not arrive. Here is the route as a sketch.',
  init: 'The live map could not start. Here is the route as a sketch.',
}

class Boundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onFail?.('chunk')
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** The static level: the sketch, the days and the stops as a list. Everything still works. */
function StaticJourney({ journey, activeStopId, onStopSelect, onRead, mode, why, onRetry }) {
  // in the phone's sheet a stop is a way back into the story at that place
  const onPick = (mode === 'sheet' && onRead) || onStopSelect
  return (
    <div className={cx(s.static, s[`static-${mode}`])} data-ui="journey-map" data-mode={mode} data-map-state="idle" data-level="static">
      {why ? (
        <p className={s.why}>
          {WHY[why] || WHY.init}{' '}
          {why !== 'webgl2' && onRetry ? (
            <Button variant="quiet" size="sm" onClick={onRetry}>
              Try the map again
            </Button>
          ) : null}
        </p>
      ) : null}
      <div className={s.sketchFrame}>
        <RouteSketch journey={journey} activeStopId={activeStopId} onStopSelect={onPick} width={mode === 'sheet' ? 360 : 520} height={mode === 'sheet' ? 300 : 440} />
      </div>
      <ol className={s.stopList} aria-label="Stops">
        {journey.days.map((d) => (
          <li key={d.index} className={s.stopDay}>
            <p className={cx(s.stopDayLabel, 'a-mono')}>
              <span className={s.dayDot} style={{ '--day': dayColor(d.index) }} aria-hidden="true" /> {d.label}
            </p>
            <ol className={s.stopRows}>
              {d.stopIds
                .map((id) => journey.stops.find((x) => x.id === id))
                .filter((st) => st && st.kind === 'named')
                .map((st) => (
                  <li key={st.id}>
                    <button type="button" className={s.stopRow} aria-current={st.id === activeStopId ? 'step' : undefined} onClick={() => onPick?.(st.id)}>
                      <span className={cx(s.stopN, 'a-mono')} style={{ '--day': dayColor(st.dayIndex) }}>
                        {st.n}
                      </span>
                      <span className={s.stopRowName}>{stopName(st) || 'Unnamed stop'}</span>
                      {wallTime(st.ts) ? <span className={cx(s.stopRowTime, 'a-mono')}>{wallTime(st.ts)}</span> : null}
                    </button>
                  </li>
                ))}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function JourneyMap({ journey, activeStopId = null, onStopSelect, mode = 'panel', playing, onPlayingChange, onRead, className }) {
  const [level, setLevel] = useState(currentLevel)
  const [failed, setFailed] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [liveReady, setLiveReady] = useState(false)
  const [near, setNear] = useState(mode !== 'panel')
  const frame = useRef(null)

  // panel: fetch the map when it comes within one viewport of the screen
  useEffect(() => {
    if (near || !frame.current || typeof IntersectionObserver === 'undefined') return setNear(true)
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setNear(true), { rootMargin: '100% 0px' })
    io.observe(frame.current)
    return () => io.disconnect()
  }, [])
  // strip: warm the chunk on idle so "Open map" is instant (never on Save-Data or 2G/3G)
  useEffect(() => {
    if (mode !== 'strip' || !journey) return
    const t = setTimeout(preloadMapLibre, 2500)
    return () => clearTimeout(t)
  }, [mode, !!journey])

  if (!journey) return null
  if (mode === 'strip') {
    // a tall trip gets a taller card, so its stops do not pile up
    const [w, s0, e, n] = journey.bbox || [0, 0, 1, 1]
    const shape = (n - s0) / Math.max(1e-6, (e - w) * Math.cos((((n + s0) / 2) * Math.PI) / 180))
    const h = Math.round(Math.max(210, Math.min(330, 300 * shape)))
    return (
      <div className={cx(s.strip, className)} data-ui="journey-map" data-mode="strip" data-map-state="idle">
        <RouteSketch journey={journey} activeStopId={activeStopId} width={360} height={h} labels="named" />
      </div>
    )
  }
  if (level === 'static' || failed) {
    return <StaticJourney journey={journey} activeStopId={activeStopId} onStopSelect={onStopSelect} onRead={onRead} mode={mode} why={failed} onRetry={() => (setFailed(null), setLiveReady(false), setAttempt((n) => n + 1))} />
  }
  return (
    <div ref={frame} className={cx(s.jm, s[mode], className)} data-ui="journey-frame" data-mode={mode}>
      {!liveReady ? (
        <div className={s.poster} aria-hidden="true">
          <RouteSketch journey={journey} activeStopId={activeStopId} width={480} height={mode === 'sheet' ? 420 : 640} labels="none" />
        </div>
      ) : null}
      {near ? (
        <Boundary key={attempt} onFail={setFailed}>
          <Suspense fallback={null}>
            <Live
              journey={journey}
              activeStopId={activeStopId}
              onStopSelect={onStopSelect}
              mode={mode}
              playing={playing}
              onPlayingChange={onPlayingChange}
              onRead={onRead}
              level={level}
              onLevel={setLevel}
              onFail={setFailed}
              onReady={() => setLiveReady(true)}
            />
          </Suspense>
        </Boundary>
      ) : null}
    </div>
  )
}

/**
 * The phone's journey map: a true full-screen takeover with its own close button, focus
 * trap and Esc.
 *   <JourneySheet open onClose journey activeStopId onStopSelect playing onPlayingChange onRead title />
 * "Open map" opens it; "Play the journey" opens it with playing = true.
 */
export function JourneySheet({ open, onClose, journey, activeStopId, onStopSelect, playing, onPlayingChange, onRead, title }) {
  const ref = useRef(null)
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) setMounted(true)
    else {
      const t = setTimeout(() => setMounted(false), 260)
      return () => clearTimeout(t)
    }
  }, [open])
  useModal(open, ref, onClose)
  if (!mounted || !journey || typeof document === 'undefined') return null
  return createPortal(
    <div ref={ref} className={cx(s.full, open ? s.fullOpen : s.fullClosing)} role="dialog" aria-modal="true" aria-label={title ? `The journey: ${title}` : 'The journey'} tabIndex={-1} data-ui="journey-sheet" data-wash="azure">
      <header className={s.fullBar}>
        <IconButton icon="close" label="Close the map" variant="keyline" onClick={onClose} />
        <div className={s.fullTitle}>
          <p className="a-label">The journey</p>
          {title ? <h2>{title}</h2> : null}
        </div>
      </header>
      <div className={s.fullBody}>
        <JourneyMap journey={journey} activeStopId={activeStopId} onStopSelect={onStopSelect} mode="sheet" playing={playing} onPlayingChange={onPlayingChange} onRead={onRead} />
      </div>
    </div>,
    overlayRoot(),
  )
}
