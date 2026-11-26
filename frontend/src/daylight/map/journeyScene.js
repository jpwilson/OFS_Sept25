// A story's journey map, without React (owner: MAP). PLAN-DAYLIGHT 2.7, 3.4, 3.5.
//
//   createJourneyScene(container, {journey, level, reduced, cooperative, inset, alive, on}) -> Promise<scene>
//   scene.setActive(stopId | null, {source: 'scroll'|'user'|'play'})
//         scroll: a new day fits that day once; inside a day the map pans only when the stop
//         is outside what the overlays leave visible; nothing moves while following is paused.
//         user: ease to it.
//   scene.setDay(dayIndex | null)       focus one day (other days fall back to the dashed line)
//   scene.set3D(on)                     real terrain, pitched, facing the high ground
//   scene.setInset({top, bottom, left, right})   what the overlays cover
//   scene.follow(on)                    resume or pause following the story
//   scene.fit({animate})  scene.zoomBy(±1)  scene.north()  scene.resize()  scene.destroy()
//   playback (driven by playback.js):
//   scene.showDay(dayIndex)  scene.travelTo(index, {duration})  scene.setProgress(index, t)
//   on: {stop(id), userMove(), state('busy'|'idle'), view({bearing, pitch, zoom})}
import { createMap, loadMapLibre } from './engine.js'
import { buildStyle, demSource, TERRAIN_SOURCE, TERRAIN_EXAGGERATION } from './style.js'
import { addRoute, legLine, pointOnLeg, setDayFocus, setGrowing, setReached } from './route.js'
import { stopDisc, setFlag } from './markers.js'
import { dayColor } from './colors.js'
import { bboxOf, km } from '../lib/geo.js'
import { stopName } from './labels.js'
import pins from './pins.module.css'

const noop = () => {}
const RAD = Math.PI / 180


/** bbox grown to at least `minKm` on each side, so a one-stop day is not a rooftop. */
function roomy(bb, minKm = 5) {
  if (!bb) return null
  const [w, s, e, n] = bb
  const midLat = (s + n) / 2
  const dLat = minKm / 111, dLng = minKm / (111 * Math.max(0.2, Math.cos(midLat * RAD)))
  const padLat = Math.max(0, (dLat - (n - s)) / 2), padLng = Math.max(0, (dLng - (e - w)) / 2)
  return [[w - padLng, s - padLat], [e + padLng, n + padLat]]
}
const bearingOf = (a, b) => {
  const y = Math.sin((b.lng - a.lng) * RAD) * Math.cos(b.lat * RAD)
  const x = Math.cos(a.lat * RAD) * Math.sin(b.lat * RAD) - Math.sin(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos((b.lng - a.lng) * RAD)
  return (Math.atan2(y, x) / RAD + 360) % 360
}

export async function createJourneyScene(container, { journey, level = 'full', reduced = false, cooperative = false, inset = {}, alive = () => true, on = {} } = {}) {
  const emit = { stop: noop, userMove: noop, state: noop, view: noop, ...on }
  const ml = await loadMapLibre()
  if (!alive()) return null
  const lite = level === 'lite'
  const still = reduced || lite // jump cuts
  let pad = { top: 24, bottom: 24, left: 24, right: 24, ...inset }
  let stops = journey.stops
  const indexOf = new Map(stops.map((s, i) => [s.id, i]))
  const all = roomy(journey.bbox || bboxOf(stops), 3)

  const map = await createMap(container, {
    style: buildStyle({ hillshade: true, lite }),
    bounds: all,
    fitBoundsOptions: { padding: 30, maxZoom: 13.5 },
    maxZoom: 16.5,
    maxPitch: 75,
    cooperativeGestures: cooperative,
    fadeDuration: still ? 0 : 250,
    canvasContextAttributes: { antialias: !lite },
  })
  map.setPadding(pad)
  addRoute(map, journey)

  // ---------------------------------------------------------------- markers
  const marks = new Map() // stop id -> {marker, el, stop}
  const discFor = (stop, from) => stopDisc(stop, { color: dayColor(stop.dayIndex), label: stopName(stop), photos: stop.photoIds.map((id) => from.photos[id]?.src).filter(Boolean) })
  for (const stop of stops) {
    const node = discFor(stop, journey)
    node.addEventListener('click', (e) => {
      e.stopPropagation()
      emit.stop(stop.id)
    })
    const marker = new ml.Marker({ element: node, anchor: 'center', opacityWhenCovered: '0.25' }).setLngLat([stop.lng, stop.lat]).addTo(map)
    marks.set(stop.id, { marker, el: node, stop })
  }
  // the traveller: the head of the line during playback
  const head = document.createElement('div')
  head.className = pins.traveller
  head.setAttribute('aria-hidden', 'true')
  const headMarker = new ml.Marker({ element: head, anchor: 'center', opacityWhenCovered: '0.25' })
  let headOn = false

  let activeId = null
  let dayFocus = null
  let lastDay = null
  let following = true
  let reached = Infinity
  let three = false
  let destroyed = false

  /** Hide what collides: name tags and photo prints only where there is room. */
  function declutter() {
    if (destroyed) return
    const W = container.clientWidth, H = container.clientHeight
    const pts = stops.map((s) => ({ s, p: map.project([s.lng, s.lat]) }))
    // discs that sit on top of each other are nudged apart (never the active one)
    const off = new Map(pts.map(({ s }) => [s.id, [0, 0]]))
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j]
          if (a.s.kind !== 'named' || b.s.kind !== 'named') continue
          const oa = off.get(a.s.id), ob = off.get(b.s.id)
          let dx = b.p.x + ob[0] - (a.p.x + oa[0]), dy = b.p.y + ob[1] - (a.p.y + oa[1])
          const d = Math.hypot(dx, dy)
          const min = 30
          if (d >= min) continue
          if (d < 0.5) {
            dx = 1
            dy = 0
          }
          const push = Math.min(11, (min - d) / 2) / Math.max(d, 1)
          oa[0] -= dx * push; oa[1] -= dy * push
          ob[0] += dx * push; ob[1] += dy * push
        }
      }
    }
    const boxes = []
    const hit = (b) => boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])
    const order = [...pts].sort((a, b) => (b.s.id === activeId) - (a.s.id === activeId) || (b.s.dayIndex === dayFocus) - (a.s.dayIndex === dayFocus) || indexOf.get(a.s.id) - indexOf.get(b.s.id))
    for (const { s, p } of pts) {
      const o = off.get(s.id)
      marks.get(s.id).marker.setOffset([Math.round(o[0]), Math.round(o[1])])
      const r = s.kind === 'named' ? (s.id === activeId ? 22 : 17) : 8
      boxes.push([p.x + o[0] - r, p.y + o[1] - r, p.x + o[0] + r, p.y + o[1] + r])
    }
    for (const { s, p } of order) {
      const m = marks.get(s.id)
      const o = off.get(s.id)
      const x = p.x + o[0], y = p.y + o[1]
      const isActive = s.id === activeId
      const visible = x > -20 && x < W + 20 && y > -20 && y < H + 20
      // photo print above the disc
      if (s.photoIds.length) {
        const n = isActive ? Math.min(3, s.photoIds.length) : 1
        const w = isActive ? 84 + (n - 1) * 70 : 46, h = isActive ? 66 : 36
        const box = [x - w / 2 - 3, y - 24 - h - 6, x + w / 2 + 3, y - 20]
        const ok = visible && (isActive || (!hit(box) && box[1] > pad.top - 30))
        setFlag(m.el, 'prints', ok ? null : 'off')
        // a fan near the edge slides sideways to stay whole (its pin stays on the stop)
        let shift = 0
        if (isActive) {
          const lo = 8, hi = W - (box[1] < 250 ? 66 : 8)
          if (box[0] < lo) shift = lo - box[0]
          else if (box[2] > hi) shift = hi - box[2]
          box[0] += shift
          box[2] += shift
        }
        m.el.style.setProperty('--fan-shift', `${Math.round(shift)}px`)
        if (ok) boxes.push(box)
      }
      // name tag beside the disc
      if (s.kind === 'named' && s.name) {
        const text = stopName(s)
        const gap = isActive ? 26 : 20
        // room on each side (the tools stand in the top right corner)
        const roomR = W - (y < 250 ? 66 : 6) - (x + gap), roomL = x - gap - 6
        const want = text.length * (isActive ? 7.6 : 6.9) + (isActive ? 26 : 18), h = isActive ? 30 : 24
        const w = Math.min(190, want)
        const right = [x + gap, y - h / 2, x + gap + Math.min(w, Math.max(roomR, 0)), y + h / 2]
        const left = [x - gap - Math.min(w, Math.max(roomL, 0)), y - h / 2, x - gap, y + h / 2]
        let side = null
        if (roomR >= w && !hit(right)) side = 'right'
        else if (roomL >= w && !hit(left)) side = 'left'
        else if (isActive) side = roomR >= roomL ? 'right' : 'left' // the active stop always shows its name
        setFlag(m.el, 'label', side && visible ? true : null)
        setFlag(m.el, 'side', side === 'left' ? 'left' : null)
        m.el.style.setProperty('--tag-max', `${Math.round(Math.max(60, Math.min(190, side === 'left' ? roomL : roomR)))}px`)
        if (side) boxes.push(side === 'left' ? left : right)
      }
    }
  }

  function paint() {
    for (const { el, stop } of marks.values()) {
      const i = indexOf.get(stop.id)
      setFlag(el, 'active', stop.id === activeId)
      setFlag(el, 'ahead', Number.isFinite(reached) && i > reached)
      setFlag(el, 'dim', dayFocus != null && stop.dayIndex !== dayFocus)
    }
    declutter()
  }

  // ---------------------------------------------------------------- camera
  // The map carries the inset as its own padding, so "centre on this stop" means the
  // centre of what the overlays leave visible, and fits only add a small margin.
  let settledAt = 0 // when the camera move in flight will have landed
  function go(opts, { animate = true, duration = 900 } = {}) {
    if (still || !animate) map.jumpTo(opts)
    else {
      settledAt = performance.now() + duration
      map.easeTo({ duration, essential: true, ...opts })
    }
  }
  function cameraFor(bounds, maxZoom = 13.5) {
    const cam = map.cameraForBounds(bounds, { padding: 26, maxZoom, bearing: three ? map.getBearing() : 0 })
    return cam ? { center: cam.center, zoom: three ? cam.zoom + 0.15 : cam.zoom } : null
  }
  function fit({ animate = true } = {}) {
    const cam = cameraFor(all)
    if (cam) go({ ...cam, ...(three ? {} : { bearing: 0, pitch: 0 }) }, { animate })
  }
  function fitDay(dayIndex, { animate = true, duration = 1100 } = {}) {
    const day = journey.days[dayIndex]
    if (!day) return fit({ animate })
    // the day's own stops fill the view; the road in arrives from the edge
    const cam = cameraFor(roomy(bboxOf(day.stopIds.map((id) => stops[indexOf.get(id)])), 5))
    if (cam) go(cam, { animate, duration })
  }
  /** Is the stop inside what the overlays leave visible? (A day's fit puts all its stops there.) */
  const inView = (stop) => {
    const p = map.project([stop.lng, stop.lat])
    const W = container.clientWidth, H = container.clientHeight
    return p.x >= pad.left - 8 && p.x <= W - pad.right + 8 && p.y >= pad.top - 8 && p.y <= H - pad.bottom + 8
  }

  function setActive(id, { source = 'scroll' } = {}) {
    const changed = id !== activeId
    activeId = id ?? null
    const stop = id != null ? stops[indexOf.get(id)] : null
    if (source !== 'play') {
      reached = stop ? indexOf.get(id) : Infinity
      setReached(map, reached)
      setGrowing(map, journey, null)
      if (headOn) {
        headMarker.remove()
        headOn = false
      }
    }
    paint()
    if (!changed || source === 'play') return
    if (!stop) {
      lastDay = null
      if (following || source === 'user') fit()
      return
    }
    if (source === 'user') {
      lastDay = stop.dayIndex
      go({ center: [stop.lng, stop.lat], zoom: Math.max(map.getZoom(), 11.4) }, { duration: 800 })
      return
    }
    if (!following) return
    if (stop.dayIndex !== lastDay) {
      lastDay = stop.dayIndex
      fitDay(stop.dayIndex)
    } else if (performance.now() > settledAt && !inView(stop)) {
      // (not while a fit is still in flight: it is on its way to showing this stop)
      go({ center: [stop.lng, stop.lat] }, { duration: 700 })
    }
  }

  // ---------------------------------------------------------------- 3D
  /** Turn to face the high ground: sample the terrain around the route and look at the tallest side. */
  function faceHighGround() {
    const c = map.getCenter()
    const [[w, s], [e, n]] = all
    const reach = Math.max(n - s, (e - w) * Math.cos(c.lat * RAD)) * 0.55
    let best = null
    const here = map.queryTerrainElevation([c.lng, c.lat])
    if (here == null) return null
    for (let b = 0; b < 360; b += 30) {
      let sum = 0, cnt = 0
      for (const f of [0.5, 0.8, 1.1]) {
        const lat = c.lat + Math.cos(b * RAD) * reach * f
        const lng = c.lng + (Math.sin(b * RAD) * reach * f) / Math.cos(c.lat * RAD)
        const el = map.queryTerrainElevation([lng, lat])
        if (el != null) {
          sum += el
          cnt++
        }
      }
      if (cnt && (!best || sum / cnt > best.h)) best = { b, h: sum / cnt }
    }
    return best && best.h - here > 150 * TERRAIN_EXAGGERATION ? best.b : null
  }
  function set3D(next) {
    if (lite || next === three) return
    three = next
    if (next) {
      if (!map.getSource(TERRAIN_SOURCE)) map.addSource(TERRAIN_SOURCE, demSource())
      map.setTerrain({ source: TERRAIN_SOURCE, exaggeration: TERRAIN_EXAGGERATION })
      go({ pitch: 66, bearing: map.getBearing() || -20, zoom: map.getZoom() + 0.4 }, { duration: 1200 })
      // once the terrain is in, turn to the mountains (unless the reader has taken the map)
      const t0 = performance.now()
      map.once('idle', () => {
        if (destroyed || !three || performance.now() - t0 > 9000) return
        const b = faceHighGround()
        if (b != null) go({ bearing: b, pitch: 69 }, { duration: 1600 })
      })
    } else {
      map.setTerrain(null)
      go({ pitch: 0, bearing: 0 }, { duration: 900 })
    }
    emit.view({ bearing: map.getBearing(), pitch: next ? 66 : 0, zoom: map.getZoom(), three })
  }

  // ---------------------------------------------------------------- events
  map.on('movestart', (e) => {
    emit.state('busy')
    // a move the reader made (drag, pinch, wheel, keys) pauses following
    if (e.originalEvent && following) {
      following = false
      emit.userMove()
    }
  })
  map.on('moveend', () => {
    declutter()
    emit.view({ bearing: map.getBearing(), pitch: map.getPitch(), zoom: map.getZoom(), three })
  })
  map.on('zoom', declutter)
  map.on('rotate', declutter)
  map.on('pitch', declutter)
  map.on('idle', () => emit.state('idle'))
  {
    const cam = cameraFor(all)
    if (cam) map.jumpTo(cam)
  }
  paint()

  return {
    map,
    get three() {
      return three
    },
    get following() {
      return following
    },
    setActive,
    setDay(dayIndex, { refit = true } = {}) {
      dayFocus = dayIndex ?? null
      setDayFocus(map, dayFocus)
      paint()
      if (!refit) return
      if (dayFocus == null) fit()
      else fitDay(dayFocus)
      lastDay = dayFocus
    },
    set3D,
    setInset(next, { refit = false } = {}) {
      pad = { top: 24, bottom: 24, left: 24, right: 24, ...next }
      map.setPadding(pad)
      if (refit) fit({ animate: false })
      declutter()
    },
    follow(on, { refit = true } = {}) {
      following = on
      if (!refit) return
      if (on && activeId != null) {
        const stop = stops[indexOf.get(activeId)]
        lastDay = stop.dayIndex
        fitDay(stop.dayIndex)
      } else if (on) fit()
    },
    fit,
    zoomBy(d) {
      following = false // the reader has taken the map
      go({ zoom: map.getZoom() + d }, { duration: 260 })
    },
    north() {
      go({ bearing: 0 }, { duration: 400 })
    },
    resize() {
      map.resize()
      declutter()
    },
    /**
     * The same journey with new words or pictures (a place got its name, a photo finished
     * uploading): the markers are refreshed in place and the map, camera and route stay.
     */
    relabel(next) {
      journey = next
      stops = next.stops
      for (const stop of stops) {
        const m = marks.get(stop.id)
        if (!m) continue
        const fresh = discFor(stop, next)
        m.stop = stop
        m.el.replaceChildren(...fresh.childNodes)
        m.el.setAttribute('aria-label', fresh.getAttribute('aria-label'))
      }
      paint()
    },

    // ---- playback
    /** A new day begins: fit it, with the route drawn up to the stop before it. */
    showDay(dayIndex, { animate = true } = {}) {
      dayFocus = null
      setDayFocus(map, null)
      const day = journey.days[dayIndex]
      if (!day) return
      const own = day.stopIds.map((id) => stops[indexOf.get(id)])
      const first = indexOf.get(day.stopIds[0])
      const prev = first > 0 ? stops[first - 1] : null
      // the day's stops, and where the day sets out from when that is not a long way off:
      // the road in is then drawn in view, not from beyond the edge
      let pts = own
      if (prev) {
        const bb = bboxOf(own)
        const span = Math.max(4, km({ lat: bb[1], lng: bb[0] }, { lat: bb[3], lng: bb[2] }))
        if (km(prev, own[0]) < Math.max(span * 6, 60)) pts = [...own, prev]
      }
      const cam = cameraFor(roomy(bboxOf(pts), 5))
      if (cam) go(cam, { animate, duration: 1300 })
    },
    /** Ease the camera to stop `index` over `duration` ms; in 3D, along the leg. */
    travelTo(index, { duration = 1600 } = {}) {
      const stop = stops[index], prev = stops[index - 1]
      const o = { center: [stop.lng, stop.lat] }
      if (three && prev) {
        o.bearing = bearingOf(prev, stop)
        o.pitch = 64
      }
      // close enough to see the stop, far enough to see where we came from
      const leg = prev ? cameraFor(roomy(bboxOf([prev, stop]), 4), 13) : null
      o.zoom = Math.min(13, Math.max(leg ? leg.zoom - 0.2 : 11.5, 7.5))
      go(o, { animate: duration > 0, duration })
    },
    /** Arrived: come in close enough to see the place while its photos take turns. */
    settleOn(index, { duration = 1000 } = {}) {
      const stop = stops[index]
      const want = three ? 12.3 : 11.7
      if (want - map.getZoom() > 0.2) go({ center: [stop.lng, stop.lat], zoom: want }, { duration })
    },
    /** Legs up to stop `index` are drawn; the next leg is drawn to fraction t (0..1). */
    setProgress(index, t = 0) {
      reached = index
      setReached(map, index)
      const leg = journey.legs[index] // the leg that ends at stop index + 1
      if (leg && t > 0 && t < 1) {
        setGrowing(map, journey, leg, t)
        const p = pointOnLeg(legLine(journey, leg), t)
        if (p) {
          headMarker.setLngLat(p)
          if (!headOn) {
            headMarker.addTo(map)
            headOn = true
          }
        }
      } else {
        setGrowing(map, journey, null)
        if (headOn) {
          headMarker.remove()
          headOn = false
        }
      }
      for (const { el, stop } of marks.values()) setFlag(el, 'ahead', indexOf.get(stop.id) > index)
    },
    destroy() {
      destroyed = true
      for (const m of marks.values()) m.marker.remove()
      try {
        map.remove()
      } catch {
        /* already gone */
      }
    },
  }
}
