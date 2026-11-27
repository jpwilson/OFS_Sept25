// node --test src/daylight/admin/   (owner: ADMIN). Chicago labels, whatever the reader's zone.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ago, asOf, bucketLabel, dayLabel, isoInZone, stamp, tickLabel, zoneOffset, zoneParts, zoneTime } from './time.js'

const ZONES = ['America/Chicago', 'Europe/London', 'Asia/Tokyo', 'Pacific/Kiritimati', 'America/Los_Angeles']
function inZones(fn) {
  const was = process.env.TZ
  try {
    for (const z of ZONES) {
      process.env.TZ = z
      fn(z)
    }
  } finally {
    if (was === undefined) delete process.env.TZ
    else process.env.TZ = was
  }
}

test('"as of" is the Chicago clock with CT', () => {
  inZones(() => {
    assert.equal(asOf('2026-11-27T20:05:12Z'), '2:05 pm CT')
    assert.equal(asOf('2026-07-01T05:00:00Z'), '12:00 am CT')
    assert.equal(asOf(null), '')
  })
})

test('offsets and wall parts follow daylight saving', () => {
  inZones(() => {
    assert.equal(zoneOffset('2026-07-01T12:00:00Z'), -300)
    assert.equal(zoneOffset('2026-11-27T12:00:00Z'), -360)
    assert.deepEqual({ ...zoneParts('2026-11-27T05:30:00Z'), wd: 0 }, { y: 2026, mo: 11, d: 26, h: 23, mi: 30, s: 0, wd: 0 })
    assert.equal(isoInZone('2026-11-21T06:00:00Z'), '2026-11-21T00:00:00-06:00')
    assert.equal(isoInZone('2026-06-21T05:00:00Z'), '2026-06-21T00:00:00-05:00')
  })
})

test('Chicago midnight, also on the days the clocks change', () => {
  inZones(() => {
    assert.equal(zoneTime(2026, 11, 1).toISOString(), '2026-11-01T05:00:00.000Z') // still CDT at midnight
    assert.equal(zoneTime(2026, 11, 2).toISOString(), '2026-11-02T06:00:00.000Z')
    assert.equal(zoneTime(2026, 3, 8).toISOString(), '2026-03-08T06:00:00.000Z') // spring forward at 2 am
    assert.equal(zoneTime(2026, 3, 9).toISOString(), '2026-03-09T05:00:00.000Z')
    assert.equal(zoneTime(2026, 12, 0).toISOString(), zoneTime(2026, 11, 30).toISOString()) // day 0 rolls back
    assert.equal(zoneTime(2026, 13, 1).toISOString(), '2027-01-01T06:00:00.000Z') // month 13 rolls on
  })
})

test('the two 1 AM hours of the fall-back read apart', () => {
  inZones(() => {
    const first = bucketLabel('2026-11-01T01:00:00-05:00', 'hour')
    const second = bucketLabel('2026-11-01T01:00:00-06:00', 'hour')
    assert.equal(first, 'Nov 1, 1 am CDT')
    assert.equal(second, 'Nov 1, 1 am CST')
  })
})

test('a day bucket is the Chicago day, 00:30 included', () => {
  inZones(() => {
    assert.equal(bucketLabel('2026-11-26T00:00:00-06:00', 'day'), 'Thu, Nov 26')
    assert.equal(tickLabel('2026-11-26T00:30:00-06:00', 'day'), 'Nov 26')
    assert.equal(bucketLabel('2026-11-01T00:00:00-05:00', 'month'), 'November 2026')
    assert.equal(tickLabel('2026-11-01T00:00:00-05:00', 'month'), 'Nov')
    assert.equal(tickLabel('2027-01-01T00:00:00-06:00', 'month'), '2027')
    assert.equal(tickLabel('2026-11-26T14:00:00-06:00', 'hour'), '2 pm')
    assert.equal(tickLabel('2026-11-26T14:00:00-06:00', 'hour', { withDay: true }), 'Nov 26, 2 pm')
    assert.equal(dayLabel('2026-11-27T03:00:00Z'), 'Nov 26, 2026')
    assert.equal(stamp('2026-11-27T20:05:00Z'), 'Nov 27, 2:05 pm')
  })
})

test('ago', () => {
  const now = Date.parse('2026-11-27T20:00:00Z')
  assert.equal(ago('2026-11-27T19:59:30Z', now), 'just now')
  assert.equal(ago('2026-11-27T19:40:00Z', now), '20m ago')
  assert.equal(ago('2026-11-27T18:00:00Z', now), '2h ago')
  assert.equal(ago('2026-11-24T18:00:00Z', now), '3d ago')
  assert.equal(ago('2026-08-03T18:00:00Z', now), 'Aug 3, 2026')
  assert.equal(ago(null, now), null)
  assert.equal(ago('2026-11-27T20:10:00Z', now), 'just now') // a clock a little ahead never says "in"
})
