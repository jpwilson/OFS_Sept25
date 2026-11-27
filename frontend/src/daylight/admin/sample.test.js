// node --test src/daylight/admin/   (owner: ADMIN). The sample server keeps the spec's window
// rules (docs/app/ADMIN-ANALYTICS.md "Ranges"), so the page is drawn against honest shapes,
// and the URL state round-trips.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolveWindow, overview, members, visitors, unfinished, answer, SAMPLE_NOW } from './sample.js'
import { readQuery, writeQuery, intervalFor, activeFilters, EMPTY_FILTERS, membersBody, pageLine } from './query.js'

const SNAP = fileURLToPath(new URL('../../../scripts/daylight/fixtures/sample.json', import.meta.url))
const state = () => ({ db: JSON.parse(fs.readFileSync(SNAP, 'utf8')) })
const haveSnap = fs.existsSync(SNAP)

test('windows: every preset', () => {
  const now = Date.parse('2026-11-27T20:05:12Z') // 2:05 pm in Chicago
  const w24 = resolveWindow('24h', 'day', now, 0)
  assert.equal(w24.interval, 'hour') // not allowed: the default
  assert.equal(w24.buckets.length, 24)
  assert.equal(new Date(w24.start).toISOString(), '2026-11-26T21:00:00.000Z')
  const w7 = resolveWindow('7d', null, now, 0)
  assert.equal(w7.interval, 'day')
  assert.equal(w7.buckets.length, 7)
  assert.equal(w7.tOf(0), '2026-11-21T00:00:00-06:00')
  assert.equal(resolveWindow('30d', 'day', now, 0).buckets.length, 30)
  assert.equal(resolveWindow('90d', 'month', now, 0).buckets.length, 4) // Aug (part), Sep, Oct, Nov
  assert.equal(resolveWindow('all', null, now, Date.parse('2025-08-04T15:00:00Z')).interval, 'month')
})

test('windows: 7 days of hours over the fall-back has 169 buckets and two 1 AM labels', () => {
  const now = Date.parse('2026-11-08T05:59:59Z') // 11:59:59 pm on 7 Nov, Chicago
  const w = resolveWindow('7d', 'hour', now, 0)
  assert.equal(w.buckets.length, 169)
  const ones = w.buckets.map((_, i) => w.tOf(i)).filter((t) => t.startsWith('2026-11-01T01:00:00'))
  assert.deepEqual(ones, ['2026-11-01T01:00:00-05:00', '2026-11-01T01:00:00-06:00'])
})

test('windows: spring forward, and 00:30 Chicago lands on its own day', () => {
  const now = Date.parse('2026-03-09T05:30:00Z') // 00:30 on 9 Mar, Chicago (CDT)
  const w = resolveWindow('7d', 'hour', now, 0)
  assert.equal(w.buckets.length, 6 * 24 - 1 + 1) // 3 Mar 00:00 .. 9 Mar 00:30: one hour short on the 8th
  const d = resolveWindow('7d', 'day', now, 0)
  assert.equal(d.tOf(d.buckets.length - 1), '2026-03-09T00:00:00-05:00')
  assert.equal(d.indexOf(now), 6)
})

test('every series is zero-filled and the last bucket is partial', { skip: !haveSnap && 'no sample.json (run build-sample.mjs)' }, () => {
  const st = state()
  for (const [range, interval] of [['24h'], ['7d'], ['7d', 'hour'], ['90d', 'month'], ['all', 'day']]) {
    const o = overview(st, { range, interval })
    const v = visitors(st, { range, interval })
    for (const s of [o.signups.series, o.signins.series, v.series]) {
      assert.ok(s.length > 0)
      assert.equal(s.filter((b) => b.partial).length, 1)
      assert.equal(s.at(-1).partial, true)
      assert.ok(s.every((b) => /([+-]\d\d:\d\d|Z)$/.test(b.t)))
    }
    assert.equal(o.signups.series.reduce((a, b) => a + b.profiles, 0), o.signups.totals.profiles)
    assert.equal(o.funnel.unfinished, o.funnel.steps.accounts - o.funnel.steps.profiles)
  }
})

test('members: sorts put nulls last, pages and filters', { skip: !haveSnap && 'no sample.json' }, () => {
  const st = state()
  const page = (n) => members(st, { sort: 'last_sign_in', order: 'asc', page: n, page_size: 100, joined: 'all', include_staff: true }).json.members
  const values = [...page(1), ...page(2)].map((m) => m.last_sign_in_at)
  const firstNull = values.indexOf(null)
  assert.ok(firstNull > 0 && values.slice(firstNull).every((x) => x === null))
  const p2 = members(st, { sort: 'joined', page: 2, page_size: 25 }).json
  assert.equal(p2.page, 2)
  assert.equal(p2.members.length, 25)
  assert.equal(members(st, { sort: 'nope' }).status, 422)
  assert.equal(members(st, { sort: 'joined', page_size: 500 }).json.page_size, 100)
  const google = members(st, { sort: 'joined', method: 'google', page_size: 100 }).json
  assert.ok(google.total > 0 && google.members.every((m) => m.method === 'google'))
  const staffOut = members(st, { sort: 'joined', page_size: 100 }).json
  assert.ok(staffOut.members.every((m) => !m.is_superuser && m.username !== 'demo'))
  assert.equal(unfinished(st, { range: '7d' }).accounts.length, 4)
})

test('sample states: 404, not set up, PostHog failing', { skip: !haveSnap && 'no sample.json' }, () => {
  const st = state()
  assert.equal(answer({ method: 'GET', path: '/admin/analytics/overview', query: { __overview: '404' } }, st).status, 404)
  assert.equal(answer({ method: 'GET', path: '/admin/analytics/visitors', query: { __posthog: '0' } }, st).json.configured, false)
  assert.equal(answer({ method: 'GET', path: '/admin/analytics/visitors', query: { __posthog: 'fail' } }, st).json.ok, false)
  assert.equal(answer({ method: 'GET', path: '/events' }, st), undefined)
  assert.equal(overview(st, { range: '7d' }).generated_at, new Date(SAMPLE_NOW).toISOString().replace('.000Z', 'Z'))
})

test('URL state round-trips and leaves defaults out', () => {
  assert.deepEqual(readQuery(''), { range: '7d', interval: 'day', tab: 'overview', sort: 'joined', order: 'desc' })
  assert.equal(readQuery('', '30d').range, '30d')
  assert.equal(readQuery('?range=all&interval=hour').interval, 'month')
  const s = { range: '90d', interval: 'month', tab: 'members', sort: 'last_active', order: 'desc' }
  assert.equal(writeQuery(s), '?range=90d&interval=month&tab=members&sort=last_active')
  assert.deepEqual(readQuery(writeQuery(s)), s)
  assert.equal(writeQuery({ range: '7d', interval: 'day', tab: 'overview', sort: 'joined', order: 'desc' }, 'only=admin'), '?only=admin&range=7d')
  assert.equal(intervalFor('24h', 'day'), 'hour')
})

test('filters: chips and the request body', () => {
  const f = { ...EMPTY_FILTERS, method: 'google', confirmed: false, joined: 'all' }
  assert.deepEqual(activeFilters(f).map((x) => x.label), ['Google', 'Email not confirmed'])
  const b = membersBody({ q: '  smith ', filters: f, sort: 'name', order: 'asc', page: 1, pageSize: 25 })
  assert.equal(b.q, 'smith')
  assert.equal(b.confirmed, false)
  assert.equal(b.include_staff, false)
  assert.equal(membersBody({ q: '   ', filters: EMPTY_FILTERS, sort: 'joined', order: 'desc', page: 1, pageSize: 25 }).q, null)
  assert.equal(pageLine(1, 25, 132), '1–25 of 132')
  assert.equal(pageLine(6, 25, 132), '126–132 of 132')
})

test('the server’s edges: no auth, All capped at 90 days, long search, unknown range', { skip: !haveSnap && 'no sample.json' }, () => {
  const st = state()
  const n = overview(st, { range: '7d', __overview: 'noauth' })
  assert.equal(n.funnel.unfinished, null)
  assert.deepEqual(Object.values(n.funnel.by_method.email), [null, null, null, null, null])
  assert.ok(n.signins.note && n.signins.totals.signins === null && n.signins.series.every((b) => b.signins === null))
  const all = overview(st, { range: 'all' })
  assert.match(all.signins.note, /90 days/)
  assert.equal(all.signins.series[0].signins, 0)
  assert.equal(members(st, { sort: 'joined', q: 'x'.repeat(201) }).status, 422)
  assert.equal(overview(st, { range: 'nonsense' }).range, '7d')
})
