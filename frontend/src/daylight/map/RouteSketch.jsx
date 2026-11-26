// The SVG route sketch (owner: F0, MAP may restyle). PLAN-DAYLIGHT 3.6: the static level,
// the phone's inline strip before MapLibre loads, and the stub other packages build on.
// Stops projected on paper (equirectangular, corrected for latitude), legs coloured by day
// over an ink casing, numbered discs with upright DM Mono digits. No map data, so no
// attribution is needed.
import { useMemo } from 'react'
import { DAY_WASHES, WASH, COLOR, FONT } from '../styles/tokens.js'
import { greatCircle } from '../lib/geo.js'
import s from './RouteSketch.module.css'

export function dayColor(i) {
  return WASH[DAY_WASHES[i % DAY_WASHES.length]].base
}

function projector(stops, w, h, pad) {
  const lats = stops.map((p) => p.lat), lngs = stops.map((p) => p.lng)
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const k = Math.cos((midLat * Math.PI) / 180) || 1
  const x0 = Math.min(...lngs) * k, x1 = Math.max(...lngs) * k
  const y0 = Math.min(...lats), y1 = Math.max(...lats)
  const sx = (w - pad * 2) / Math.max(x1 - x0, 1e-6), sy = (h - pad * 2) / Math.max(y1 - y0, 1e-6)
  const sc = Math.min(sx, sy)
  const ox = (w - (x1 - x0) * sc) / 2, oy = (h - (y1 - y0) * sc) / 2
  return (lat, lng) => [ox + (lng * k - x0) * sc, h - (oy + (lat - y0) * sc)]
}

/**
 * <RouteSketch journey activeStopId onStopSelect width={640} height={360} labels="named|none" />
 * Responsive: the SVG scales to its container's width.
 */
export function RouteSketch({ journey, activeStopId, onStopSelect, width = 640, height = 360, labels = 'named', className }) {
  const geo = useMemo(() => {
    if (!journey?.stops?.length) return null
    const pad = 36
    const P = projector(journey.stops, width, height, pad)
    const pts = Object.fromEntries(journey.stops.map((st) => [st.id, P(st.lat, st.lng)]))
    const legs = journey.legs.map((l) => {
      const a = journey.stops.find((x) => x.id === l.from), b = journey.stops.find((x) => x.id === l.to)
      const line = l.arc ? greatCircle(a, b, 24).map(([lng, lat]) => P(lat, lng)) : [pts[l.from], pts[l.to]]
      return { ...l, d: 'M' + line.map((p) => p.map((v) => v.toFixed(1)).join(',')).join('L') }
    })
    // labels: right, left, above or below the disc, skipped when they would still collide
    const boxes = journey.stops.map((st) => {
      const [x, y] = pts[st.id]
      const r = st.kind === 'named' ? 13 : 6
      return [x - r, y - r, x + r, y + r]
    })
    const hit = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]
    const labelsAt = {}
    for (const st of journey.stops) {
      if (labels !== 'named' || st.kind !== 'named' || !st.name) continue
      const text = st.name.length > 26 ? `${st.name.slice(0, 25)}…` : st.name
      const w = text.length * 6.7 + 4, h = 15
      const [x, y] = pts[st.id]
      const tries = [
        { tx: x + 18, ty: y + 4, anchor: 'start', box: [x + 16, y - 9, x + 16 + w, y - 9 + h] },
        { tx: x - 18, ty: y + 4, anchor: 'end', box: [x - 16 - w, y - 9, x - 16, y - 9 + h] },
        { tx: x, ty: y - 19, anchor: 'middle', box: [x - w / 2, y - 32, x + w / 2, y - 32 + h] },
        { tx: x, ty: y + 28, anchor: 'middle', box: [x - w / 2, y + 15, x + w / 2, y + 15 + h] },
      ]
      const ok = tries.find((t) => t.box[0] >= 2 && t.box[2] <= width - 2 && t.box[1] >= 2 && t.box[3] <= height - 2 && !boxes.some((b) => hit(b, t.box)))
      if (ok) {
        boxes.push(ok.box)
        labelsAt[st.id] = { ...ok, text }
      }
    }
    return { pts, legs, labelsAt }
  }, [journey, width, height, labels])
  if (!geo) return null
  const named = journey.stops.filter((st) => st.kind === 'named')
  return (
    <svg className={`${s.sketch} ${className || ''}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Route sketch: ${named.length} stops over ${journey.days.length} ${journey.days.length === 1 ? 'day' : 'days'}`} data-ui="route-sketch">
      <defs>
        <pattern id="ofsa-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke={COLOR.ink} strokeOpacity=".06" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill={COLOR.paper} />
      <rect width={width} height={height} fill="url(#ofsa-grid)" />
      {geo.legs.map((l) => (
        <path key={`c${l.id}`} d={l.d} fill="none" stroke={COLOR.ink} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {geo.legs.map((l) => (
        <path key={l.id} d={l.d} fill="none" stroke={dayColor(l.dayIndex)} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {journey.stops.map((st) => {
        const [x, y] = geo.pts[st.id]
        const active = st.id === activeStopId
        const r = st.kind === 'named' ? (active ? 15 : 12) : 5
        const body = (
          <>
            <circle cx={x} cy={y} r={r} fill={st.kind === 'named' ? (active ? COLOR.ink : COLOR.white) : dayColor(st.dayIndex)} stroke={COLOR.ink} strokeWidth="2" />
            {st.n != null ? (
              <text x={x} y={y + 4} textAnchor="middle" fontFamily={FONT.mono} fontSize="11.5" fontWeight="500" fill={active ? COLOR.white : COLOR.ink}>
                {st.n}
              </text>
            ) : null}
            {geo.labelsAt[st.id] ? (
              <text x={geo.labelsAt[st.id].tx} y={geo.labelsAt[st.id].ty} textAnchor={geo.labelsAt[st.id].anchor} fontFamily={FONT.ui} fontSize="12.5" fontWeight="650" fill={COLOR.ink} stroke={COLOR.paper} strokeWidth="3" paintOrder="stroke">
                {geo.labelsAt[st.id].text}
              </text>
            ) : null}
          </>
        )
        if (!onStopSelect || st.kind !== 'named') return <g key={st.id}>{body}</g>
        return (
          <g key={st.id} className={s.hit} role="button" tabIndex={0} aria-label={`Stop ${st.n}: ${st.name || 'unnamed'}`} onClick={() => onStopSelect(st.id)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onStopSelect(st.id))}>
            <circle cx={x} cy={y} r="22" fill="transparent" />
            {body}
          </g>
        )
      })}
    </svg>
  )
}
