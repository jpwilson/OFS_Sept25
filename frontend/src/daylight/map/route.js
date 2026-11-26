// The journey's route as map layers (owner: MAP). PLAN-DAYLIGHT 3.4. No DOM, no React.
//
//   legLine(journey, leg) -> [[lng, lat], ...]        a gentle curve from stop to stop
//   addRoute(map, journey)                            sources and layers, above everything
//   setReached(map, seq)                              legs up to seq wear their day's colour
//   setDayFocus(map, dayIndex | null)                 other days fall back to the dashed line
//   setGrowing(map, journey, leg | null, t)           playback: one leg drawn to fraction t
//   pointOnLeg(line, t) -> [lng, lat]                 where the traveller is on that leg
//
// The app has photo positions, not a GPS track, so a leg is a line from one stop to the
// next in time order. It is drawn as a gentle curve so that it reads as "then we went
// there" and never as the road taken; hops over 300km are great-circle arcs.
// Look: a 4px line in the day's colour over an 8px ink casing; the part not reached yet is
// dashed ink at 25%. Reached and not reached are two layers switched by a filter on the
// leg's sequence number, so reading costs no per-frame work. Only playback animates, on a
// single leg, with a line-gradient on line-progress.
import { greatCircle } from '../lib/geo.js'
import { COLOR } from '../styles/tokens.js'
import { dayColor } from './colors.js'

const SRC = 'ofsa-route'
const GROW = 'ofsa-route-grow'
const L = { ahead: 'ofsa-route-ahead', casing: 'ofsa-route-casing', line: 'ofsa-route-line', growCasing: 'ofsa-route-grow-casing', growLine: 'ofsa-route-grow-line' }
const CLEAR = 'rgba(16,27,59,0)'

const stopOf = (journey, id) => journey.stops.find((s) => s.id === id)

export function legLine(journey, leg) {
  const a = stopOf(journey, leg.from), b = stopOf(journey, leg.to)
  if (!a || !b) return []
  if (leg.arc) return greatCircle(a, b, 48)
  // a quadratic curve, bowing to alternate sides so consecutive legs flow like a path
  const k = Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180) || 1
  const ax = a.lng * k, ay = a.lat, bx = b.lng * k, by = b.lat
  const dx = bx - ax, dy = by - ay
  const bow = (leg.seq % 2 ? 1 : -1) * 0.13
  const cx = (ax + bx) / 2 - dy * bow, cy = (ay + by) / 2 + dx * bow
  const out = []
  const N = 28
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t
    out.push([(u * u * ax + 2 * u * t * cx + t * t * bx) / k, u * u * ay + 2 * u * t * cy + t * t * by])
  }
  return out
}

export function routeData(journey) {
  return {
    type: 'FeatureCollection',
    features: journey.legs.map((leg) => ({
      type: 'Feature',
      properties: { seq: leg.seq, day: leg.dayIndex, color: dayColor(leg.dayIndex) },
      geometry: { type: 'LineString', coordinates: legLine(journey, leg) },
    })),
  }
}

export function addRoute(map, journey) {
  if (map.getSource(SRC)) return
  map.addSource(SRC, { type: 'geojson', data: routeData(journey) })
  map.addSource(GROW, { type: 'geojson', lineMetrics: true, data: { type: 'FeatureCollection', features: [] } })
  const round = { 'line-cap': 'round', 'line-join': 'round' }
  const w = (a, b) => ['interpolate', ['linear'], ['zoom'], 8, a, 13, b]
  map.addLayer({ id: L.ahead, type: 'line', source: SRC, layout: { 'line-cap': 'butt', 'line-join': 'round' }, paint: { 'line-color': 'rgba(16,27,59,0.38)', 'line-width': w(2, 2.6), 'line-dasharray': [1.6, 1.6] } })
  map.addLayer({ id: L.casing, type: 'line', source: SRC, layout: round, paint: { 'line-color': COLOR.ink, 'line-width': w(6.5, 8) } })
  map.addLayer({ id: L.line, type: 'line', source: SRC, layout: round, paint: { 'line-color': ['get', 'color'], 'line-width': w(3, 4) } })
  map.addLayer({ id: L.growCasing, type: 'line', source: GROW, layout: { ...round, visibility: 'none' }, paint: { 'line-color': COLOR.ink, 'line-width': w(6.5, 8) } })
  map.addLayer({ id: L.growLine, type: 'line', source: GROW, layout: { ...round, visibility: 'none' }, paint: { 'line-color': COLOR.white, 'line-width': w(3, 4) } })
}

const state = new WeakMap() // map -> {reached, day, grow}
const st = (map) => {
  if (!state.has(map)) state.set(map, { reached: Infinity, day: null, grow: null })
  return state.get(map)
}
function applyFilter(map) {
  if (!map.getLayer(L.casing)) return
  const s = st(map)
  const parts = ['all']
  if (Number.isFinite(s.reached)) parts.push(['<=', ['get', 'seq'], s.reached])
  if (s.day != null) parts.push(['==', ['get', 'day'], s.day])
  const f = parts.length > 1 ? parts : null
  map.setFilter(L.casing, f)
  map.setFilter(L.line, f)
}

/** Legs with seq <= `seq` are reached. Infinity: the whole route. */
export function setReached(map, seq) {
  const s = st(map)
  if (s.reached === seq) return
  s.reached = seq
  applyFilter(map)
}
export function setDayFocus(map, dayIndex) {
  const s = st(map)
  if (s.day === dayIndex) return
  s.day = dayIndex
  applyFilter(map)
}

/** Playback: draw `leg` up to fraction t (0..1). Pass null to clear. */
export function setGrowing(map, journey, leg, t) {
  if (!map.getLayer(L.growLine)) return
  const s = st(map)
  if (!leg || t <= 0.002) {
    if (s.grow) {
      map.setLayoutProperty(L.growCasing, 'visibility', 'none')
      map.setLayoutProperty(L.growLine, 'visibility', 'none')
      s.grow = null
    }
    if (!leg) return
  }
  if (!leg || t <= 0.002) return
  if (s.grow !== leg.id) {
    map.getSource(GROW).setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: legLine(journey, leg) } })
    map.setLayoutProperty(L.growCasing, 'visibility', 'visible')
    map.setLayoutProperty(L.growLine, 'visibility', 'visible')
    s.grow = leg.id
  }
  const f = Math.min(0.998, Math.max(0.002, t))
  map.setPaintProperty(L.growCasing, 'line-gradient', ['step', ['line-progress'], COLOR.ink, f, CLEAR])
  map.setPaintProperty(L.growLine, 'line-gradient', ['step', ['line-progress'], dayColor(leg.dayIndex), f, CLEAR])
}

/** The point at fraction t along a leg's line (by length). */
export function pointOnLeg(line, t) {
  if (!line.length) return null
  if (t <= 0) return line[0]
  if (t >= 1) return line[line.length - 1]
  let total = 0
  const seg = []
  for (let i = 1; i < line.length; i++) {
    const d = Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1])
    seg.push(d)
    total += d
  }
  let want = total * t
  for (let i = 0; i < seg.length; i++) {
    if (want <= seg[i]) {
      const f = seg[i] ? want / seg[i] : 0
      return [line[i][0] + (line[i + 1][0] - line[i][0]) * f, line[i][1] + (line[i + 1][1] - line[i][1]) * f]
    }
    want -= seg[i]
  }
  return line[line.length - 1]
}

export const ROUTE_LAYERS = L
