// Geometry helpers shared by the journey, the draft and the maps (owner: F0). Pure.
import { parseBackendDate, wallTripDay } from './format.js'

const R = 6371.0088
const rad = (d) => (d * Math.PI) / 180

/** Great-circle distance in km. */
export function km(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export const isLatLng = (lat, lng) => Number.isFinite(+lat) && Number.isFinite(+lng) && Math.abs(+lat) <= 90 && Math.abs(+lng) <= 180 && !(+lat === 0 && +lng === 0)

/** [minLng, minLat, maxLng, maxLat] of points [{lat, lng}], or null. */
export function bboxOf(points) {
  const ps = points.filter((p) => p && isLatLng(p.lat, p.lng))
  if (!ps.length) return null
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity
  for (const p of ps) {
    a = Math.min(a, p.lng); b = Math.min(b, p.lat); c = Math.max(c, p.lng); d = Math.max(d, p.lat)
  }
  return [a, b, c, d]
}
/** Longitude span in degrees (for "open as a globe when pins span more than 60 degrees"). */
export function lngSpan(points) {
  const bb = bboxOf(points)
  return bb ? bb[2] - bb[0] : 0
}
export function centroid(points) {
  const ps = points.filter((p) => p && isLatLng(p.lat, p.lng))
  if (!ps.length) return null
  return { lat: ps.reduce((s, p) => s + p.lat, 0) / ps.length, lng: ps.reduce((s, p) => s + p.lng, 0) / ps.length }
}

/** Points along the great circle from a to b (for hops over 300km). [[lng, lat], ...] */
export function greatCircle(a, b, steps = 32) {
  const φ1 = rad(a.lat), λ1 = rad(a.lng), φ2 = rad(b.lat), λ2 = rad(b.lng)
  const d = 2 * Math.asin(Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2))
  if (d === 0) return [[a.lng, a.lat], [b.lng, b.lat]]
  const out = []
  for (let i = 0; i <= steps; i++) {
    const f = i / steps
    const A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d)
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2)
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2)
    const z = A * Math.sin(φ1) + B * Math.sin(φ2)
    out.push([(Math.atan2(y, x) * 180) / Math.PI, (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI])
  }
  return out
}

/**
 * The trip day of a moment, with the server's 4am pivot (backend photo_clustering.py:35):
 * a photo at 1:30am belongs to the evening before. Returns "YYYY-MM-DD" or null.
 * A stamp string is read at the place (the wall clock in the string, offset ignored), so a
 * reader in another time zone sees the same days; a Date is read in the reader's zone.
 */
export function tripDay(ts, pivotHour = 4) {
  const wall = ts instanceof Date ? null : wallTripDay(ts, pivotHour)
  if (wall) return wall
  const d = parseBackendDate(ts)
  if (!d) return null
  const t = new Date(d.getTime() - pivotHour * 3600000)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

/**
 * Groups located, time-ordered points into stops: a point within `radiusKm` of the stop's
 * first point and within `minutes` of the previous point joins it; otherwise it starts a
 * new stop. Then merges the closest consecutive pair until there are at most `max`.
 * points: [{id, lat, lng, ts}] -> [{lat, lng, ts, ids:[...]}]
 */
export function clusterStops(points, { radiusKm = 0.5, minutes = 90, max = 20 } = {}) {
  const ps = points.filter((p) => isLatLng(p.lat, p.lng)).slice().sort((a, b) => (parseBackendDate(a.ts) || 0) - (parseBackendDate(b.ts) || 0))
  const stops = []
  for (const p of ps) {
    const s = stops[stops.length - 1]
    const t = parseBackendDate(p.ts)
    const near = s && km(s.first, p) <= radiusKm
    const soon = s && (!t || !s.lastT || (t - s.lastT) / 60000 <= minutes)
    if (near && soon) {
      s.ids.push(p.id)
      s.pts.push(p)
      s.lastT = t || s.lastT
    } else {
      stops.push({ first: p, pts: [p], ids: [p.id], lastT: t, ts: p.ts })
    }
  }
  while (stops.length > max) {
    let best = 0, bd = Infinity
    for (let i = 0; i < stops.length - 1; i++) {
      const d = km(centroid(stops[i].pts), centroid(stops[i + 1].pts))
      if (d < bd) { bd = d; best = i }
    }
    const [a, b] = stops.splice(best, 2)
    stops.splice(best, 0, { first: a.first, pts: [...a.pts, ...b.pts], ids: [...a.ids, ...b.ids], lastT: b.lastT, ts: a.ts })
  }
  return stops.map((s) => ({ ...centroid(s.pts), ts: s.ts, ids: s.ids }))
}
