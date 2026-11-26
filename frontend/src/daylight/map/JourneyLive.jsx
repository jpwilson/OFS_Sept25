// The live journey map (owner: MAP). Loaded lazily by JourneyMap.jsx, so the story page's
// chunk carries only the SVG sketch. PLAN-DAYLIGHT 2.7, 3.4, 3.5.
//
// panel (desktop, beside the story): the map with day chips, 3D, zoom, and a dock at the
//   bottom holding the active stop's card and Play. It follows the story as it scrolls.
// sheet (phone, full screen): the map on top, then swipeable stop cards and the actions in
//   the thumb zone. Swiping a card moves the map.
// Play: the camera travels the trip stop by stop, the route draws itself, each stop's
//   photos take turns, a title card opens each day. Space plays and pauses, the arrow keys
//   step, the scrubber is a real range input, Esc ends. With reduced motion nothing eases
//   and nothing advances on its own: Next stop is a jump cut.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createJourneyScene } from './journeyScene.js'
import { stopName } from './labels.js'
import { createPlayer } from './playback.js'
import { dropLevel, watchFrames } from './engine.js'
import { MapAttribution, MapButton, MapStack } from './MapChrome.jsx'
import { StopCard, dayTitle } from './StopCard.jsx'
import { dayColor } from './colors.js'
import { useSnapRow } from './useSnapRow.js'
import { wallDayLabel, wallTime } from '../lib/format.js'
import { prefersReducedMotion } from '../lib/capability.js'
import { plural } from '../lib/format.js'
import { Button } from '../ui/Button.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import { cx } from '../ui/cx.js'
import s from './JourneyMap.module.css'

const KM_TO_MI = 0.621371

/** What makes two journeys the same map: where the stops are and which day each is in. */
const shapeOf = (j) => j.stops.map((x) => `${x.id}:${x.lat.toFixed(5)},${x.lng.toFixed(5)}:${x.dayIndex}:${x.kind}:${x.n}`).join('|')

// What the overlays cover, so the camera frames what is left: the chips and tools at the
// top (an active stop also carries a fan of prints above it, so the top is generous) and,
// in the panel, the dock at the bottom, which grows with the panel (see the container
// queries in JourneyMap.module.css).
const bandOf = (w) => (w >= 680 ? 2 : w >= 540 ? 1 : 0)
const insetFor = (mode, w, playing) => (mode === 'sheet' ? { top: 150, bottom: 34, left: 40, right: 76 } : { top: 150, bottom: [206, 226, 238][bandOf(w)] + (playing ? 86 : 0), left: 40, right: 80 })

function DayChips({ journey, current, focus, onPick, playing }) {
  const ref = useRef(null)
  useEffect(() => {
    // scroll the chip row only: scrollIntoView would also scroll the page to the panel (on
    // opening a story the page jumped down to it, and reading nudged the window at each day)
    const row = ref.current
    const el = row?.querySelector('[aria-pressed="true"]')
    if (!row || !el) return
    const r = row.getBoundingClientRect(), e = el.getBoundingClientRect()
    const dx = e.left < r.left ? e.left - r.left - 8 : e.right > r.right ? e.right - r.right + 8 : 0
    if (dx) row.scrollTo({ left: row.scrollLeft + dx, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [current, focus])
  if (journey.days.length < 2) return null
  return (
    <div ref={ref} className={s.days} role="group" aria-label="Days" data-ui="journey-days">
      {!playing ? (
        <button type="button" className={s.day} aria-pressed={focus == null && current == null} onClick={() => onPick(null)}>
          All
        </button>
      ) : null}
      {journey.days.map((d) => (
        <button key={d.index} type="button" className={s.day} aria-pressed={(focus ?? current) === d.index} onClick={() => onPick(d.index)} style={{ '--day': dayColor(d.index) }}>
          <span className={s.dayDot} aria-hidden="true" />
          {d.label}
        </button>
      ))}
    </div>
  )
}

function Transport({ journey, play, player, onEnd, compact }) {
  const stops = journey.stops
  const i = Math.max(0, play.index)
  const stop = stops[i]
  // the scrubber's track wears the days' colours
  const track = useMemo(() => {
    const n = Math.max(1, stops.length - 1)
    const parts = []
    journey.days.forEach((d) => {
      const first = stops.findIndex((x) => x.id === d.stopIds[0]), last = stops.findIndex((x) => x.id === d.stopIds[d.stopIds.length - 1])
      const a = Math.max(0, (first - 0.5) / n) * 100, b = Math.min(1, (last + 0.5) / n) * 100
      parts.push(`${dayColor(d.index)} ${a.toFixed(2)}% ${b.toFixed(2)}%`)
    })
    return `linear-gradient(90deg, ${parts.join(', ')})`
  }, [journey])
  const atEnd = i >= stops.length - 1
  return (
    <div className={cx(s.transport, compact && s.transportCompact)} role="group" aria-label="Playback" data-ui="journey-transport">
      <input
        className={s.scrub}
        type="range"
        min={0}
        max={stops.length - 1}
        step={1}
        value={i}
        onChange={(e) => player.seek(Number(e.target.value))}
        aria-label="Stop"
        aria-valuetext={`${stop.n != null ? `Stop ${stop.n}` : 'Photo'} of ${stops.filter((x) => x.n != null).length}: ${stopName(stop) || 'on the way'}`}
        style={{ '--track': track, '--at': `${stops.length > 1 ? (i / (stops.length - 1)) * 100 : 0}%` }}
      />
      <div className={s.tRow}>
        <button type="button" className={s.tBtn} onClick={() => player.prev()} disabled={i <= 0} aria-label="Previous stop" title="Previous stop (left arrow)">
          <Icon name="chevron-left" size={22} />
        </button>
        {play.stepping ? (
          <button type="button" className={cx(s.tBtn, s.tMain, s.tWide)} onClick={() => (atEnd ? player.seek(0) : player.next())} data-autofocus>
            {atEnd ? 'Start again' : 'Next stop'} <Icon name={atEnd ? 'play' : 'chevron-right'} size={20} />
          </button>
        ) : (
          <button type="button" className={cx(s.tBtn, s.tMain, s.tPlay)} onClick={() => player.toggle()} aria-label={play.running ? 'Pause' : play.phase === 'done' ? 'Play again' : 'Play'} title={play.running ? 'Pause (space)' : 'Play (space)'} data-autofocus>
            <Icon name={play.running ? 'pause' : 'play'} size={22} />
          </button>
        )}
        {play.stepping ? null : (
          <button type="button" className={s.tBtn} onClick={() => player.next()} disabled={atEnd} aria-label="Next stop" title="Next stop (right arrow)">
            <Icon name="chevron-right" size={22} />
          </button>
        )}
        <span className={cx(s.tCount, 'a-mono')} aria-hidden="true">
          {stop.n != null ? `${stop.n} / ${stops.filter((x) => x.n != null).length}` : 'On the way'}
        </span>
        {play.stepping ? null : (
          <button type="button" className={cx(s.tBtn, s.tText, 'a-mono')} onClick={() => player.setSpeed(play.speed === 1 ? 2 : 1)} aria-pressed={play.speed === 2} aria-label="Double speed" title="Speed">
            {play.speed}×
          </button>
        )}
        <button type="button" className={cx(s.tBtn, s.tText)} onClick={onEnd} title="End playback (Esc)">
          Done
        </button>
      </div>
    </div>
  )
}

export default function JourneyLive({ journey, activeStopId = null, onStopSelect, mode = 'panel', playing, onPlayingChange, level = 'full', onLevel, onFail, onReady, onRead }) {
  const reduced = useMemo(() => prefersReducedMotion(), [])
  const sheet = mode === 'sheet'
  const stops = journey.stops
  // The creation flow hands over a new journey object whenever a place is named or a photo
  // finishes uploading. The map is rebuilt only when its shape changes; otherwise the
  // markers are refreshed in place.
  const shape = useMemo(() => shapeOf(journey), [journey])
  const latest = useRef(journey)
  latest.current = journey
  const node = useRef(null)
  const root = useRef(null)
  const dock = useRef(null)
  const scene = useRef(null)
  const player = useRef(null)
  const [ready, setReady] = useState(false)
  const [mapState, setMapState] = useState('loading')
  const [picked, setPicked] = useState(null)
  const pickedAt = useRef(0)
  const pickedBy = useRef('stop') // 'day': chosen with a day chip, so the day's fit stays
  const [dayFocus, setDayFocus] = useState(null)
  const [three, setThree] = useState(false)
  const [following, setFollowing] = useState(true)
  const [view, setView] = useState({ bearing: 0, pitch: 0 })
  const [play, setPlay] = useState(null)
  const [own, setOwn] = useState(false)
  const inPlayback = playing ?? own
  const setPlaying = useCallback(
    (v) => {
      setOwn(v)
      onPlayingChange?.(v)
    },
    [onPlayingChange],
  )

  const playStop = inPlayback && play && play.shown >= 0 ? stops[play.shown] : null
  const currentId = inPlayback ? (playStop ? playStop.id : null) : picked ?? activeStopId ?? null
  const current = currentId != null ? stops.find((x) => x.id === currentId) || null : null
  const live = useRef({})
  live.current = { onStopSelect, inPlayback, currentId, picked }

  // ---- the scene
  useEffect(() => {
    if (!node.current) return
    let dead = false
    let made = null
    let stopWatch = null
    const host = document.createElement('div')
    host.className = s.host
    node.current.appendChild(host)
    setReady(false)
    setMapState('loading')
    // a new map starts flat, following, with every day in view
    setThree(false)
    setFollowing(true)
    setDayFocus(null)
    createJourneyScene(host, {
      journey: latest.current,
      level,
      reduced,
      cooperative: !sheet,
      inset: insetFor(mode, node.current.clientWidth),
      alive: () => !dead,
      on: {
        stop: (id) => pick.current(id),
        userMove: () => !dead && setFollowing(false),
        state: (st) => !dead && setMapState(st),
        view: (v) => !dead && setView(v),
      },
    })
      .then((sc) => {
        if (!sc) return
        if (dead) return sc.destroy()
        made = sc
        scene.current = sc
        if (import.meta.env.DEV) node.current.__scene = sc // for the capture script and debugging
        setReady(true)
        onReady?.()
        if (level === 'full')
          stopWatch = watchFrames(sc.map, () => {
            dropLevel('lite')
            onLevel?.('lite')
          })
      })
      .catch((e) => {
        if (dead) return
        console.warn('[daylight] journey map unavailable:', e?.reason || e?.message)
        onFail?.(e?.reason || 'init')
      })
    return () => {
      dead = true
      stopWatch?.()
      player.current?.stop()
      player.current = null
      scene.current = null
      made?.destroy()
      host.remove()
    }
  }, [shape, level, sheet])
  const drawn = useRef(null)
  useEffect(() => {
    if (!ready) return
    if (drawn.current && drawn.current !== journey) scene.current?.relabel(journey)
    drawn.current = journey
  }, [journey, ready])

  useEffect(() => {
    if (!ready || !node.current || typeof ResizeObserver === 'undefined') return
    let band = bandOf(node.current.clientWidth)
    const ro = new ResizeObserver(() => {
      scene.current?.resize()
      const next = bandOf(node.current.clientWidth)
      if (next !== band) {
        band = next
        scene.current?.setInset(insetFor(mode, node.current.clientWidth, live.current.inPlayback))
      }
    })
    ro.observe(node.current)
    return () => ro.disconnect()
  }, [ready, mode])
  // the dock is taller while it carries the transport
  useEffect(() => {
    if (ready && node.current) scene.current?.setInset(insetFor(mode, node.current.clientWidth, inPlayback))
  }, [ready, mode, inPlayback])

  // ---- reading: the map follows the story
  useEffect(() => {
    // a stop chosen here holds while the story scrolls to it; after that the story leads again
    if (picked == null) return
    if (activeStopId === picked || performance.now() - pickedAt.current > 1600) setPicked(null)
  }, [activeStopId])
  const wasPlaying = useRef(false)
  useEffect(() => {
    const sc = scene.current
    if (!ready || !sc) return
    if (inPlayback) {
      wasPlaying.current = true
      return
    }
    if (wasPlaying.current) {
      wasPlaying.current = false
      sc.setProgress(Infinity, 0)
      sc.setActive(null, { source: 'play' })
      sc.setActive(currentId, { source: 'user' })
      if (currentId == null) sc.fit()
      return
    }
    sc.setActive(currentId, { source: picked != null && picked === currentId && pickedBy.current === 'stop' ? 'user' : 'scroll' })
  }, [ready, inPlayback, currentId])
  // a day chosen with a chip stays in focus until the reader moves to another day
  useEffect(() => {
    if (dayFocus != null && current && current.dayIndex !== dayFocus) {
      setDayFocus(null)
      scene.current?.setDay(null, { refit: false })
    }
  }, [current?.dayIndex])

  const pick = useRef(() => {})
  pick.current = (id) => {
    if (live.current.inPlayback) {
      player.current?.seek(stops.findIndex((x) => x.id === id))
      return
    }
    pickedAt.current = performance.now()
    pickedBy.current = 'stop'
    setPicked(id)
    live.current.onStopSelect?.(id)
  }
  const pickDay = (d) => {
    const sc = scene.current
    if (inPlayback) {
      if (d != null) player.current?.seek(stops.findIndex((x) => x.id === journey.days[d].stopIds[0]))
      return
    }
    setFollowing(true)
    sc?.follow(true, { refit: false })
    setDayFocus(d)
    sc?.setDay(d)
    if (d == null) {
      setPicked(null)
      return
    }
    const first = journey.days[d].stopIds[0]
    pickedAt.current = performance.now()
    pickedBy.current = 'day'
    setPicked(first)
    onStopSelect?.(first)
  }

  // ---- playback
  useEffect(() => {
    const sc = scene.current
    if (!ready || !sc || !inPlayback) return
    setFollowing(true)
    setDayFocus(null)
    sc.setDay(null, { refit: false })
    sc.map.keyboard.disable() // the arrow keys step through stops while playing
    const p = createPlayer({ journey: latest.current, scene: sc, reduced, onChange: setPlay })
    player.current = p
    p.start(0)
    return () => {
      p.stop()
      if (player.current === p) player.current = null
      setPlay(null)
      try {
        sc.map.keyboard.enable()
      } catch {
        /* the map is gone */
      }
    }
  }, [ready, inPlayback, shape])

  // Play moves focus to the transport (the button that was pressed is gone); ending
  // playback hands it back to Play
  const hadPlayback = useRef(false)
  useEffect(() => {
    const el = root.current
    if (!el) return
    const lost = !document.activeElement || document.activeElement === document.body || el.contains(document.activeElement)
    if (inPlayback && play && !hadPlayback.current) {
      hadPlayback.current = true
      if (lost) el.querySelector('[data-ui="journey-transport"] [data-autofocus]')?.focus({ preventScroll: true })
    } else if (!inPlayback && hadPlayback.current) {
      hadPlayback.current = false
      if (lost) el.querySelector('[data-ui="journey-play"]')?.focus({ preventScroll: true })
    }
  }, [inPlayback, !!play])

  const onKeyDown = (e) => {
    if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return
    const t = e.target
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return
    if (!inPlayback) return
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setPlaying(false)
    } else if (e.key === ' ' || e.key === 'k') {
      if (t.tagName === 'BUTTON' && e.key === ' ') return // space presses the focused button
      e.preventDefault()
      player.current?.toggle()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      player.current?.next()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      player.current?.prev()
    }
  }

  const toggle3D = () => {
    const next = !three
    setThree(next)
    scene.current?.set3D(next)
  }
  const resume = () => {
    setFollowing(true)
    scene.current?.follow(true)
  }

  const named = stops.filter((x) => x.kind === 'named').length
  const miles = Math.round(journey.legs.reduce((a, l) => a + (l.km || 0), 0) * KM_TO_MI)
  const currentDay = inPlayback && play && play.index >= 0 ? stops[play.index]?.dayIndex ?? null : current ? current.dayIndex : null
  const dayCard = play?.dayCard != null ? journey.days[play.dayCard] : null
  const dayCardFirst = dayCard ? stops.find((x) => x.id === dayCard.stopIds[0]) : null
  const cardRow = useSnapRow({ selected: currentId, count: stops.length, onSelect: (key) => pick.current(key) })

  const summary = (
    <div className={s.summary}>
      <p className={s.summaryTitle}>The journey</p>
      <p className={cx(s.summaryMeta, 'a-mono')}>
        {plural(named, 'stop')} · {plural(journey.days.length, 'day')}
        {miles > 0 ? ` · ${miles.toLocaleString('en-US')} mi between stops` : ''}
      </p>
      <p className={s.summaryNote}>Lines join the stops in the order they happened. They are not the roads taken.</p>
    </div>
  )
  const readBtn =
    onRead && current && !inPlayback ? (
      <Button variant="ghost" iconAfter="arrow" onClick={() => onRead(current.id)} className={s.read}>
        Read from here
      </Button>
    ) : null
  // beside a stop's name in the panel, where a full-width button would cost the map a fifth of its height
  const playSmall = (
    <button type="button" className={s.playSmall} onClick={() => setPlaying(true)} disabled={!ready} data-ui="journey-play" aria-label={reduced ? 'Step through the journey' : 'Play the journey'} title={reduced ? 'Step through the journey' : 'Play the journey'}>
      <Icon name="play" size={18} /> {reduced ? 'Step' : 'Play'}
    </button>
  )
  const actions = inPlayback && play ? (
    <Transport journey={journey} play={play} player={player.current} onEnd={() => setPlaying(false)} compact={sheet} />
  ) : (
    <div className={s.actions}>
      <Button icon="play" onClick={() => setPlaying(true)} disabled={!ready} className={s.playBtn} data-ui="journey-play">
        {reduced ? 'Step through the journey' : 'Play the journey'}
      </Button>
      {readBtn}
    </div>
  )

  return (
    <div ref={root} className={cx(s.live, sheet ? s.liveSheet : s.livePanel)} data-ui="journey-map" data-mode={mode} data-map-state={mapState} data-level={level} data-playing={inPlayback || undefined} data-three={three || undefined} onKeyDown={onKeyDown}>
      <div className={s.stage}>
        <div ref={node} className={s.node} role="region" aria-label={`Map of the journey: ${plural(named, 'stop')} over ${plural(journey.days.length, 'day')}. The stops are listed ${sheet ? 'below' : 'in the story'}.`} />
        {!ready ? (
          <div className={s.loading} role="status">
            <Spinner size={20} /> <span>Drawing the map</span>
          </div>
        ) : null}
        <div className={s.top}>
          <DayChips journey={journey} current={currentDay} focus={dayFocus} onPick={pickDay} playing={inPlayback} />
        </div>
        {ready ? (
          <div className={s.tools}>
            {level === 'full' ? (
              <MapStack label="Terrain">
                <MapButton label={three ? 'Flat map' : '3D terrain'} onClick={toggle3D} pressed={three} data-ui="journey-3d">
                  <span className={s.threeD}>3D</span>
                </MapButton>
              </MapStack>
            ) : null}
            <MapStack label="View">
              {Math.round(view.bearing) !== 0 && !three ? <MapButton icon="compass" label="Turn north up" onClick={() => scene.current?.north()} /> : null}
              <MapButton icon="expand" label="Show the whole journey" onClick={() => (setFollowing(false), scene.current?.fit())} />
            </MapStack>
            <MapStack label="Zoom" className={s.zoom}>
              <MapButton icon="plus" label="Zoom in" onClick={() => (setFollowing(false), scene.current?.zoomBy(1))} />
              <MapButton icon="minus" label="Zoom out" onClick={() => (setFollowing(false), scene.current?.zoomBy(-1))} />
            </MapStack>
          </div>
        ) : null}
        {!following && !inPlayback && ready && activeStopId != null && !sheet ? (
          <button type="button" className={s.follow} onClick={resume} data-ui="journey-follow">
            <Icon name="locate" size={18} /> Follow the story
          </button>
        ) : null}
        {dayCard ? (
          <div className={s.dayCard} style={{ '--day': dayColor(dayCard.index) }} data-ui="journey-daycard" key={dayCard.index}>
            <span className={cx(s.dayCardLabel, 'a-mono')}>{dayCard.label}</span>
            <strong className={s.dayCardDate}>{wallDayLabel(dayCardFirst?.ts) || dayCard.label}</strong>
            <span className={s.dayCardStops}>
              {dayCard.stopIds
                .map((id) => stopName(stops.find((x) => x.id === id)))
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
        ) : null}
        {!sheet ? (
          <div ref={dock} className={s.dock} data-ui="journey-dock">
            {current ? <StopCard journey={journey} stop={current} photo={play?.photo || 0} action={inPlayback ? null : playSmall} /> : summary}
            {inPlayback || !current ? actions : null}
          </div>
        ) : null}
        {sheet ? (
          <div className={s.attrib}>
            <MapAttribution terrain />
          </div>
        ) : null}
      </div>
      {!sheet ? <MapAttribution terrain className={s.attribLine} /> : null}
      {sheet ? (
        <div className={s.below}>
          <ul {...cardRow} className={s.cards} aria-label="Stops. Swipe to move the map." data-ui="journey-cards">
            {stops.map((st) => (
              <li
                key={st.id}
                data-key={st.id}
                className={s.cardItem}
                data-current={st.id === currentId || undefined}
                role="button"
                tabIndex={0}
                aria-current={st.id === currentId ? 'step' : undefined}
                onClick={() => st.id !== currentId && pick.current(st.id)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return
                  e.preventDefault()
                  e.stopPropagation()
                  pick.current(st.id)
                }}
              >
                <StopCard journey={journey} stop={st} compact photo={st.id === currentId ? play?.photo || 0 : 0} />
              </li>
            ))}
          </ul>
          {actions}
        </div>
      ) : null}
      <p className="a-sr" aria-live="polite">
        {inPlayback && dayCard ? `${dayCard.label}, ${wallDayLabel(dayCardFirst?.ts)}` : inPlayback && current ? `${current.n != null ? `Stop ${current.n}: ` : ''}${stopName(current) || 'A photo on the way'}${wallTime(current.ts) ? `, ${wallTime(current.ts)}` : ''}` : ''}
      </p>
    </div>
  )
}

export { dayTitle }
