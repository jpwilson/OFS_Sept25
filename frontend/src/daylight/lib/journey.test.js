// node --test src/daylight/lib/   (owner: F0). Wall time at the place, and how a journey's days are made.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { wallTime, wallDayLabel, wallTripDay, wallMonthDay } from './format.js'
import { tripDay } from './geo.js'
import { buildJourney } from './journey.js'

// Run the same assertions as a reader in three zones: the trip's own (Denver), the sample's
// clock (Chicago) and one a day ahead of it (Tokyo). Node rereads TZ when it is assigned.
const ZONES = ['America/Denver', 'America/Chicago', 'Asia/Tokyo', 'Pacific/Kiritimati']
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

// A Wyoming trip, stamps with the place's offset as the server stores them.
const LATE = '2026-06-14T23:50:00-06:00' // ten to midnight on the first evening
const SMALL_HOURS = '2026-06-15T01:30:00-06:00' // after midnight: still the first trip day (4am pivot)
const MORNING = '2026-06-15T09:26:00-06:00'

test('wall helpers read the clock at the place, whatever the reader’s zone', () => {
  inZones((z) => {
    assert.equal(wallTime(MORNING), '9:26 AM', z)
    assert.equal(wallTime(LATE), '11:50 PM', z)
    assert.equal(wallTripDay(LATE), '2026-06-14', z)
    assert.equal(wallTripDay(SMALL_HOURS), '2026-06-14', z)
    assert.equal(wallTripDay(SMALL_HOURS, 0), '2026-06-15', z)
    assert.equal(wallDayLabel(LATE), 'Sunday, June 14', z)
    assert.equal(wallDayLabel(SMALL_HOURS, 0), 'Monday, June 15', z)
    assert.equal(wallMonthDay(MORNING), 'June 15', z)
    assert.equal(tripDay(LATE), '2026-06-14', z)
    assert.equal(tripDay('2026-06-15T09:26:00'), '2026-06-15', z) // naive strings too
  })
  assert.equal(wallTime('2026-06-15'), '')
  assert.equal(wallTripDay(null), null)
})

const loc = (id, name, lat, lng, ts, i) => ({ id, location_name: name, latitude: lat, longitude: lng, timestamp: ts, order_index: i, location_type: 'manual' })

test('days follow the wall time at the place, so a stop near midnight keeps its day in any zone', () => {
  const event = {
    start_date: '2026-06-14T05:00:00',
    locations: [
      loc(1, 'Jackson', 43.4799, -110.7624, '2026-06-14T15:00:00-06:00', 0),
      loc(2, 'Gros Ventre campground', 43.6163, -110.6668, LATE, 1),
      loc(3, 'Jenny Lake', 43.7509, -110.7225, SMALL_HOURS, 2),
      loc(4, 'Hidden Falls', 43.7657, -110.7349, MORNING, 3),
    ],
    event_images: [],
  }
  let first = null
  inZones((z) => {
    const j = buildJourney(event, { markers: [], chapters: [], media: [], blocks: [] })
    assert.ok(j, z)
    const days = j.days.map((d) => [d.date, d.stopIds.map((id) => j.stops.find((s) => s.id === id).name)])
    assert.deepEqual(days, [
      ['2026-06-14', ['Jackson', 'Gros Ventre campground', 'Jenny Lake']],
      ['2026-06-15', ['Hidden Falls']],
    ], z)
    first ||= days
    assert.deepEqual(days, first, `${z} sees the same days`)
  })
})

test('a photo stop outside every chapter does not stop the days following the chapters', () => {
  // Two H1 days, a named stop in each, and the cover: a located photo that is not in the
  // text (inBody false), so it has no chapter. It used to turn every day into a weekday.
  const chapters = [
    { id: 'day-one', title: 'Day one: into the valley', level: 1, index: 0 },
    { id: 'day-two', title: 'Day two: the lake', level: 1, index: 1 },
  ]
  const markers = [
    { anchorId: 'stop-anchor-1', name: 'Jackson', lat: 43.4799, lng: -110.7624, ts: '2026-06-14T15:00:00-06:00', chapterId: 'day-one', order: 0 },
    { anchorId: 'stop-anchor-2', name: 'Jenny Lake', lat: 43.7509, lng: -110.7225, ts: '2026-06-15T10:00:00-06:00', chapterId: 'day-two', order: 1 },
  ]
  const cover = { id: 'img-9', src: 'cover.jpg', caption: '', lat: 43.66, lng: -110.71, ts: '2026-06-14T18:30:00-06:00', inBody: false }
  const inText = { id: 'img-10', src: 'lake.jpg', caption: '', lat: 43.70, lng: -110.60, ts: '2026-06-15T12:00:00-06:00', inBody: true }
  const blocks = [
    { type: 'heading', level: 1, id: 'day-one', text: chapters[0].title, chapterId: 'day-one' },
    { type: 'marker', stop: markers[0], chapterId: 'day-one' },
    { type: 'heading', level: 1, id: 'day-two', text: chapters[1].title, chapterId: 'day-two' },
    { type: 'marker', stop: markers[1], chapterId: 'day-two' },
    { type: 'heading', level: 2, id: 'later', text: 'Later', chapterId: 'day-two' },
  ]
  // a located photo far from both stops, in day two's text after a heading that resets nothing
  blocks.push({ type: 'media', items: [inText], chapterId: 'day-two' })
  const j = buildJourney({ start_date: '2026-06-14T05:00:00', locations: [], event_images: [] }, { markers, chapters, media: [cover, inText], blocks })
  assert.equal(j.days.length, 2)
  assert.deepEqual(j.days.map((d) => d.label), ['Day one: into the valley', 'Day two: the lake'])
  assert.deepEqual(j.days.map((d) => d.chapterId), ['day-one', 'day-two'])
  const coverStop = j.stops.find((s) => s.photoIds.includes('img-9'))
  assert.equal(coverStop.kind, 'photo')
  assert.equal(coverStop.dayIndex, 0, 'the cover joins the day of the stop before it')
  assert.equal(j.photos['img-10'].stopId && j.stops.find((s) => s.id === j.photos['img-10'].stopId).dayIndex, 1)
})

test('without chapters on the named stops, days fall back to trip days', () => {
  const markers = [
    { anchorId: 'a1', name: 'Jackson', lat: 43.4799, lng: -110.7624, ts: '2026-06-14T15:00:00-06:00', chapterId: null, order: 0 },
    { anchorId: 'a2', name: 'Jenny Lake', lat: 43.7509, lng: -110.7225, ts: '2026-06-15T10:00:00-06:00', chapterId: null, order: 1 },
  ]
  const j = buildJourney({ locations: [], event_images: [] }, { markers, chapters: [], media: [], blocks: [] })
  assert.deepEqual(j.days.map((d) => [d.date, d.label]), [['2026-06-14', 'Day 1'], ['2026-06-15', 'Day 2']])
})
