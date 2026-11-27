// The SVG route sketch (owner: MAP). PLAN-DAYLIGHT 3.6: the static level, the phone's
// inline strip, and the first paint while the live map loads.
// Stops projected on paper (equirectangular, corrected for latitude), the same gentle
// curves as the live map coloured by day over an ink casing, numbered discs with upright
// DM Mono digits and the day's colour as a ring. No map data, so no attribution is needed.
//   <RouteSketch journey activeStopId onStopSelect width height labels="named|none" />
//   dayColor(dayIndex)
// Sizes are in viewBox units, so pass a width close to the width it is shown at.
import { useId, useMemo } from 'react'
import { shortPlace } from '../lib/format.js'
import { COLOR, FONT } from '../styles/tokens.js'
import { dayColor } from './colors.js'
import { legLine } from './route.js'
import s from './RouteSketch.module.css'

export { dayColor }

function projector(points, w, h, pad) {
  const lats = points.map((p) => p[1]), lngs = points.map((p) => p[0])
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const k = Math.cos((midLat * Math.PI) / 180) || 1
  const x0 = Math.min(...lngs) * k, x1 = Math.max(...lngs) * k
  const y0 = Math.min(...lats), y1 = Math.max(...lats)
  const sx = (w - pad * 2) / Math.max(x1 - x0, 1e-6), sy = (h - pad * 2) / Math.max(y1 - y0, 1e-6)
  const sc = Math.min(sx, sy)
  const ox = (w - (x1 - x0) * sc) / 2, oy = (h - (y1 - y0) * sc) / 2
  return (lng, lat) => [ox + (lng * k - x0) * sc, h - (oy + (lat - y0) * sc)]
}

export function RouteSketch({ journey, activeStopId, onStopSelect, width = 640, height = 360, labels = 'named', mini = false, className }) {
  const uid = useId().replace(/:/g, '')
  const geo = useMemo(() => {
    if (!journey?.stops?.length) return null
    const small = width < 480
    // mini: a thumbnail of the route (the creation flow's summary): plain discs, no numbers or names
    const R = mini ? 6.5 : small ? 11 : 13
    const pad = mini ? 16 : small ? 30 : 40
    const lines = journey.legs.map((l) => ({ leg: l, line: legLine(journey, l) }))
    // fit the curves as well as the stops, so a bowed leg never leaves the paper
    const P = projector([...journey.stops.map((st) => [st.lng, st.lat]), ...lines.flatMap((x) => x.line)], width, height, pad)
    const pts = Object.fromEntries(journey.stops.map((st) => [st.id, P(st.lng, st.lat)]))
    // numbered discs that would sit on top of each other are eased apart
    const named = journey.stops.filter((st) => st.kind === 'named')
    for (let pass = 0; pass < 6; pass++) {
      for (let i = 0; i < named.length; i++) {
        for (let j = i + 1; j < named.length; j++) {
          const a = pts[named[i].id], b = pts[named[j].id]
          let dx = b[0] - a[0], dy = b[1] - a[1]
          const d = Math.hypot(dx, dy), min = R * 2 + 1
          if (d >= min) continue
          if (d < 0.5) {
            dx = 1
            dy = 0
          }
          const push = Math.min(R * 0.6, (min - d) / 2) / Math.max(d, 1)
          a[0] -= dx * push; a[1] -= dy * push
          b[0] += dx * push; b[1] += dy * push
        }
      }
    }
    const legs = lines.map(({ leg, line }) => ({ ...leg, d: 'M' + line.map(([lng, lat]) => P(lng, lat).map((v) => v.toFixed(1)).join(',')).join('L') }))
    // labels: right, left, above or below the disc, skipped when they would still collide
    const boxes = journey.stops.map((st) => {
      const [x, y] = pts[st.id]
      const r = st.kind === 'named' ? R + 2 : 6
      return [x - r, y - r, x + r, y + r]
    })
    const hit = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]
    const labelsAt = {}
    const fs = small ? 11.5 : 12.5
    for (const st of journey.stops) {
      if (labels !== 'named' || st.kind !== 'named' || !st.name) continue
      const short = shortPlace(st.name, 1)
      const text = short.length > 22 ? `${short.slice(0, 21)}…` : short
      const w = text.length * fs * 0.56 + 6, h = fs + 4
      const [x, y] = pts[st.id]
      const g = R + 6
      const tries = [
        { tx: x + g, ty: y + fs * 0.34, anchor: 'start', box: [x + g - 2, y - h / 2, x + g + w, y + h / 2] },
        { tx: x - g, ty: y + fs * 0.34, anchor: 'end', box: [x - g - w, y - h / 2, x - g + 2, y + h / 2] },
        { tx: x, ty: y - g - 2, anchor: 'middle', box: [x - w / 2, y - g - h, x + w / 2, y - g + 2] },
        { tx: x, ty: y + g + fs * 0.8, anchor: 'middle', box: [x - w / 2, y + g - 2, x + w / 2, y + g + h] },
      ]
      const ok = tries.find((t) => t.box[0] >= 3 && t.box[2] <= width - 3 && t.box[1] >= 3 && t.box[3] <= height - 3 && !boxes.some((b) => hit(b, t.box)))
      if (ok) {
        boxes.push(ok.box)
        labelsAt[st.id] = { ...ok, text }
      }
    }
    return { pts, legs, labelsAt, R, fs }
  }, [journey, width, height, labels, mini])
  if (!geo) return null
  const named = journey.stops.filter((st) => st.kind === 'named')
  const { R, fs } = geo
  return (
    <svg className={`${s.sketch} ${className || ''}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Route sketch: ${named.length} ${named.length === 1 ? 'stop' : 'stops'} over ${journey.days.length} ${journey.days.length === 1 ? 'day' : 'days'}`} data-ui="route-sketch">
      <defs>
        <pattern id={`g${uid}`} width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="11" cy="11" r="1.1" fill={COLOR.ink} fillOpacity=".14" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill={COLOR.paper} />
      <rect width={width} height={height} fill={`url(#g${uid})`} />
      {geo.legs.map((l) => (
        <path key={`c${l.id}`} d={l.d} fill="none" stroke={COLOR.ink} strokeWidth={mini ? 5.6 : 7.5} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {geo.legs.map((l) => (
        <path key={l.id} d={l.d} fill="none" stroke={dayColor(l.dayIndex)} strokeWidth={mini ? 3 : 3.6} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {journey.stops.map((st) => {
        const [x, y] = geo.pts[st.id]
        const active = st.id === activeStopId
        const isNamed = st.kind === 'named'
        const r = isNamed ? (active ? R + 3 : R) : 5.5
        const lab = geo.labelsAt[st.id]
        const body = (
          <>
            {isNamed && active ? <circle cx={x + 2} cy={y + 3} r={r} fill={COLOR.ink} /> : null}
            <circle cx={x} cy={y} r={r} fill={isNamed ? (active ? COLOR.ink : mini ? dayColor(st.dayIndex) : COLOR.white) : dayColor(st.dayIndex)} stroke={COLOR.ink} strokeWidth="2" />
            {isNamed && !active && !mini ? <circle cx={x} cy={y} r={r - 2.6} fill="none" stroke={dayColor(st.dayIndex)} strokeWidth="2.6" /> : null}
            {st.n != null && !mini ? (
              <text x={x} y={y + (R > 11 ? 4.2 : 3.8)} textAnchor="middle" fontFamily={FONT.mono} fontSize={R > 11 ? 11.5 : 10.5} fontWeight="500" fill={active ? COLOR.white : COLOR.ink}>
                {st.n}
              </text>
            ) : null}
            {lab ? (
              <text x={lab.tx} y={lab.ty} textAnchor={lab.anchor} fontFamily={FONT.ui} fontSize={fs} fontWeight="700" fill={COLOR.ink} stroke={COLOR.paper} strokeWidth="3.5" strokeLinejoin="round" paintOrder="stroke">
                {lab.text}
              </text>
            ) : null}
          </>
        )
        if (!onStopSelect || !isNamed) return <g key={st.id}>{body}</g>
        return (
          <g key={st.id} className={s.hit} role="button" tabIndex={0} aria-label={`Stop ${st.n}: ${shortPlace(st.name, 1) || 'unnamed'}`} onClick={() => onStopSelect(st.id)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onStopSelect(st.id))}>
            <circle cx={x} cy={y} r="22" fill="transparent" />
            {body}
          </g>
        )
      })}
    </svg>
  )
}
