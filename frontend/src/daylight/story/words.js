// Small pure helpers for the story page (owner: STORY): wall-clock times, audience words,
// comment ages, the comment tree. American English, nothing invented.

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * The time on the watch where it happened. Marker and photo timestamps carry the place's
 * offset ("2026-06-16T10:15:00-06:00"); read as an instant they would print in the
 * reader's zone (an hour off for a Chicago reader of a Wyoming trip). A stop's time is
 * the local time there, so the offset is ignored here.
 */
export function wallDate(ts) {
  if (!ts) return null
  const m = String(ts).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
  if (!m) return null
  const [, y, mo, d, h, mi] = m
  return { y: +y, mo: +mo - 1, d: +d, h: h == null ? null : +h, mi: mi == null ? null : +mi, date: new Date(+y, +mo - 1, +d) }
}
export function wallTime(ts) {
  const w = wallDate(ts)
  if (!w || w.h == null) return ''
  return `${w.h % 12 || 12}:${String(w.mi).padStart(2, '0')} ${w.h < 12 ? 'AM' : 'PM'}`
}
/** "Tuesday, June 16" */
export function wallDay(ts) {
  const w = wallDate(ts)
  return w ? `${DAYS[w.date.getDay()]}, ${MONTHS[w.mo]} ${w.d}` : ''
}

/** Who the story is shared with, in words, from privacy_level. */
export function audienceWords(level, authorFirst, isAuthor) {
  const who = isAuthor ? 'your' : authorFirst ? `${authorFirst}'s` : 'their'
  switch (level) {
    case 'public':
      return 'Public'
    case 'followers':
      return `${who[0].toUpperCase()}${who.slice(1)} followers`
    case 'close_family':
      return 'Close family'
    case 'custom_group':
      return 'A chosen group'
    case 'private':
      return isAuthor ? 'Only you' : `Only ${authorFirst || 'the author'}`
    default:
      return null
  }
}

export const firstName = (full, username) => String(full || username || '').trim().split(/\s+/)[0] || ''

/** "Just now", "12 min ago", "5 hours ago", "3 days ago", "Jun 22", "Jun 22, 2025". */
export function ago(iso, now = new Date()) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const s = (now - d) / 1000
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) {
    const h = Math.floor(s / 3600)
    return `${h} ${h === 1 ? 'hour' : 'hours'} ago`
  }
  if (s < 7 * 86400) {
    const n = Math.floor(s / 86400)
    return `${n} ${n === 1 ? 'day' : 'days'} ago`
  }
  return `${MON[d.getMonth()]} ${d.getDate()}${d.getFullYear() === now.getFullYear() ? '' : `, ${d.getFullYear()}`}`
}

/** "December 1" from a naive or offset date string. */
export function longDay(iso) {
  const w = wallDate(iso)
  return w ? `${MONTHS[w.mo]} ${w.d}` : ''
}

/** Flat comments (parent_id) -> roots with replies, in the API's order. */
export function commentTree(flat) {
  const map = new Map()
  for (const c of flat || []) map.set(c.id, { ...c, replies: [] })
  const roots = []
  for (const c of map.values()) {
    const p = c.parent_id != null ? map.get(c.parent_id) : null
    if (p) p.replies.push(c)
    else roots.push(c)
  }
  return roots
}

/** "Day 3: Jenny Lake" -> {eyebrow: 'Day 3', title: 'Jenny Lake'}; anything else is all title. */
export function splitChapter(text) {
  const m = String(text || '').match(/^\s*(day\s+\d+|chapter\s+\d+|part\s+\d+)\s*[:.\-–—]\s*(.+)$/i)
  return m ? { eyebrow: m[1].replace(/^./, (c) => c.toUpperCase()), title: m[2] } : { eyebrow: null, title: text }
}

/** Drops the pin emoji the editor writes into marker spans (drawn icons only). */
export const stripPinEmoji = (html) => String(html || '').replace(/📍️?\s*/g, '')

/** Bytes-free name for a place: "Hidden Falls, Wyoming" -> "Hidden Falls". */
export const placeHead = (name) => String(name || '').split(',')[0].trim()
