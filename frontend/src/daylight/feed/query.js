// The Stories page's state, kept in the query string so Back and a shared link keep the
// view and the filters (owner: FEED). Pure functions plus one hook.
//
//   ?view=feed|calendar|timeline     (map belongs to map/WorldPage through the seam)
//   ?order=posted                    default: the date it happened
//   ?dir=old                         default: newest first
//   ?who=following|mine              default: everyone
//   ?people=tom,ruth                 authors
//   ?cat=Vacation,Birthday           stored category values
//   ?from=2026-06-01&to=2026-08-31   inclusive, by the date it happened
//   ?group=category                  default: by month
//   ?year=2026  ?month=2026-06       calendar position
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseBackendDate, monthKey, monthLabel } from '../lib/format.js'
import { CATEGORY_WASH } from '../styles/tokens.js'

export const VIEWS = ['feed', 'calendar', 'timeline']

/** The app's eight categories, in the order the app lists them, with display names. */
export const CATEGORIES = [
  { value: 'Birthday', label: 'Birthdays' },
  { value: 'Anniversary', label: 'Anniversaries' },
  { value: 'Vacation', label: 'Vacations' },
  { value: 'Family Gathering', label: 'Family Gatherings' },
  { value: 'Holiday', label: 'Holidays' },
  { value: 'Project', label: 'Projects' },
  { value: 'Daily Life', label: 'Daily Life' },
  { value: 'Milestone', label: 'Milestones' },
]
const CAT_INDEX = new Map(CATEGORIES.map((c, i) => [c.value, i]))

/** {value, label, wash, custom} for any stored category, including people's own. */
export function categoryInfo(value) {
  if (!value) return { value: '', label: 'No category', wash: null, custom: true }
  const known = CATEGORIES.find((c) => c.value === value)
  return { value, label: known ? known.label : value, wash: CATEGORY_WASH[value] || null, custom: !known }
}

const list = (v) => (v ? v.split(',').map((x) => x.trim()).filter(Boolean) : [])
const isDay = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : '')

/** Reads the query string into a plain object with defaults. */
export function readQuery(sp) {
  const view = sp.get('view')
  return {
    view: VIEWS.includes(view) ? view : 'feed',
    order: sp.get('order') === 'posted' ? 'posted' : 'happened',
    dir: sp.get('dir') === 'old' ? 'old' : 'new',
    who: ['following', 'mine'].includes(sp.get('who')) ? sp.get('who') : 'all',
    people: list(sp.get('people')),
    cats: list(sp.get('cat')),
    from: isDay(sp.get('from')),
    to: isDay(sp.get('to')),
    group: sp.get('group') === 'category' ? 'category' : 'month',
    year: /^\d{4}$/.test(sp.get('year') || '') ? Number(sp.get('year')) : null,
    month: /^\d{4}-\d{2}$/.test(sp.get('month') || '') ? sp.get('month') : null,
  }
}

const DEFAULTS = { view: 'feed', order: 'happened', dir: 'new', who: 'all', group: 'month' }
const KEYS = { view: 'view', order: 'order', dir: 'dir', who: 'who', people: 'people', cats: 'cat', from: 'from', to: 'to', group: 'group', year: 'year', month: 'month' }

/** Writes a patch onto URLSearchParams, dropping defaults so URLs stay short. */
export function writeQuery(sp, patch) {
  const next = new URLSearchParams(sp)
  for (const [k, v] of Object.entries(patch)) {
    const key = KEYS[k]
    if (!key) continue
    const val = Array.isArray(v) ? v.join(',') : v == null ? '' : String(v)
    if (!val || DEFAULTS[k] === val) next.delete(key)
    else next.set(key, val)
  }
  return next
}

/**
 * useFeedQuery() -> [query, set(patch, {push})]
 * Filter changes replace the history entry (Back leaves the page, not the last chip);
 * a view change pushes one, so Back returns to the previous view.
 */
export function useFeedQuery() {
  const [sp, setSp] = useSearchParams()
  const q = useMemo(() => readQuery(sp), [sp])
  const set = useCallback(
    (patch, { push = false } = {}) => setSp((cur) => writeQuery(cur, patch), { replace: !push, preventScrollReset: true }),
    [setSp],
  )
  return [q, set]
}

/** How many filters (not view or arrangement) are on. */
export function activeCount(q) {
  return (q.who !== 'all' ? 1 : 0) + q.people.length + q.cats.length + (q.from || q.to ? 1 : 0)
}

export function clearedFilters() {
  return { who: 'all', people: [], cats: [], from: '', to: '' }
}

const startOf = (e) => parseBackendDate(e.start_date)
const endOf = (e) => parseBackendDate(e.end_date) || startOf(e)
export const orderDate = (e, order) => (order === 'posted' ? parseBackendDate(e.created_at) || startOf(e) : startOf(e))

/**
 * Applies the filters and the order to the loaded list. Muted people are already left
 * out by the server (privacy.py filter_events_for_feed).
 */
export function applyQuery(events, q, { me, followingSet } = {}) {
  const from = q.from ? parseBackendDate(q.from) : null
  const to = q.to ? parseBackendDate(`${q.to}T23:59:59`) : null
  const people = new Set(q.people)
  const cats = new Set(q.cats)
  const out = events.filter((e) => {
    if (q.who === 'mine' && e.author_username !== me) return false
    if (q.who === 'following' && !followingSet?.has(e.author_username)) return false
    if (people.size && !people.has(e.author_username)) return false
    if (cats.size && !cats.has(e.category || '')) return false
    if (from && (startOf(e) || 0) < from) return false
    if (to && (endOf(e) || 0) > to) return false
    return true
  })
  const sign = q.dir === 'old' ? -1 : 1
  out.sort((a, b) => sign * ((orderDate(b, q.order) || 0) - (orderDate(a, q.order) || 0)) || b.id - a.id)
  return out
}

/**
 * Sections for the stream: by month (of the date it happened, or posted) or by category.
 * -> [{key, label, kicker, items, wash}]
 */
export function groupStories(items, q) {
  const sections = []
  const byKey = new Map()
  for (const e of items) {
    let key, label, wash = null
    if (q.group === 'category') {
      const c = categoryInfo(e.category)
      key = `c:${c.value}`
      label = c.label
      wash = c.wash
    } else {
      const d = orderDate(e, q.order)
      key = `m:${monthKey(d) || 'none'}`
      label = d ? `${q.order === 'posted' ? 'Posted in ' : ''}${monthLabel(d)}` : 'No date'
    }
    if (!byKey.has(key)) {
      const sec = { key, label, wash, items: [] }
      byKey.set(key, sec)
      sections.push(sec)
    }
    byKey.get(key).items.push(e)
  }
  if (q.group === 'category') {
    // Biggest first; ties in the app's own category order; people's own categories after.
    sections.sort((a, b) => b.items.length - a.items.length || (CAT_INDEX.get(a.items[0].category) ?? 99) - (CAT_INDEX.get(b.items[0].category) ?? 99))
  }
  return sections
}

/**
 * Lays sections out in rows for desktop: the newest is always full width; two single-story
 * sections in a row pair up side by side, so a quiet stretch of the year still reads as a
 * spread rather than a column of lone cards.
 */
export function rowsOf(sections) {
  const rows = []
  for (let i = 0; i < sections.length; i++) {
    const a = sections[i], b = sections[i + 1]
    if (i > 0 && a.items.length === 1 && b && b.items.length === 1) {
      rows.push({ kind: 'pair', sections: [a, b] })
      i++
    } else rows.push({ kind: 'full', sections: [a] })
  }
  return rows
}

/** Categories worth offering as browse chips: those in the loaded list, plus any selected. */
export function categoriesIn(events, selected = []) {
  const seen = new Set(events.map((e) => e.category).filter(Boolean))
  selected.forEach((c) => seen.add(c))
  const known = CATEGORIES.filter((c) => seen.has(c.value)).map((c) => categoryInfo(c.value))
  const custom = [...seen].filter((v) => !CAT_INDEX.has(v)).sort().map(categoryInfo)
  return [...known, ...custom]
}

/** Audience tag worth printing on a card (Followers and Public go unsaid). */
export function audienceTag(level) {
  return { close_family: 'Close family', custom_group: 'Custom group', private: 'Private' }[level] || null
}
