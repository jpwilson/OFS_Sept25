// Dates a family may know only in part (owner: FAMILY): history entries and the birth and death
// of someone without an account, where the year alone is often all anyone knows. Plain ESM,
// pure, so node --test runs it (dates.test.js). docs/app/FAMILY-NOTES.md "Page".
//
// A partial date is the server's pair: a YYYY-MM-DD string and a precision, 'day' | 'month' |
// 'year' (null means a full day). The server stores month precision as YYYY-MM-01 and year
// precision as YYYY-01-01; these read the pair and never invent the parts it lacks.
//
//   partialLabel(ymd, precision)   "March 3, 1952" | "March 1952" | "1952" | null
//   stampParts(ymd, precision)     the history list's mono column: {head: 'MAR 3', year: '1952'}
//   fromPartial(ymd, precision)    the form's parts: {year: '1952', month: '3', day: ''}
//   toPartial({year, month, day})  back to the pair: {ymd, precision}, empty {ymd: null, ...} or {error}
//   bornLine(...) / diedLine(...)  the person sheet's sentences
//   audienceLine(p, you)           who can read a note, in words with no gender
//   cmpHistory / cmpNotes          the server's orders, for lists changed on the page
import { possessive } from './words.js'

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const YMD = /^(\d{4})-(\d{2})-(\d{2})/
const pad = (n) => String(n).padStart(2, '0')

function parts(ymd) {
  const m = YMD.exec(ymd || '')
  if (!m) return null
  const month = +m[2]
  const day = +m[3]
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return { year: m[1], month, day }
}

/** "March 3, 1952" (a day, or no precision), "March 1952", "1952"; null when there is no date. */
export function partialLabel(ymd, precision) {
  const d = parts(ymd)
  if (!d) return null
  if (precision === 'year') return d.year
  if (precision === 'month') return `${MONTHS[d.month - 1]} ${d.year}`
  return `${MONTHS[d.month - 1]} ${d.day}, ${d.year}`
}

/** The history list's date column: {head: 'MAR 3' | 'MAR' | '', year: '1952'}, or {head: 'UNDATED', year: ''}. */
export function stampParts(ymd, precision) {
  const d = parts(ymd)
  if (!d) return { head: 'UNDATED', year: '' }
  const mon = MONTHS[d.month - 1].slice(0, 3).toUpperCase()
  if (precision === 'year') return { head: '', year: d.year }
  if (precision === 'month') return { head: mon, year: d.year }
  return { head: `${mon} ${d.day}`, year: d.year }
}

/** The form's parts for a stored pair: {year, month, day} as strings, '' for what is not known. */
export function fromPartial(ymd, precision) {
  const d = parts(ymd)
  if (!d) return { year: '', month: '', day: '' }
  return {
    year: d.year,
    month: precision === 'year' ? '' : String(d.month),
    day: precision === 'year' || precision === 'month' ? '' : String(d.day),
  }
}

/** Days in a month (1-12) of a year; 31 when the year is not known yet. */
export function daysIn(year, month) {
  const y = /^\d{4}$/.test(String(year)) ? Number(year) : 2000
  return new Date(Date.UTC(y, Number(month), 0)).getUTCDate()
}

/**
 * The pair for what the form holds. The precision follows from what is filled in: a day makes
 * it a day, a month alone a month, the year alone a year. Nothing filled in: {ymd: null,
 * precision: null}. Something the server would refuse: {error} in words a person can act on.
 */
export function toPartial({ year = '', month = '', day = '' } = {}) {
  const y = String(year).trim()
  const mo = month ? Number(month) : 0
  const d = day ? Number(day) : 0
  if (!y && !mo && !d) return { ymd: null, precision: null }
  if (!y) return { error: 'Add the year. A year is enough on its own.' }
  if (!/^\d{4}$/.test(y)) return { error: 'Write the year with four digits, like 1952.' }
  if (d && !mo) return { error: 'Choose the month for that day.' }
  if (d && d > daysIn(y, mo)) return { error: `${MONTHS[mo - 1]} ${y} has ${daysIn(y, mo)} days.` }
  return { ymd: `${y}-${pad(mo || 1)}-${pad(d || 1)}`, precision: d ? 'day' : mo ? 'month' : 'year' }
}

/** Today as YYYY-MM-DD on this device's calendar (never toISOString: that is UTC). */
export function todayYmd(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** "Born March 3, 1952 in Cork.", "Born 1952.", "Born in Cork."; null when neither is known. */
export function bornLine(ymd, precision, place) {
  const when = partialLabel(ymd, precision)
  const where = String(place || '').trim()
  if (!when && !where) return null
  return `Born${when ? ` ${when}` : ''}${where ? ` in ${where}` : ''}.`
}

/** "Died 2019.", "Died June 2019."; null when not known. */
export function diedLine(ymd, precision) {
  const when = partialLabel(ymd, precision || 'day')
  return when ? `Died ${when}.` : null
}

/**
 * Who can read a note about this person (the server's rules in utils/family.py), never with a
 * gendered word. `p` is a person from arrange (kind 'user' | 'tag', first); `you` when it is you.
 */
export function audienceLine(p, you) {
  if (you) return 'You and your family on Our Family Socials can read this.'
  if (p?.kind === 'tag') return `You, your family, and anyone linked to ${p.first} can read this.`
  return `${p.first}, and ${possessive(p.first)} family on Our Family Socials, can read this.`
}

const cmpStr = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
/** History as the server orders it: dated entries oldest first, undated last; then written order. */
export function cmpHistory(a, b) {
  const ua = !a.happened_on, ub = !b.happened_on
  if (ua !== ub) return ua ? 1 : -1
  return cmpStr(a.happened_on || '', b.happened_on || '') || cmpStr(a.created_at || '', b.created_at || '') || a.id - b.id
}
/** Notes as the server orders them: newest first. */
export function cmpNotes(a, b) {
  return cmpStr(b.created_at || '', a.created_at || '') || b.id - a.id
}
