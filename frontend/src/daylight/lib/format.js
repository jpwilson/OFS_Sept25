// Dates, places and reading time (owner: F0). Plain functions; American English.
// No toISOString anywhere: dates from the backend are naive wall-clock strings.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MON = MONTHS.map((m) => m.slice(0, 3))
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * parseBackendDate(iso) -> Date | null
 * A naive string ("2026-06-14T10:30:00", "2026-06-14") is local wall time: the time the
 * person saw on their watch, which is what the app stores (the same rule as
 * OFS_iOS/App/Theme.swift). A string with Z or an offset is an instant.
 */
export function parseBackendDate(iso) {
  if (iso == null || iso === '') return null
  if (iso instanceof Date) return isNaN(iso) ? null : iso
  const s = String(iso).trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/)
  if (m) {
    const [, y, mo, d, h = '0', mi = '0', se = '0'] = m
    return new Date(+y, +mo - 1, +d, +h, +mi, +se)
  }
  const t = new Date(s)
  return isNaN(t) ? null : t
}

/** "2026-06-14" from a Date, in local time. */
export function localDay(date) {
  const d = parseBackendDate(date)
  if (!d) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "2026-06-14T09:26:00" (naive local), the format the server parses for marker timestamps. */
export function toLocalISO(date) {
  const d = parseBackendDate(date)
  if (!d) return null
  const p = (n) => String(n).padStart(2, '0')
  return `${localDay(d)}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/**
 * dateRange(start, end, {short}) -> string
 *   same day        "June 14, 2026"            short "Jun 14" (this year) or "Jun 14, 2025"
 *   same month      "June 14 – 20, 2026"       short "Jun 14 – 20"
 *   same year       "June 28 – July 3, 2026"   short "Jun 28 – Jul 3"
 *   across years    "Dec 30, 2025 – Jan 2, 2026"
 * short drops the year when it is the current year.
 */
export function dateRange(start, end, { short = false } = {}) {
  const a = parseBackendDate(start)
  const b = parseBackendDate(end) || a
  if (!a) return ''
  const M = short ? MON : MONTHS
  const thisYear = new Date().getFullYear()
  const yr = (d) => (short && d.getFullYear() === thisYear ? '' : `, ${d.getFullYear()}`)
  const sameDay = localDay(a) === localDay(b)
  if (sameDay || b < a) return `${M[a.getMonth()]} ${a.getDate()}${yr(a)}`
  if (a.getFullYear() === b.getFullYear()) {
    if (a.getMonth() === b.getMonth()) return `${M[a.getMonth()]} ${a.getDate()} – ${b.getDate()}${yr(b)}`
    return `${M[a.getMonth()]} ${a.getDate()} – ${M[b.getMonth()]} ${b.getDate()}${yr(b)}`
  }
  return `${MON[a.getMonth()]} ${a.getDate()}, ${a.getFullYear()} – ${MON[b.getMonth()]} ${b.getDate()}, ${b.getFullYear()}`
}

/** "AUGUST 2026" style month key and label for grouping. */
export function monthKey(date) {
  const d = parseBackendDate(date)
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : null
}
export function monthLabel(date) {
  const d = parseBackendDate(date)
  return d ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : ''
}
/** "Monday, June 15" */
export function dayLabel(date) {
  const d = parseBackendDate(date)
  return d ? `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}` : ''
}
/** "9:26 AM" */
export function timeLabel(date) {
  const d = parseBackendDate(date)
  if (!d) return ''
  const h = d.getHours() % 12 || 12
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`
}
/** Number of calendar days a story spans (1 for a single day). */
export function daySpan(start, end) {
  const a = parseBackendDate(start), b = parseBackendDate(end) || a
  if (!a) return 0
  const d0 = new Date(a.getFullYear(), a.getMonth(), a.getDate()), d1 = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.max(1, Math.round((d1 - d0) / 86400000) + 1)
}

const DROP = /^(county|parish|borough|district|municipality|region|province|state of)\b|\b(county|parish|municipality)$/i
/**
 * shortPlace(name, parts = 2) -> string
 * "Jenny Lake, Teton County, Wyoming, United States" -> "Jenny Lake, Wyoming".
 * Drops counties, postcodes and bare numbers before taking the first `parts` pieces.
 */
export function shortPlace(name, parts = 2) {
  if (!name) return ''
  const bits = String(name)
    .split(',')
    .map((b) => b.trim())
    .filter((b) => b && !DROP.test(b) && !/^\d[\d\s-]*$/.test(b) && !/^[A-Z]{1,2}\d/.test(b))
  return bits.slice(0, Math.max(1, parts)).join(', ')
}

/**
 * readTime(html) -> whole minutes, at least 1. 230 words a minute, plus 4 seconds a photo.
 */
export function readTime(html) {
  if (!html) return 1
  const text = String(html).replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ')
  const words = text.split(/\s+/).filter(Boolean).length
  const media = (String(html).match(/<(img|video)\b/gi) || []).length
  return Math.max(1, Math.round(words / 230 + (media * 4) / 60))
}

/** "12 stories", "1 story" */
export function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}
