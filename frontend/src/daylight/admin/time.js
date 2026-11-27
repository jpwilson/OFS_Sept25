// Times on the admin page (owner: ADMIN). docs/app/ADMIN-ANALYTICS.md "Times".
// Every number on the page is counted in Chicago time by the server, so every label is
// written in Chicago time too, whatever zone the reader's phone is in. The server's times
// always carry Z or an offset; the client never re-buckets. Pure: tested in time.test.js
// and also used by sample.js (the sample server's windows).
export const TZ = 'America/Chicago'

const fmts = new Map()
function fmt(key, opts, tz = TZ) {
  const k = `${tz}|${key}`
  if (!fmts.has(k)) fmts.set(k, new Intl.DateTimeFormat('en-US', { timeZone: tz, ...opts }))
  return fmts.get(k)
}

const toDate = (x) => (x instanceof Date ? x : typeof x === 'number' ? new Date(x) : x ? new Date(x) : null)
const valid = (d) => d && !Number.isNaN(d.getTime())

/** The wall clock in `tz` at an instant: {y, mo (1-12), d, h (0-23), mi, s, wd (0 = Sunday)}. */
export function zoneParts(x, tz = TZ) {
  const d = toDate(x)
  const p = {}
  for (const { type, value } of fmt('parts', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short', hourCycle: 'h23' }, tz).formatToParts(d)) p[type] = value
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second, wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) }
}

/** Minutes `tz` is ahead of UTC at an instant (Chicago: -300 in summer, -360 in winter). */
export function zoneOffset(x, tz = TZ) {
  const d = toDate(x)
  const p = zoneParts(d, tz)
  const asUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s)
  return Math.round((asUtc - Math.floor(d.getTime() / 1000) * 1000) / 60000)
}

/** "2026-11-21T00:00:00-06:00": an instant written as the wall clock in `tz` with its offset. */
export function isoInZone(x, tz = TZ) {
  const d = toDate(x)
  const p = zoneParts(d, tz)
  const off = zoneOffset(d, tz)
  const pad = (n, w = 2) => String(Math.abs(n)).padStart(w, '0')
  const sign = off < 0 ? '-' : '+'
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`
}

/** The instant of a wall-clock time in `tz` (midnight by default). Days and months roll over (d = 0, mo = 13). */
export function zoneTime(y, mo, d, h = 0, tz = TZ) {
  const guess = Date.UTC(y, mo - 1, d, h)
  // two passes settle the offset, also on the days the clocks change
  let t = guess - zoneOffset(guess, tz) * 60000
  t = guess - zoneOffset(t, tz) * 60000
  return new Date(t)
}

const lower = (t) => t.replace(/ | /g, ' ').replace(/\b(AM|PM)\b/g, (m) => m.toLowerCase())

/** "2:05 pm CT": when the numbers were counted. */
export function asOf(x) {
  const d = toDate(x)
  if (!valid(d)) return ''
  return `${lower(fmt('asof', { hour: 'numeric', minute: '2-digit' }).format(d))} CT`
}

/** The zone's own short name at an instant: "CST" or "CDT" (keeps the two 1 AM hours of the fall-back apart). */
export function zoneName(x) {
  const d = toDate(x)
  return fmt('zone', { timeZoneName: 'short' }).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value || 'CT'
}

/** A bucket, written in full for the readout over a chart: "Wed, Nov 26", "Nov 26, 2 pm CST", "November 2026". */
export function bucketLabel(t, interval) {
  const d = toDate(t)
  if (!valid(d)) return ''
  if (interval === 'month') return fmt('month-long', { month: 'long', year: 'numeric' }).format(d)
  if (interval === 'hour') return `${fmt('hour-day', { month: 'short', day: 'numeric' }).format(d)}, ${lower(fmt('hour', { hour: 'numeric' }).format(d))} ${zoneName(d)}`
  return fmt('day-long', { weekday: 'short', month: 'short', day: 'numeric' }).format(d)
}

/** A bucket on the x-axis: "Nov 26", "2 pm", "Nov". With `withDay`, an hour also says its day ("Nov 26, 2 pm"). */
export function tickLabel(t, interval, { withDay } = {}) {
  const d = toDate(t)
  if (!valid(d)) return ''
  if (interval === 'month') {
    const p = zoneParts(d)
    return p.mo === 1 ? String(p.y) : fmt('month-short', { month: 'short' }).format(d)
  }
  if (interval === 'hour') {
    const h = lower(fmt('hour', { hour: 'numeric' }).format(d))
    return withDay ? `${fmt('hour-day', { month: 'short', day: 'numeric' }).format(d)}, ${h}` : h
  }
  return fmt('hour-day', { month: 'short', day: 'numeric' }).format(d)
}

/** "Nov 27, 2026" */
export function dayLabel(x) {
  const d = toDate(x)
  if (!valid(d)) return ''
  return fmt('day', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
}

/** "Nov 27, 2:05 pm" */
export function stamp(x) {
  const d = toDate(x)
  if (!valid(d)) return ''
  return `${fmt('hour-day', { month: 'short', day: 'numeric' }).format(d)}, ${lower(fmt('asof', { hour: 'numeric', minute: '2-digit' }).format(d))}`
}

/** "just now", "20m ago", "2h ago", "3d ago", then the day ("Nov 3, 2026"). Null for no time. */
export function ago(x, now = Date.now()) {
  const d = toDate(x)
  if (!valid(d)) return null
  const s = Math.max(0, (toDate(now).getTime() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`
  return dayLabel(d)
}
