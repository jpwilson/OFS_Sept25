// The admin page's state in the URL (owner: ADMIN). docs/app/ADMIN-ANALYTICS.md "State".
//   ?range=7d&interval=day&tab=members&sort=last_active&order=desc
// Search text never goes in the URL. The last range is kept in localStorage. Pure, apart
// from the two storage helpers (which never throw).

export const RANGES = [
  { value: '24h', label: '24h', long: 'the last 24 hours', intervals: ['hour'] },
  { value: '7d', label: '7d', long: 'the last 7 days', intervals: ['day', 'hour'] },
  { value: '30d', label: '30d', long: 'the last 30 days', intervals: ['day'] },
  { value: '90d', label: '90d', long: 'the last 90 days', intervals: ['day', 'month'] },
  { value: 'all', label: 'All', long: 'all time', intervals: ['month', 'day'] },
]
export const INTERVAL_LABEL = { hour: 'Hourly', day: 'Daily', month: 'Monthly' }
export const TABS = ['overview', 'members', 'tools']
export const SORTS = [
  { value: 'joined', label: 'Joined' },
  { value: 'last_active', label: 'Last active' },
  { value: 'last_sign_in', label: 'Last sign-in' },
  { value: 'stories', label: 'Stories' },
  { value: 'name', label: 'Name' },
]
const RANGE_KEY = 'ofs.admin.range'
const DEFAULT_RANGE = '7d'

export const rangeOf = (r) => RANGES.find((x) => x.value === r) || RANGES.find((x) => x.value === DEFAULT_RANGE)
/** The intervals a range allows, default first. */
export const intervalsFor = (r) => rangeOf(r).intervals
/** An interval the range does not allow falls back to the range's default (as the server does). */
export const intervalFor = (r, i) => (intervalsFor(r).includes(i) ? i : intervalsFor(r)[0])

/** URLSearchParams (or a string) -> {range, interval, tab, sort, order} */
export function readQuery(search, storedRange = null) {
  const q = new URLSearchParams(search)
  const range = rangeOf(q.get('range') || storedRange).value
  return {
    range,
    interval: intervalFor(range, q.get('interval')),
    tab: TABS.includes(q.get('tab')) ? q.get('tab') : 'overview',
    sort: SORTS.some((s) => s.value === q.get('sort')) ? q.get('sort') : 'joined',
    order: q.get('order') === 'asc' ? 'asc' : 'desc',
  }
}

/** The query string for a state, leaving defaults out (so /admin stays /admin). Keeps unrelated params. */
export function writeQuery(state, search = '') {
  const q = new URLSearchParams(search)
  const put = (k, v, dflt) => (v == null || v === dflt ? q.delete(k) : q.set(k, v))
  put('range', state.range, null)
  put('interval', state.interval, intervalsFor(state.range)[0])
  put('tab', state.tab, 'overview')
  put('sort', state.sort, 'joined')
  put('order', state.order, 'desc')
  const s = q.toString()
  return s ? `?${s}` : ''
}

export function storedRange() {
  try {
    return localStorage.getItem(RANGE_KEY)
  } catch {
    return null
  }
}
export function storeRange(r) {
  try {
    localStorage.setItem(RANGE_KEY, r)
  } catch {
    /* private mode: the range is simply not remembered */
  }
}

// ---------------------------------------------------------------- members filters
export const FILTERS = [
  { key: 'method', label: 'Signed up with', options: [['email', 'Email'], ['google', 'Google'], ['legacy', 'Legacy']] },
  { key: 'source', label: 'Came from', options: [['invited', 'Invited'], ['organic', 'Found us']] },
  { key: 'plan', label: 'Plan', options: [['trial', 'Trial'], ['trial_ended', 'Trial ended'], ['paid', 'Paid'], ['canceled', 'Canceled'], ['viewer', 'Viewer'], ['legacy', 'Legacy']] },
  { key: 'activity', label: 'Activity', options: [['active_7d', 'Active this week'], ['quiet_30d', 'Quiet 30 days']] },
  { key: 'stories', label: 'Stories', options: [['has', 'Has stories'], ['none', 'No stories']] },
  { key: 'confirmed', label: 'Email', options: [[true, 'Confirmed'], [false, 'Not confirmed']] },
  { key: 'joined', label: 'Joined', options: [['24h', 'Last 24h'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['90d', 'Last 90 days']] },
]
export const EMPTY_FILTERS = { method: null, source: null, plan: null, activity: null, stories: null, confirmed: null, joined: 'all', include_staff: false }

/** [{key, value, label}] for the removable chips (the default "joined: all" and "no staff" are not filters). */
export function activeFilters(f) {
  const out = []
  for (const g of FILTERS) {
    const v = f[g.key]
    if (v == null || (g.key === 'joined' && v === 'all')) continue
    const opt = g.options.find(([x]) => x === v)
    if (opt) out.push({ key: g.key, value: v, label: g.key === 'confirmed' ? `Email ${opt[1].toLowerCase()}` : opt[1] })
  }
  if (f.include_staff) out.push({ key: 'include_staff', value: true, label: 'Staff included' })
  return out
}
export const clearFilter = (f, key) => ({ ...f, [key]: EMPTY_FILTERS[key] })

/** The POST /members body. */
export function membersBody({ q, filters, sort, order, page, pageSize }) {
  return {
    q: q?.trim() ? q.trim() : null,
    method: filters.method,
    source: filters.source,
    plan: filters.plan,
    activity: filters.activity,
    stories: filters.stories,
    confirmed: filters.confirmed,
    joined: filters.joined || 'all',
    include_staff: !!filters.include_staff,
    sort,
    order,
    page,
    page_size: pageSize,
  }
}

/** "1–25 of 132" */
export function pageLine(page, pageSize, total) {
  if (!total) return '0 of 0'
  const a = (page - 1) * pageSize + 1
  const b = Math.min(total, page * pageSize)
  return `${a}–${b} of ${total}`
}
