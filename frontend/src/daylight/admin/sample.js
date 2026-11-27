// The admin routes in sample mode (owner: ADMIN). docs/app/ADMIN-ANALYTICS.md "Sample mode".
// Pure ESM, loaded by dev/sampleApi.js (dev server) and by scripts/daylight/check-contract.mjs,
// which compares every answer here with scripts/daylight/fixtures/admin-contract.json.
//
//   GET  /admin/analytics/overview?range&interval&include_staff
//   POST /admin/analytics/members          (body as the spec)
//   GET  /admin/analytics/unfinished?range
//   GET  /admin/analytics/visitors?range&interval&include_staff
//   GET  /admin/stats, /admin/demo-account, /admin/settings/ai-model; PUT ai-model, demo-password
//        (for the Tools tab: the classic dashboard)
//   /__fx/admin-posthog?on=0|1|fail        visitors not set up, set up, or PostHog failing
//   /__fx/admin-state?overview=ok|404|error|noauth|sessions|empty&delay=ms
//                                          the page's other states (404: the server is older)
// A request may carry __posthog=0|1|fail or __overview=<mode> to set them for itself only
// (the overlap sweep rewrites one page's requests, so viewports run side by side).
//
// Deterministic: a seeded generator makes the same members, sign-ins and visitors every
// time, and "now" is the sample clock, 26 November 2026 at noon in Chicago. The story it
// tells: a small family site for a year, then a post on X on the evening of 25 November.
import { TZ, isoInZone, zoneParts, zoneTime } from './time.js'

export const SAMPLE_NOW = Date.parse('2026-11-26T18:00:00Z') // noon in Chicago
const H = 3600e3
const D = 24 * H

// ---------------------------------------------------------------- seeded generator
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = (r, list) => list[Math.floor(r() * list.length)]
const hash = (n) => {
  let x = (n * 2654435761) >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296
}

const FIRST = ['Ava', 'Ben', 'Cara', 'Dev', 'Ella', 'Felix', 'Gina', 'Hugo', 'Iris', 'Jack', 'Lena', 'Milo', 'Nora', 'Owen', 'Pia', 'Quinn', 'Rosa', 'Sean', 'Tara', 'Uma', 'Vic', 'Wes', 'Yara', 'Zoe', 'Abe', 'Bea', 'Cole', 'Dina', 'Eli', 'Faye', 'Gus', 'Hana']
const LAST = ['Adams', 'Brooks', 'Chen', 'Diaz', 'Evans', 'Fox', 'Garcia', 'Hughes', 'Ito', 'Jensen', 'Khan', 'Lopez', 'Morris', 'Novak', 'Ortiz', 'Park', 'Reyes', 'Shah', 'Tran', 'Vega', 'Webb', 'Young']

// ---------------------------------------------------------------- the sample's people
/**
 * The members (users rows, each with its Supabase account unless legacy), the accounts that
 * never made a profile, and every sign-in event. Built once per sample state.
 */
export function world(st) {
  if (st.adminWorld) return st.adminWorld
  const r = rng(20261125)
  const users = []
  const accounts = [] // Supabase accounts with no profile
  const add = (u) => users.push(u)
  let nextId = 101

  const trialOf = (joined) => joined + 30 * D
  const planFor = (u, roll) => {
    if (u.legacy) return { state: 'legacy', tier: 'free', status: 'active', trial_ends_at: null }
    if (u.viewer) return { state: 'viewer', tier: 'free', status: 'active', trial_ends_at: null }
    if (roll < 0.16) return { state: 'paid', tier: roll < 0.05 ? 'family' : 'premium', status: 'active', trial_ends_at: new Date(trialOf(u.joined)).toISOString() }
    if (roll < 0.2) return { state: 'canceled', tier: 'premium', status: 'canceled', trial_ends_at: new Date(trialOf(u.joined)).toISOString() }
    const end = trialOf(u.joined)
    return { state: end > SAMPLE_NOW ? 'trial' : 'trial_ended', tier: 'free', status: end > SAMPLE_NOW ? 'trial' : 'expired', trial_ends_at: new Date(end).toISOString() }
  }

  // the family the sample already has (snapshot users), joined over the first week
  const cast = Object.entries(st.db.users)
  const castEngage = { maya: 0.75, tom: 0.55, ruth: 0.45, joe: 0.3, kate: 0.25, priya: 0.2, deb: 0.12 }
  const castGoogle = new Set(['tom', 'kate', 'priya', 'sam'])
  cast.forEach(([key, cu], i) => {
    const joined = Date.parse(cu.created_at) + i * 26 * H
    const stories = st.db.list.filter((e) => e.author_username === key).length
    const u = {
      id: cu.id, username: cu.username, display_name: cu.display_name || cu.full_name, full_name: cu.full_name, email: cu.email || `${key}@example.test`,
      avatar_url: cu.avatar_url || null, joined, method: castGoogle.has(key) ? 'google' : 'email', confirmed: true,
      invited_by: i === 0 ? null : i < 4 ? 1 : 2, engage: castEngage[key] ?? 0.08, stories, published: stories,
    }
    u.plan = i < 2 ? { state: 'paid', tier: 'family', status: 'active', trial_ends_at: new Date(trialOf(joined)).toISOString() } : planFor(u, 0.3 + hash(i) * 0.7)
    add(u)
  })

  const person = (joined, { method, invitedBy = null, engage, legacy = false }) => {
    const id = nextId++
    const first = FIRST[(id * 7) % FIRST.length]
    const last = LAST[(id * 11) % LAST.length]
    const username = `${first}${last}`.toLowerCase().slice(0, 10) + (id % 10)
    const u = {
      id, username, display_name: `${first} ${last}`, full_name: `${first} ${last}`, email: `${username}@example.test`, avatar_url: null,
      joined, method: legacy ? 'legacy' : method, confirmed: legacy ? null : method === 'google' || r() > 0.04, invited_by: invitedBy, engage, legacy,
      viewer: !!invitedBy && r() < 0.3,
    }
    const storyRoll = r()
    u.stories = engage > 0.2 && storyRoll < 0.75 ? 1 + Math.floor(r() * 6) : storyRoll < 0.15 ? 1 : 0
    u.published = u.stories ? Math.max(0, u.stories - (r() < 0.4 ? 1 : 0)) : 0
    u.plan = planFor(u, r())
    add(u)
    return u
  }
  const someone = () => (r() < 0.55 ? 1 + Math.floor(r() * 3) : users[Math.floor(r() * users.length)].id)

  // legacy members from before Supabase sign-in (no account there)
  for (let i = 0; i < 6; i++) person(Date.parse('2025-08-04T15:00:00Z') + i * 9 * D + r() * D, { engage: 0.03 + r() * 0.05, legacy: true })
  // a year of slow growth, mostly family invitations
  for (let i = 0; i < 82; i++) {
    const joined = Date.parse('2025-11-20T15:00:00Z') + Math.pow(r(), 0.8) * (Date.parse('2026-11-18T23:00:00Z') - Date.parse('2025-11-20T15:00:00Z'))
    const invited = r() < 0.55
    person(joined, { method: r() < 0.6 ? 'email' : 'google', invitedBy: invited ? someone() : null, engage: pick(r, [0.02, 0.05, 0.08, 0.15, 0.3, 0.5]) })
  }
  // the week before the post
  for (let i = 0; i < 8; i++) person(Date.parse('2026-11-19T16:00:00Z') + i * 18 * H + r() * 6 * H, { method: r() < 0.5 ? 'email' : 'google', invitedBy: r() < 0.5 ? someone() : null, engage: 0.3 })
  // the post on X, 25 November at about 7 pm Chicago (01:00Z on the 26th)
  const POST = Date.parse('2026-11-26T01:00:00Z')
  for (let i = 0; i < 24; i++) {
    const joined = POST + Math.pow(r(), 1.7) * (SAMPLE_NOW - 6 * 60e3 - POST)
    const u = person(joined, { method: r() < 0.6 ? 'google' : 'email', invitedBy: r() < 0.12 ? someone() : null, engage: 0.6 })
    u.stories = i < 3 ? 1 : 0
    u.published = i < 2 ? 1 : 0
  }
  // staff: the owner and the demo account (left out unless include_staff)
  add({ id: 900, username: 'owner', display_name: 'Site owner', full_name: 'Site owner', email: 'owner@example.test', avatar_url: null, joined: Date.parse('2025-10-30T15:00:00Z'), method: 'email', confirmed: true, invited_by: null, engage: 0.9, stories: 2, published: 2, staff: true, is_superuser: true, plan: { state: 'paid', tier: 'family', status: 'active', trial_ends_at: null } })
  add({ id: 901, username: 'demo', display_name: 'Demo account', full_name: 'Demo account', email: 'demo@example.test', avatar_url: null, joined: Date.parse('2025-11-10T15:00:00Z'), method: 'email', confirmed: true, invited_by: null, engage: 0.4, stories: 4, published: 4, staff: true, is_superuser: false, plan: { state: 'paid', tier: 'premium', status: 'active', trial_ends_at: null } })

  // accounts with no profile: where a broken sign-up shows
  const unfinished = [
    [POST + 0.4 * H, 'email', false, 'kim.sorensen'], [POST + 2.6 * H, 'google', true, 'ray.oduya'], [SAMPLE_NOW - 3.2 * H, 'email', false, 'lou.marchetti'],
    [Date.parse('2026-11-22T21:10:00Z'), 'email', true, 'dana.whit'], [Date.parse('2026-10-14T13:30:00Z'), 'email', false, 'pat.liu'], [Date.parse('2026-08-02T18:45:00Z'), 'google', true, 'mo.fernandes'],
  ]
  for (const [at, method, confirmed, name] of unfinished) accounts.push({ created: at, method, confirmed, email: `${name}@example.test` })
  // one account deleted in Supabase: never counted
  accounts.push({ created: POST + 1.1 * H, method: 'email', confirmed: true, email: 'gone@example.test', deleted: true })

  // sign-in events: a login when they join, then days they came back (token refreshes) and
  // the days they signed in again. Busier just after the post.
  const events = []
  for (const u of users) {
    if (u.legacy) {
      u.last_login = u.joined + (SAMPLE_NOW - u.joined) * (0.2 + hash(u.id) * 0.5)
      continue
    }
    const rr = rng(u.id * 7919)
    events.push({ at: u.joined + 9e3, actor: u.id, action: 'login', provider: u.method })
    for (let day = Math.floor(u.joined / D) + 1; day * D < SAMPLE_NOW; day++) {
      const boost = day * D > POST - D ? 1.6 : 1
      if (rr() > u.engage * boost) continue
      const at = day * D + (13 + rr() * 11) * H
      if (at > SAMPLE_NOW) continue
      events.push({ at, actor: u.id, action: rr() < 0.35 ? 'login' : 'token_refreshed', provider: u.method })
    }
  }
  for (const a of accounts) if (!a.deleted) events.push({ at: a.created + 9e3, actor: `acct:${a.email}`, action: 'login', provider: a.method })
  events.sort((a, b) => a.at - b.at)
  const lastBy = {}
  const lastLoginBy = {}
  for (const e of events) {
    lastBy[e.actor] = e.at
    if (e.action === 'login') lastLoginBy[e.actor] = e.at
  }
  for (const u of users) {
    if (u.legacy) continue
    u.last_sign_in = lastLoginBy[u.id] ?? null
    // users.last_login: written at most once an hour, so it can trail the latest event
    u.last_login = lastBy[u.id] != null ? Math.floor(lastBy[u.id] / H) * H : null
  }
  for (const u of users) u.last_active = Math.max(u.last_login ?? -Infinity, u.last_sign_in ?? -Infinity)
  for (const u of users) if (!Number.isFinite(u.last_active)) u.last_active = null

  st.adminWorld = { users, accounts, events, post: POST, firstCreated: Math.min(...users.map((u) => u.joined)) }
  return st.adminWorld
}

// ---------------------------------------------------------------- windows and buckets
const RANGE_INTERVALS = { '24h': ['hour'], '7d': ['day', 'hour'], '30d': ['day'], '90d': ['day', 'month'], all: ['month', 'day'] }
const DAYS = { '7d': 7, '30d': 30, '90d': 90 }

/** The server's window rules: {range, interval, start, end, buckets: [ms], tOf(i), indexOf(ms)}. */
export function resolveWindow(range, interval, now, firstCreated) {
  if (!RANGE_INTERVALS[range]) range = '7d'
  const allowed = RANGE_INTERVALS[range]
  if (!allowed.includes(interval)) interval = allowed[0]
  let start
  if (range === '24h') start = Math.floor(now / H) * H - 23 * H
  else if (range === 'all') start = firstCreated
  else {
    const p = zoneParts(now)
    start = zoneTime(p.y, p.mo, p.d - (DAYS[range] - 1)).getTime()
  }
  const buckets = []
  if (interval === 'hour') for (let t = Math.floor(start / H) * H; t <= now; t += H) buckets.push(t)
  else {
    const p = zoneParts(start)
    let t = interval === 'day' ? zoneTime(p.y, p.mo, p.d).getTime() : zoneTime(p.y, p.mo, 1).getTime()
    for (let i = 1; t <= now; i++) {
      buckets.push(t)
      t = interval === 'day' ? zoneTime(p.y, p.mo, p.d + i).getTime() : zoneTime(p.y, p.mo + i, 1).getTime()
    }
  }
  const indexOf = (ms) => {
    if (ms < start || ms > now) return -1
    let lo = 0, hi = buckets.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (buckets[mid] <= ms) lo = mid
      else hi = mid - 1
    }
    return buckets[lo] <= ms ? lo : -1
  }
  return { range, interval, start, end: now, buckets, tOf: (i) => isoInZone(buckets[i]), indexOf }
}

const iso = (ms) => (ms == null ? null : new Date(Math.floor(ms / 1000) * 1000).toISOString().replace('.000Z', 'Z'))

// ---------------------------------------------------------------- modes
function modes(st, q = {}) {
  const m = (st.adminMode ||= { posthog: '1', overview: 'ok', delay: 0 })
  return { posthog: q.__posthog ?? m.posthog, overview: q.__overview ?? m.overview, delay: Number(q.__delay ?? m.delay) || 0 }
}
const truthy = (v) => v === true || v === 'true' || v === '1'

function people(st, mode, includeStaff) {
  const w = world(st)
  let users = w.users.filter((u) => includeStaff || !u.staff)
  if (mode === 'empty') users = users.filter((u) => u.joined < SAMPLE_NOW - 400 * D)
  return { w, users, accounts: mode === 'empty' ? [] : w.accounts.filter((a) => !a.deleted) }
}

// ---------------------------------------------------------------- overview
export function overview(st, q = {}) {
  const md = modes(st, q)
  const auth = md.overview !== 'noauth'
  const viaSessions = md.overview === 'sessions'
  const { w, users, accounts } = people(st, md.overview, truthy(q.include_staff))
  const win = resolveWindow(q.range || '7d', q.interval, SAMPLE_NOW, w.firstCreated)
  const n = win.buckets.length
  const inWin = (ms) => ms != null && ms >= win.start && ms <= win.end

  // sign-ups: Supabase accounts started, and profiles made
  const zero = () => ({ started: auth ? 0 : null, profiles: 0, email: auth ? 0 : null, google: auth ? 0 : null, other: 0, invited: 0, organic: 0 })
  const sSeries = Array.from({ length: n }, zero)
  const sTot = zero()
  const startedOf = (ms) => {
    const i = win.indexOf(ms)
    if (i < 0) return
    sSeries[i].started++
    sTot.started++
  }
  if (auth) {
    for (const u of users) if (!u.legacy) startedOf(u.joined - 8e3)
    for (const a of accounts) startedOf(a.created)
  }
  for (const u of users) {
    const i = win.indexOf(u.joined)
    if (i < 0) continue
    const method = !auth ? 'other' : u.method === 'legacy' ? 'other' : u.method
    for (const o of [sSeries[i], sTot]) {
      o.profiles++
      if (o[method] != null) o[method]++
      else o.other++
      o[u.invited_by ? 'invited' : 'organic']++
    }
  }

  // the funnel: accounts made in the range, and how far each has got by now
  const steps = () => ({ accounts: auth ? 0 : null, confirmed: auth ? 0 : null, profiles: 0, with_story: 0, with_published: 0 })
  const all = steps()
  const byMethod = { email: steps(), google: steps() }
  const bump = (o, f) => {
    if (o.accounts != null) o.accounts++
    if (o.confirmed != null && f.confirmed) o.confirmed++
    if (f.profile) o.profiles++
    if (f.stories) o.with_story++
    if (f.published) o.with_published++
  }
  const cohort = []
  for (const u of users) if (inWin(u.joined) && (!auth || !u.legacy)) cohort.push({ method: u.method, confirmed: u.confirmed, profile: true, stories: u.stories > 0, published: u.published > 0 })
  if (auth) for (const a of accounts) if (inWin(a.created)) cohort.push({ method: a.method, confirmed: a.confirmed, profile: false })
  for (const f of cohort) {
    bump(all, f)
    if (byMethod[f.method]) bump(byMethod[f.method], f)
  }

  // sign-ins
  const userIds = new Set(users.map((u) => u.id))
  const counted = (e) => userIds.has(e.actor) || (typeof e.actor === 'string' && md.overview !== 'empty')
  const iSeries = Array.from({ length: n }, () => (auth ? { signins: 0, members: 0, google: 0, email: 0, active: viaSessions ? null : 0 } : { signins: null, members: null, google: null, email: null, active: null }))
  const seen = Array.from({ length: n }, () => ({ members: new Set(), active: new Set() }))
  const totMembers = new Set(), totActive = new Set()
  let totSignins = 0
  if (auth) {
    for (const e of w.events) {
      if (!counted(e)) continue
      const i = win.indexOf(e.at)
      if (i < 0) continue
      // sessions keep only people still signed in: about one in five has since signed out
      if (viaSessions && (e.action !== 'login' || hash(Math.floor(e.at / 1000)) < 0.2)) continue
      seen[i].active.add(e.actor)
      totActive.add(e.actor)
      if (e.action !== 'login') continue
      const b = iSeries[i]
      b.signins++
      totSignins++
      if (b[e.provider] != null) b[e.provider]++
      seen[i].members.add(e.actor)
      totMembers.add(e.actor)
    }
    iSeries.forEach((b, i) => {
      b.members = seen[i].members.size
      if (!viaSessions) b.active = seen[i].active.size
    })
  }

  // activity right now
  const ago = (ms, h) => ms != null && ms >= SAMPLE_NOW - h * H
  const lastLogins = users.map((u) => u.last_login).filter((x) => x != null)
  const activity = {
    members: users.length,
    active_24h: users.filter((u) => ago(auth ? u.last_active : u.last_login, 24)).length,
    active_7d: users.filter((u) => ago(auth ? u.last_active : u.last_login, 24 * 7)).length,
    active_30d: users.filter((u) => ago(auth ? u.last_active : u.last_login, 24 * 30)).length,
    signed_in_24h: auth ? users.filter((u) => ago(u.last_sign_in, 24)).length : null,
    signed_in_7d: auth ? users.filter((u) => ago(u.last_sign_in, 24 * 7)).length : null,
    last_login_rows: lastLogins.length,
    last_login_latest: lastLogins.length ? iso(Math.max(...lastLogins)) : null,
  }

  return {
    range: win.range,
    interval: win.interval,
    tz: TZ,
    start: isoInZone(win.start),
    end: isoInZone(win.end),
    generated_at: iso(SAMPLE_NOW),
    sources: { auth, signins: !auth ? null : viaSessions ? 'sessions' : 'audit_log' },
    signups: {
      series: sSeries.map((b, i) => ({ t: win.tOf(i), partial: i === n - 1, ...b })),
      totals: sTot,
    },
    funnel: { steps: all, by_method: byMethod, unfinished: all.accounts == null ? null : all.accounts - all.profiles },
    signins: {
      series: iSeries.map((b, i) => ({ t: win.tOf(i), partial: i === n - 1, ...b })),
      totals: auth ? { signins: totSignins, members: totMembers.size, active: viaSessions ? null : totActive.size } : { signins: null, members: null, active: null },
      note: !auth ? 'Supabase sign-in data could not be read.' : viaSessions ? 'Counted from Supabase sessions: people who later signed out are not counted.' : null,
    },
    activity,
  }
}

// ---------------------------------------------------------------- members
const SORT_KEYS = { joined: (u) => u.joined, last_active: (u) => u.last_active, last_sign_in: (u) => u.last_sign_in, stories: (u) => u.stories, name: (u) => (u.display_name || u.username).toLowerCase() }
const JOINED_HOURS = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30, '90d': 24 * 90 }

export function members(st, body = {}, q = {}) {
  const md = modes(st, q)
  const auth = md.overview !== 'noauth'
  const sort = body.sort || 'joined'
  if (!SORT_KEYS[sort]) return { status: 422, json: { detail: [{ loc: ['body', 'sort'], msg: 'Unknown sort', type: 'value_error' }] } }
  const order = body.order === 'asc' ? 'asc' : 'desc'
  const page = Math.max(1, Number(body.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(body.page_size) || 25))
  const { w, users } = people(st, md.overview, !!body.include_staff)
  const byId = Object.fromEntries(w.users.map((u) => [u.id, u]))
  const term = String(body.q || '').trim().toLowerCase()
  let list = users.filter((u) => {
    if (term && ![u.username, u.email, u.display_name, u.full_name].some((x) => String(x || '').toLowerCase().includes(term))) return false
    if (body.method && u.method !== body.method) return false
    if (body.source && (body.source === 'invited') !== !!u.invited_by) return false
    if (body.plan && u.plan.state !== body.plan) return false
    if (body.activity === 'active_7d' && !(u.last_active >= SAMPLE_NOW - 7 * D)) return false
    if (body.activity === 'quiet_30d' && u.last_active != null && u.last_active >= SAMPLE_NOW - 30 * D) return false
    if (body.stories === 'has' && !u.stories) return false
    if (body.stories === 'none' && u.stories) return false
    if (body.confirmed != null && u.confirmed !== body.confirmed) return false
    if (JOINED_HOURS[body.joined] && u.joined < SAMPLE_NOW - JOINED_HOURS[body.joined] * H) return false
    return true
  })
  const key = SORT_KEYS[sort]
  list = [...list].sort((a, b) => {
    const x = key(a), y = key(b)
    if (x == null && y == null) return b.id - a.id
    if (x == null) return 1 // NULLS LAST, either way
    if (y == null) return -1
    if (x < y) return order === 'asc' ? -1 : 1
    if (x > y) return order === 'asc' ? 1 : -1
    return b.id - a.id
  })
  const rows = list.slice((page - 1) * pageSize, page * pageSize).map((u) => {
    const inv = u.invited_by ? byId[u.invited_by] : null
    return {
      id: u.id, username: u.username, display_name: u.display_name, email: u.email, avatar_url: u.avatar_url,
      joined_at: iso(u.joined), last_sign_in_at: auth ? iso(u.last_sign_in) : null, last_active_at: iso(auth ? u.last_active : u.last_login),
      email_confirmed: auth ? u.confirmed : null, method: auth ? u.method : u.legacy ? 'legacy' : null,
      invited_by: inv ? { id: inv.id, username: inv.username, display_name: inv.display_name } : null,
      plan: { ...u.plan }, stories: u.stories, published: u.published, is_superuser: !!u.is_superuser,
    }
  })
  return { status: 200, json: { total: list.length, page, page_size: pageSize, sources: { auth }, members: rows } }
}

// ---------------------------------------------------------------- unfinished
export function unfinished(st, q = {}) {
  const md = modes(st, q)
  if (md.overview === 'noauth') return { available: false, accounts: [] }
  const { w, accounts } = people(st, md.overview, false)
  const win = resolveWindow(q.range || '7d', null, SAMPLE_NOW, w.firstCreated)
  return {
    available: true,
    accounts: accounts.filter((a) => a.created >= win.start && a.created <= win.end).sort((a, b) => b.created - a.created).slice(0, 50)
      .map((a) => ({ created_at: iso(a.created), confirmed: a.confirmed, method: a.method, email: a.email })),
  }
}

// ---------------------------------------------------------------- visitors (PostHog)
const LINKS = { posthog: 'https://us.posthog.com', vercel_analytics: 'https://vercel.com/jpwilsons-projects/ofs-sept25-frontend/analytics' }
const REFERRERS = [['t.co', 0.52], ['$direct', 0.24], ['m.facebook.com', 0.09], ['www.google.com', 0.07], ['mail.google.com', 0.04], ['duckduckgo.com', 0.02]]
const REF_LABEL = { 't.co': 'X (Twitter)', 'x.com': 'X (Twitter)', 'twitter.com': 'X (Twitter)', $direct: 'Direct', 'm.facebook.com': 'Facebook', 'facebook.com': 'Facebook', 'l.facebook.com': 'Facebook', 'mail.google.com': 'Gmail' }

/** Visitors in one clock hour: a quiet daily rhythm, and the post's wave. */
function hourVisitors(h, post) {
  const hourOfDay = ((h / H) % 24 + 24 - 6) % 24 // Chicago, near enough for a rhythm
  const rhythm = 0.25 + 0.75 * Math.max(0, Math.sin(((hourOfDay - 6) / 18) * Math.PI))
  const since = (h - post) / H
  const wave = since >= -0.5 ? 70 * Math.exp(-Math.max(0, since) / 5) + 6 : 0
  return Math.round((0.9 * rhythm + wave) * (0.7 + 0.6 * hash(h / H)))
}

export function visitors(st, q = {}) {
  const md = modes(st, q)
  if (md.posthog === '0' || md.posthog === 'off') return { configured: false, missing: ['POSTHOG_PERSONAL_API_KEY', 'POSTHOG_PROJECT_ID'], links: { ...LINKS } }
  if (md.posthog === 'fail') return { configured: true, ok: false, error: 'PostHog did not answer (timeout)' }
  const empty = md.overview === 'empty'
  const w = world(st)
  const win = resolveWindow(q.range || '7d', q.interval, SAMPLE_NOW, w.firstCreated)
  const n = win.buckets.length
  const series = win.buckets.map((b, i) => ({ t: win.tOf(i), partial: i === n - 1, visitors: 0, pageviews: 0 }))
  const from = Math.max(win.start, Date.parse('2025-11-01T00:00:00Z')) // PostHog was added in November 2025
  for (let h = Math.floor(from / H) * H; h <= SAMPLE_NOW; h += H) {
    const i = win.indexOf(Math.max(h, win.start))
    if (i < 0 || empty) continue
    const v = hourVisitors(h, w.post)
    series[i].visitors += v
    series[i].pageviews += Math.round(v * (2.2 + hash(h / H + 7) * 1.4))
  }
  // a visitor who comes back in another hour is one visitor over the range
  const sum = series.reduce((a, b) => a + b.visitors, 0)
  const total = Math.round(sum * 0.86)
  const pageviews = series.reduce((a, b) => a + b.pageviews, 0)
  const signedUp = overview(st, { ...q, include_staff: false }).signups.totals.profiles
  const referrers = total ? REFERRERS.map(([domain, share]) => ({ domain, label: REF_LABEL[domain] || domain, visitors: Math.round(total * share) })).filter((x) => x.visitors > 0) : []
  const fromX = referrers.find((x) => x.domain === 't.co')?.visitors || 0
  return {
    configured: true,
    ok: true,
    interval: win.interval,
    cached_at: iso(SAMPLE_NOW - 2 * 60e3),
    series,
    totals: { visitors: total, pageviews, landing_cta: Math.round(total * 0.11), signed_up: signedUp },
    referrers,
    utm_sources: fromX ? [{ source: 'x', visitors: Math.round(fromX * 0.14) }] : [],
  }
}

// ---------------------------------------------------------------- the Tools tab (classic dashboard)
const AI_MODELS = [
  { id: 'anthropic/claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', provider: 'anthropic', vision: true },
  { id: 'anthropic/claude-sonnet-4-5-20250514', name: 'Claude Sonnet 4.5', provider: 'anthropic', vision: true },
  { id: 'openrouter/google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'openrouter', vision: true },
]

// ---------------------------------------------------------------- the router
export function answer(req, st, h) {
  const { method: m, path: p, query: q = {}, body } = req
  if (!p.startsWith('/admin/')) return undefined
  const ok = h?.ok || ((json) => ({ status: 200, json }))
  const later = (r) => {
    const ms = modes(st, q).delay
    return ms ? new Promise((res) => setTimeout(() => res(r), ms)) : r
  }
  if (p.startsWith('/admin/analytics/')) {
    const mode = modes(st, q).overview
    if (mode === '404') return later({ status: 404, json: { detail: 'Not Found' } })
    if (mode === 'error' && p.endsWith('/overview')) return later({ status: 500, json: { detail: 'Could not load the numbers.' } })
    if (m === 'GET' && p === '/admin/analytics/overview') return later(ok(overview(st, q)))
    if (m === 'POST' && p === '/admin/analytics/members') return later(members(st, body || {}, q))
    if (m === 'GET' && p === '/admin/analytics/unfinished') return later(ok(unfinished(st, q)))
    if (m === 'GET' && p === '/admin/analytics/visitors') return later(ok(visitors(st, q)))
    return undefined
  }
  if (m === 'GET' && p === '/admin/stats') {
    const { users } = people(st, 'ok', true)
    return ok({ total_users: users.length, total_events: st.db.list.length, published_events: st.db.list.length, total_feedback: 14, new_feedback: 3, premium_users: users.filter((u) => u.plan.state === 'paid').length, superusers: 1 })
  }
  if (m === 'GET' && p === '/admin/demo-account') return ok({ configured: true, username: 'demo', email: 'demo@example.test', updated_at: '2026-11-02T15:00:00' })
  if (m === 'PUT' && p === '/admin/demo-password') return ok({ message: 'Demo password updated successfully' })
  if (m === 'GET' && p === '/admin/settings/ai-model') return ok({ current_model: (st.adminAiModel ||= AI_MODELS[0].id), available_models: AI_MODELS, has_openrouter_key: false })
  if (m === 'PUT' && p === '/admin/settings/ai-model') {
    if (!AI_MODELS.some((x) => x.id === body?.model_id)) return { status: 400, json: { detail: 'Invalid model ID' } }
    st.adminAiModel = body.model_id
    return ok({ message: 'AI model updated', current_model: body.model_id })
  }
  return undefined
}

/** /__fx/admin-posthog?on=0|1|fail and /__fx/admin-state?overview=…&delay=…  (optional &next=/admin) */
export function fixturePage(req, st) {
  const { path, query = {} } = req
  if (path !== '/__fx/admin-posthog' && path !== '/__fx/admin-state') return null
  const m = (st.adminMode ||= { posthog: '1', overview: 'ok', delay: 0 })
  if (path === '/__fx/admin-posthog') m.posthog = ['0', '1', 'fail'].includes(query.on) ? query.on : '1'
  else {
    if (query.overview) m.overview = ['ok', '404', 'error', 'noauth', 'sessions', 'empty'].includes(query.overview) ? query.overview : 'ok'
    if (query.delay != null) m.delay = Math.min(30000, Math.max(0, Number(query.delay) || 0))
  }
  if (query.next && /^\/[^/]/.test(query.next)) return { redirect: query.next }
  const text = `PostHog: ${m.posthog === '0' ? 'not set up' : m.posthog === 'fail' ? 'failing' : 'set up'} · overview: ${m.overview} · delay: ${m.delay} ms`
  return { html: `<!doctype html><meta charset="utf-8"><title>Admin sample</title><p style="font:16px system-ui;padding:24px">${text}. <a href="/admin">Open the admin page</a></p>` }
}
