// The world map (owner: MAP). PLAN-DAYLIGHT 2.6, 3.3, 3.6.
//   <WorldMap events selectedId onSelect />      the frozen props; it fills its parent
// Optional, used by WorldPage:
//   hoverId onHover        a list row and its pin point at each other
//   padding                {top, bottom, left, right} px covered by a sheet, panel or pill
//   card                   'anchored' (hangs from the pin), 'docked' (bottom of the map), 'none'
//   faceFor                usePeople().faceFor, for the card's author face
//   projection onProjection   'globe' | 'flat' (uncontrolled when absent: remembered locally)
//   camera onView          restore and report {center, zoom, bearing}
//   onSpot(ids, place)     stories that share one identical place
//   controls               false hides the built-in zoom, north and Globe or Flat controls
//   onLevel(level)         'full' | 'lite' | 'static'
//   fitKey                 when it changes (a filter did), the map shows every story again
//
// events are production list items: latitude, longitude, cover_image_url, title, dates.
// Levels: full (globe, flights), lite (flat, jump cuts, 60 pins), static (the Places list).
// The list beside the map is the keyboard and screen-reader path; pins are labelled
// buttons but not tab stops.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { currentLevel, dropLevel, watchFrames } from './engine.js'
import { createWorld } from './world.js'
import { PlacesList } from './PlacesList.jsx'
import { StoryPeek } from './StoryPeek.jsx'
import { MapAttribution, MapButton, MapStack, ProjectionSwitch } from './MapChrome.jsx'
import { isLatLng, lngSpan } from '../lib/geo.js'
import { prefersReducedMotion, useDesktop } from '../lib/capability.js'
import { plural } from '../lib/format.js'
import { Button } from '../ui/Button.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import { cx } from '../ui/cx.js'
import s from './WorldMap.module.css'

const PROJ_KEY = 'ofs.map.projection'
const readProj = () => {
  try {
    const v = localStorage.getItem(PROJ_KEY)
    return v === 'globe' || v === 'flat' ? v : null
  } catch {
    return null
  }
}
/** Globe when the family's pins span more than 60 degrees of longitude, otherwise flat. */
export const autoProjection = (events) => (lngSpan((events || []).filter((e) => isLatLng(e.latitude, e.longitude)).map((e) => ({ lat: +e.latitude, lng: +e.longitude }))) > 60 ? 'globe' : 'flat')

const WHY = {
  webgl2: 'This browser cannot draw the map, so here are the places as a list.',
  chunk: 'The map did not download. Here are the places as a list.',
  tiles: 'The map tiles did not arrive. Here are the places as a list.',
  style: 'The map tiles did not arrive. Here are the places as a list.',
  init: 'The map could not start. Here are the places as a list.',
}

export default function WorldMap({ events = [], selectedId = null, onSelect, hoverId = null, onHover, padding, card, faceFor, projection, onProjection, camera, onView, onSpot, controls = true, onLevel, fitKey, className }) {
  const desktop = useDesktop()
  const [level, setLevel] = useState(currentLevel)
  const [failed, setFailed] = useState(null)
  const [state, setState] = useState('loading')
  const [ready, setReady] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [ownProj, setOwnProj] = useState(() => readProj() || autoProjection(events))
  const [spot, setSpot] = useState(null) // {ids}
  const [bearing, setBearing] = useState(0)
  const [, force] = useState(0)
  const proj = level === 'lite' ? 'flat' : projection || ownProj
  const node = useRef(null)
  const world = useRef(null)
  const live = useRef({})
  live.current = { onSelect, onHover, onSpot, onView, events, selectedId, padding, proj }

  const placed = useMemo(() => events.filter((e) => isLatLng(e.latitude, e.longitude)), [events])
  const unplaced = events.length - placed.length
  const isStatic = level === 'static' || !!failed
  const cardMode = card || (desktop ? 'anchored' : 'docked')

  useEffect(() => {
    onLevel?.(isStatic ? 'static' : level)
  }, [isStatic, level])

  // ---- create and destroy
  useEffect(() => {
    if (isStatic || !node.current) return
    let dead = false
    let w = null
    let stopWatch = null
    // MapLibre owns its container (it adds classes and children), and StrictMode mounts
    // twice: every run gets a fresh host element, removed with its map.
    const host = document.createElement('div')
    host.className = s.host
    node.current.appendChild(host)
    setState('loading')
    setReady(false)
    const L = live.current
    createWorld(host, {
      alive: () => !dead,
      events: L.events,
      level,
      projection: L.proj,
      padding: L.padding,
      reduced: prefersReducedMotion(),
      phone: () => !matchMedia('(min-width: 900px)').matches,
      camera,
      on: {
        select: (id) => {
          setSpot(null)
          live.current.onSelect?.(id)
        },
        hover: (id) => live.current.onHover?.(id),
        spot: (ids, place) => {
          setSpot({ ids })
          live.current.onSpot?.(ids, place)
          live.current.onSelect?.(ids[0])
        },
        state: (st) => !dead && setState(st),
        view: (v) => {
          if (dead) return
          setBearing(Math.round(v.bearing))
          live.current.onView?.(v)
        },
      },
    })
      .then((made) => {
        if (!made) return
        if (dead) return made.destroy()
        w = made
        world.current = made
        if (import.meta.env.DEV) node.current.__world = made // for the capture script and debugging
        if (live.current.selectedId != null) made.select(live.current.selectedId, { fly: false })
        setReady(true)
        force((n) => n + 1)
        if (level === 'full')
          stopWatch = watchFrames(made.map, () => {
            dropLevel('lite')
            setLevel('lite')
          })
      })
      .catch((e) => {
        if (dead) return
        console.warn('[daylight] world map unavailable:', e?.reason || e?.message)
        setFailed(e?.reason || 'init')
      })
    return () => {
      dead = true
      stopWatch?.()
      world.current = null
      w?.destroy()
      host.remove()
    }
  }, [isStatic, level, attempt])

  // ---- keep the map in step with props
  useEffect(() => {
    if (ready) world.current?.setEvents(events)
  }, [events, ready])
  const lastSel = useRef(selectedId)
  useEffect(() => {
    if (!ready) return
    const fly = lastSel.current !== selectedId
    lastSel.current = selectedId
    world.current?.select(selectedId, { fly })
    if (selectedId == null || (spot && !spot.ids.includes(selectedId))) setSpot(null)
  }, [selectedId, ready])
  useEffect(() => {
    if (ready) world.current?.hover(hoverId)
  }, [hoverId, ready])
  // a new set of stories (a filter changed) is shown whole
  const lastFit = useRef(fitKey)
  useEffect(() => {
    if (!ready || lastFit.current === fitKey) return
    lastFit.current = fitKey
    world.current?.fitAll()
  }, [fitKey, ready, events])
  useEffect(() => {
    if (ready) world.current?.setProjection(proj)
  }, [proj, ready])
  const padKey = padding ? `${padding.top || 0},${padding.bottom || 0},${padding.left || 0},${padding.right || 0}` : ''
  useEffect(() => {
    if (ready && padding) world.current?.setPadding(padding)
  }, [padKey, ready])
  useEffect(() => {
    if (!ready || !node.current || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => world.current?.resize())
    ro.observe(node.current)
    return () => ro.disconnect()
  }, [ready])

  const setProj = useCallback(
    (v) => {
      try {
        localStorage.setItem(PROJ_KEY, v)
      } catch {
        /* private mode */
      }
      setOwnProj(v)
      onProjection?.(v)
    },
    [onProjection],
  )

  if (isStatic) {
    return (
      <div className={cx(s.static, className)} data-ui="world-map" data-map-state="idle" data-level="static">
        <div className={s.staticHead}>
          <p className="a-label">
            {plural(placed.length, 'story', 'stories')} with a place{unplaced ? ` · ${unplaced} with no place yet` : ''}
          </p>
          {failed ? (
            <p className={s.why}>
              {WHY[failed] || WHY.init}{' '}
              {failed !== 'webgl2' ? (
                <Button variant="quiet" size="sm" onClick={() => (setFailed(null), setAttempt((n) => n + 1))}>
                  Try the map again
                </Button>
              ) : null}
            </p>
          ) : null}
        </div>
        <PlacesList events={events} selectedId={selectedId} onSelect={onSelect} />
      </div>
    )
  }

  const selected = selectedId != null ? placed.find((e) => e.id === selectedId) : null
  const spotEvents = spot ? spot.ids.map((id) => placed.find((e) => e.id === id)).filter(Boolean) : null
  const peek = selected && cardMode !== 'none' ? <StoryPeek key={selected.id} event={selected} faceFor={faceFor} spot={spotEvents} onClose={() => onSelect?.(null)} anchored={cardMode === 'anchored'} /> : null

  return (
    <div className={cx(s.world, className)} data-ui="world-map" data-map-state={state === 'loading' ? 'loading' : state} data-level={level} data-projection={proj}>
      <div ref={node} className={s.canvas} role="region" aria-label={`Map of ${plural(placed.length, 'story', 'stories')}. The list of stories has the same places.`} />
      {!ready ? (
        <div className={s.loading} role="status">
          <Spinner size={22} /> <span>Drawing the map</span>
        </div>
      ) : null}
      {controls && ready && level === 'full' ? (
        <div className={s.shape}>
          <ProjectionSwitch value={proj} onChange={setProj} />
        </div>
      ) : null}
      {controls && ready ? (
        <div className={s.controls}>
          <MapStack label="Zoom" className={s.zoom}>
            <MapButton icon="plus" label="Zoom in" onClick={() => world.current?.zoomBy(1)} />
            <MapButton icon="minus" label="Zoom out" onClick={() => world.current?.zoomBy(-1)} />
          </MapStack>
          <MapStack label="View">
            {bearing !== 0 ? <MapButton icon="compass" label="Turn north up" onClick={() => world.current?.north()} /> : null}
            <MapButton icon="expand" label="Show every story" onClick={() => world.current?.fitAll()} />
          </MapStack>
        </div>
      ) : null}
      <div className={s.foot}>
        <MapAttribution />
      </div>
      {peek && cardMode === 'anchored' && world.current ? createPortal(peek, world.current.anchorEl) : null}
      {peek && cardMode === 'docked' ? <div className={s.dock}>{peek}</div> : null}
    </div>
  )
}
