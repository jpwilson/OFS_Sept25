// node --test src/daylight/family/*.test.js   (owner: FAMILY). Partial dates and the audience line.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { audienceLine, bornLine, cmpHistory, cmpNotes, daysIn, diedLine, fromPartial, partialLabel, stampParts, toPartial, todayYmd } from './dates.js'

test('partialLabel: a day, a month, a year, as the precision says', () => {
  assert.equal(partialLabel('1952-03-03', 'day'), 'March 3, 1952')
  assert.equal(partialLabel('1952-03-03', null), 'March 3, 1952', 'no precision is a full day')
  assert.equal(partialLabel('1974-06-01', 'month'), 'June 1974')
  assert.equal(partialLabel('1952-01-01', 'year'), '1952')
  assert.equal(partialLabel('1952-03-03T00:00:00', 'day'), 'March 3, 1952')
  assert.equal(partialLabel(null, 'year'), null)
  assert.equal(partialLabel('soon', 'day'), null)
  assert.equal(partialLabel('1952-13-01', 'day'), null)
})

test('stampParts: the mono date column', () => {
  assert.deepEqual(stampParts('1974-06-01', 'month'), { head: 'JUN', year: '1974' })
  assert.deepEqual(stampParts('1952-01-01', 'year'), { head: '', year: '1952' })
  assert.deepEqual(stampParts('2019-09-03', 'day'), { head: 'SEP 3', year: '2019' })
  assert.deepEqual(stampParts(null, null), { head: 'UNDATED', year: '' })
})

test('fromPartial and toPartial: the precision follows from what is filled in', () => {
  assert.deepEqual(fromPartial('1952-01-01', 'year'), { year: '1952', month: '', day: '' })
  assert.deepEqual(fromPartial('1974-06-01', 'month'), { year: '1974', month: '6', day: '' })
  assert.deepEqual(fromPartial('1952-03-03', null), { year: '1952', month: '3', day: '3' })
  assert.deepEqual(fromPartial(null, null), { year: '', month: '', day: '' })
  assert.deepEqual(toPartial({ year: '1952' }), { ymd: '1952-01-01', precision: 'year' })
  assert.deepEqual(toPartial({ year: ' 1974 ', month: '6' }), { ymd: '1974-06-01', precision: 'month' })
  assert.deepEqual(toPartial({ year: '1952', month: '3', day: '3' }), { ymd: '1952-03-03', precision: 'day' })
  assert.deepEqual(toPartial({}), { ymd: null, precision: null })
  assert.deepEqual(toPartial({ year: '', month: '', day: '' }), { ymd: null, precision: null })
  // round trips
  for (const [ymd, p] of [['1952-01-01', 'year'], ['1974-06-01', 'month'], ['2001-12-31', 'day']]) assert.deepEqual(toPartial(fromPartial(ymd, p)), { ymd, precision: p })
  // what the server would refuse, in words a person can act on
  assert.match(toPartial({ month: '6' }).error, /year/)
  assert.match(toPartial({ year: '52' }).error, /four digits/)
  assert.match(toPartial({ year: '19x2' }).error, /four digits/)
  assert.match(toPartial({ year: '2023', month: '2', day: '29' }).error, /28 days/)
  assert.deepEqual(toPartial({ year: '2024', month: '2', day: '29' }), { ymd: '2024-02-29', precision: 'day' })
  assert.equal(daysIn('', 2), 29, 'no year yet: allow the 29th')
  assert.equal(daysIn('2026', 4), 30)
})

test('todayYmd reads the device calendar, not UTC', () => {
  assert.equal(todayYmd(new Date(2026, 10, 26, 23, 30)), '2026-11-26')
  assert.equal(todayYmd(new Date(2026, 0, 5, 0, 10)), '2026-01-05')
})

test('the person sheet: born and died', () => {
  assert.equal(bornLine('1952-03-03', null, 'Cork'), 'Born March 3, 1952 in Cork.')
  assert.equal(bornLine('1952-01-01', 'year', ''), 'Born 1952.')
  assert.equal(bornLine(null, null, ' Cork '), 'Born in Cork.')
  assert.equal(bornLine(null, null, null), null)
  assert.equal(diedLine('2019-01-01', 'year'), 'Died 2019.')
  assert.equal(diedLine('2019-06-01', 'month'), 'Died June 2019.')
  assert.equal(diedLine('2019-06-14', null), 'Died June 14, 2019.')
  assert.equal(diedLine(null, null), null)
})

test('the audience line: who can read it, never a gendered word', () => {
  assert.equal(audienceLine({ kind: 'user', first: 'Ruth' }, false), "Ruth, and Ruth's family on Our Family Socials, can read this.")
  assert.equal(audienceLine({ kind: 'me', first: 'Maya' }, true), 'You and your family on Our Family Socials can read this.')
  assert.equal(audienceLine({ kind: 'tag', first: 'Ivy' }, false), 'You, your family, and anyone linked to Ivy can read this.')
  const gendered = /\b(he|she|him|her|his|hers|they|them|their)\b/i
  for (const line of [audienceLine({ kind: 'user', first: 'James' }), audienceLine({ kind: 'tag', first: 'Biscuit' }), audienceLine({}, true)]) assert.doesNotMatch(line, gendered)
})

test("the server's orders: history oldest first with undated last; notes newest first", () => {
  const h = [
    { id: 4, happened_on: null, created_at: '2026-11-01T10:00:00' },
    { id: 3, happened_on: '1974-06-01', created_at: '2026-11-02T10:00:00' },
    { id: 2, happened_on: '1952-01-01', created_at: '2026-11-03T10:00:00' },
    { id: 5, happened_on: '1952-01-01', created_at: '2026-11-03T10:00:00' },
    { id: 1, happened_on: null, created_at: '2026-10-01T10:00:00' },
  ]
  assert.deepEqual([...h].sort(cmpHistory).map((x) => x.id), [2, 5, 3, 1, 4])
  const n = [
    { id: 1, created_at: '2026-11-01T10:00:00' },
    { id: 3, created_at: '2026-11-20T09:00:00' },
    { id: 2, created_at: '2026-11-20T09:00:00' },
  ]
  assert.deepEqual([...n].sort(cmpNotes).map((x) => x.id), [3, 2, 1])
})
