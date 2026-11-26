// The time on the watch where it happened (owner: MAP; the director folds this and the
// story page's wallTime() into lib/format.js at integration, so keep it small and apart).
// Marker and photo timestamps carry the place's offset ("2026-06-16T10:15:00-06:00").
// lib/format reads those as instants and prints them in the reader's zone, an hour late
// for a Chicago reader of a Wyoming trip. A stop's time is the local time there, so
// everything the map prints reads the clock from the string and ignores the offset.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** {y, mo, d, h, mi} read straight from the string, or null. h and mi are null for a bare date. */
export function wallParts(ts) {
  if (!ts) return null
  const m = String(ts).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
  if (!m) return null
  return { y: +m[1], mo: +m[2] - 1, d: +m[3], h: m[4] == null ? null : +m[4], mi: m[5] == null ? null : +m[5] }
}

/** "9:20 AM" at the place, or '' when the stamp has no time. */
export function wallTime(ts) {
  const w = wallParts(ts)
  if (!w || w.h == null) return ''
  return `${w.h % 12 || 12}:${String(w.mi).padStart(2, '0')} ${w.h < 12 ? 'AM' : 'PM'}`
}

/**
 * The trip day a stamp belongs to, at the place: a Date at local midnight. A photo at
 * 1:30am belongs to the evening before (the same 4am pivot as lib/geo.js tripDay and the
 * server's clustering).
 */
export function wallTripDate(ts, pivotHour = 4) {
  const w = wallParts(ts)
  if (!w) return null
  const d = new Date(w.y, w.mo, w.d)
  if (w.h != null && w.h < pivotHour) d.setDate(d.getDate() - 1)
  return d
}

/** "Tuesday, June 16" for the trip day of a stamp. */
export function wallDayLabel(ts) {
  const d = wallTripDate(ts)
  return d ? `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}` : ''
}
