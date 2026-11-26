// Who and what the world view shows (owner: MAP). Pure. SPEC decision 9: the default is
// "People I follow and me", because the feed lists every member's non-private stories.
// Filters live in the query string (who, person, cat, year), so Back keeps them.
import { parseBackendDate } from '../lib/format.js'

export const SCOPES = [
  { value: 'following', label: 'People I follow and me', short: 'People I follow and me' },
  { value: 'mine', label: 'Just me', short: 'Just me' },
  { value: 'everyone', label: 'Everyone', short: 'Everyone', hint: 'Every story you are able to see' },
]

export function readFilters(sp) {
  const who = sp.get('who')
  const year = Number(sp.get('year'))
  return {
    who: who === 'mine' || who === 'everyone' ? who : 'following',
    person: sp.get('person') || null,
    cat: sp.get('cat') || null,
    year: Number.isInteger(year) && year > 1900 ? year : null,
  }
}

/** A copy of `sp` with one filter changed (null or the default removes it). */
export function withFilter(sp, key, value) {
  const next = new URLSearchParams(sp)
  if (value == null || value === '' || (key === 'who' && value === 'following')) next.delete(key)
  else next.set(key, String(value))
  if (key !== 'story') next.delete('story')
  return next
}

export const activeCount = (f) => (f.who !== 'following' ? 1 : 0) + (f.person ? 1 : 0) + (f.cat ? 1 : 0) + (f.year ? 1 : 0)

const yearOf = (e) => parseBackendDate(e.start_date)?.getFullYear() ?? null

/** Stories in scope (who), before the person, category and year chips narrow them. */
export function inScope(events, who, { me, following = [], muted = [] } = {}) {
  const mutedNames = new Set(muted.map((m) => m.username).filter(Boolean))
  const mine = me?.username
  const followed = new Set(following.map((p) => p.username))
  return (events || []).filter((e) => {
    if (mutedNames.has(e.author_username)) return false
    if (who === 'mine') return e.author_username === mine
    if (who === 'following') return e.author_username === mine || followed.has(e.author_username)
    return true
  })
}

export function applyFilters(scoped, f) {
  return scoped.filter((e) => (!f.person || e.author_username === f.person) && (!f.cat || e.category === f.cat) && (!f.year || yearOf(e) === f.year))
}

/** The chips worth offering: only people, categories and years that the scope contains. */
export function facets(scoped, faceFor) {
  const people = new Map(), cats = new Map(), years = new Map()
  for (const e of scoped) {
    if (e.author_username) {
      const p = people.get(e.author_username) || { ...(faceFor?.(e.author_username, e.author_full_name) || { username: e.author_username, name: e.author_full_name || e.author_username }), count: 0 }
      p.count++
      people.set(e.author_username, p)
    }
    if (e.category) cats.set(e.category, (cats.get(e.category) || 0) + 1)
    const y = yearOf(e)
    if (y) years.set(y, (years.get(y) || 0) + 1)
  }
  return {
    people: [...people.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    cats: [...cats.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    years: [...years.keys()].sort((a, b) => b - a),
  }
}

export const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || ''

/** "People I follow and me", or what narrows it: "Tom · Vacation · 2026". */
export function filterSummary(f, faceFor) {
  const bits = []
  if (f.person) bits.push(firstName(faceFor?.(f.person)?.name) || f.person)
  if (f.cat) bits.push(f.cat)
  if (f.year) bits.push(String(f.year))
  if (bits.length) return bits.join(' · ')
  return SCOPES.find((s) => s.value === f.who).short
}
