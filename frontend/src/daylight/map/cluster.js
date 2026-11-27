// Grouping the world view's pins (owner: MAP). Pure: no DOM, no map. PLAN-DAYLIGHT 3.3.
//
//   toPoints(events) -> [{id, lat, lng, x, y, event}]      placed stories only, input order kept
//   clusterAt(points, zoom, radiusPx) -> [{key, lat, lng, members}]
//   expansionZoom(cluster, fromZoom, maxZoom) -> number | null   null: the stories share one spot
//   zoomStep(zoom) -> number                               clusters change on half-zoom steps
//
// Why not MapLibre's built-in GeoJSON clustering: a cluster's stack of covers needs its
// leaves synchronously (getClusterLeaves is a worker round trip per cluster per frame of
// zoom), and querySourceFeatures only sees loaded tiles in view, which on a globe drops
// pins near the limb. With at most 500 stories (the feed's cap) a greedy pass in the
// main thread is a few thousand comparisons per half-zoom step, cached per step.
import { isLatLng } from '../lib/geo.js'

const TILE = 512
const mercX = (lng) => (lng + 180) / 360
const mercY = (lat) => {
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180)
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)
}

export function toPoints(events) {
  const out = []
  for (const e of events || []) {
    if (!isLatLng(e.latitude, e.longitude)) continue
    const lat = +e.latitude, lng = +e.longitude
    out.push({ id: e.id, lat, lng, x: mercX(lng), y: mercY(lat), event: e })
  }
  return out
}

export const zoomStep = (zoom) => Math.round(zoom * 2) / 2

/** Greedy radius clustering in Mercator pixels at `zoom`. Input order is priority order. */
export function clusterAt(points, zoom, radiusPx = 56) {
  const thr = radiusPx / (TILE * 2 ** zoom)
  const thr2 = thr * thr
  const used = new Uint8Array(points.length)
  const out = []
  for (let i = 0; i < points.length; i++) {
    if (used[i]) continue
    const p = points[i]
    used[i] = 1
    const members = [p]
    let sx = 0, sy = 0
    for (let j = i + 1; j < points.length; j++) {
      if (used[j]) continue
      const q = points[j]
      let dx = q.x - p.x
      if (dx > 0.5) dx -= 1
      else if (dx < -0.5) dx += 1
      const dy = q.y - p.y
      if (dx * dx + dy * dy > thr2) continue
      used[j] = 1
      members.push(q)
      sx += dx
      sy += q.lat - p.lat
    }
    const n = members.length
    let lng = p.lng + (sx / n) * 360
    if (lng > 180) lng -= 360
    else if (lng < -180) lng += 360
    out.push({ key: n === 1 ? `s${p.id}` : `c${members.map((m) => m.id).sort().join('.')}`, lat: p.lat + sy / n, lng, members })
  }
  return out
}

/** The first half-zoom step above `fromZoom` at which the cluster splits; null when it never does. */
export function expansionZoom(cluster, fromZoom, maxZoom = 16, radiusPx = 56) {
  for (let zz = zoomStep(fromZoom) + 0.5; zz <= maxZoom; zz += 0.5) {
    if (clusterAt(cluster.members, zz, radiusPx).length > 1) return zz
  }
  return null
}
