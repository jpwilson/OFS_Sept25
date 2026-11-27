// node --test src/daylight/family/*.test.js   (owner: FAMILY). Structure to geometry.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { arrange } from './arrange.js'
import { layout, sizeFor, elbow, SIZES } from './layout.js'
import { HARTLEYS, LARGE, viewOf, truthLinks } from './fixtures.js'

const view = (truth, who, links = false) => {
  const v = viewOf(truth, who)
  if (links) v.links = truthLinks(truth, who)
  return v
}
const ALL = []
for (const who of ['maya', 'tom', 'ivy', 'leo', 'ruth', 'joe', 'kate', 'marcus', 'finn']) for (const links of [false, true]) ALL.push([HARTLEYS, who, links])
ALL.push([LARGE, 'maya', false], [LARGE, 'maya', true])

/** No two faces (with their names and words) overlap; nothing overlaps a tray it is not in. */
function assertNoOverlap(g, label) {
  const boxes = g.nodes.map((n) => ({ id: n.id, l: n.x - n.w / 2, r: n.x + n.w / 2, t: n.y - n.d / 2, b: n.y + n.d / 2 + 30, tray: n.tray }))
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j]
      const overlap = a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b && b.t < a.b
      assert.ok(!overlap, `${label}: ${a.id} overlaps ${b.id}`)
    }
  }
  for (const t of g.trays) {
    for (const n of g.nodes) {
      if (n.tray === t.id) continue
      const inside = n.x + n.w / 2 > t.x + 0.5 && n.x - n.w / 2 < t.x + t.w - 0.5 && n.y > t.y && n.y < t.y + t.h
      assert.ok(!inside, `${label}: ${n.id} sits inside the ${t.caption} tray`)
    }
  }
  for (let i = 0; i < g.trays.length; i++) {
    for (let j = i + 1; j < g.trays.length; j++) {
      const a = g.trays[i], b = g.trays[j]
      assert.ok(!(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h), `${label}: trays ${a.id} and ${b.id} overlap`)
    }
  }
}

function assertBounds(g, label) {
  for (const n of g.nodes) {
    assert.ok(n.x - n.w / 2 >= -0.5 && n.x + n.w / 2 <= g.width + 0.5, `${label}: ${n.id} leaves the width (${n.x})`)
    assert.ok(n.y - n.d / 2 >= 0 && n.y + n.d / 2 <= g.height, `${label}: ${n.id} leaves the height`)
  }
  for (const t of g.trays) assert.ok(t.x >= -0.5 && t.x + t.w <= g.width + 0.5 && t.y >= 0 && t.y + t.h <= g.height + 0.5, `${label}: tray ${t.id} out of bounds`)
  for (const l of g.lines) {
    for (const [, x, y] of l.d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)) {
      assert.ok(Number(x) >= -0.5 && Number(x) <= g.width + 0.5 && Number(y) >= 0 && Number(y) <= g.height, `${label}: line ${l.id} leaves the frame`)
    }
  }
  assert.ok(g.add.x - g.add.w / 2 >= -0.5 && g.add.x + g.add.w / 2 <= g.width + 0.5, `${label}: Add leaves the frame`)
}

test('sizes by the frame width', () => {
  assert.equal(sizeFor(362), 'compact')
  assert.equal(sizeFor(599), 'compact')
  assert.equal(sizeFor(600), 'regular')
  assert.equal(sizeFor(1099), 'regular')
  assert.equal(sizeFor(1100), 'wide')
  assert.deepEqual(SIZES.wide, { face: 100, col: 160, gap: 232, name: 21, label: 13 })
})

test('no overlaps and in bounds: every viewer, every size, with and without links', () => {
  for (const [truth, who, links] of ALL) {
    const s = arrange(view(truth, who, links))
    for (const size of ['compact', 'regular', 'wide']) {
      const g = layout(s, { size })
      const label = `${truth.key}/${who}${links ? '+links' : ''}/${size}`
      assertNoOverlap(g, label)
      assertBounds(g, label)
      assert.equal(g.nodes.filter((n) => !n.tray).length, s.drawn.size, `${label}: every drawn person placed`)
    }
  }
})

test("Maya, wide: the landing's proportions, Joe straight above Maya, children under the join", () => {
  const s = arrange(view(HARTLEYS, 'maya'))
  const g = layout(s, { size: 'wide' })
  const n = (id) => g.nodes.find((x) => x.id === id)
  const [maya, tom, joe, ruth, ivy, leo, biscuit] = ['u:1', 'u:2', 'u:6', 'u:5', 'u:3', 'u:4', 't:41'].map(n)
  assert.equal(tom.x - maya.x, 240, 'partners 1.5 columns apart')
  assert.equal(joe.x, maya.x, 'a single parent straight above')
  assert.equal(ruth.x, tom.x)
  assert.equal(maya.y - joe.y, 232, 'a row gap')
  assert.ok(Math.abs((ivy.x + biscuit.x) / 2 - (maya.x + tom.x) / 2) < 0.6, 'children centred under the join')
  assert.ok(leo.x - ivy.x >= 150 && leo.x - ivy.x < 200, `siblings about a column apart (${leo.x - ivy.x})`)
  assert.equal(ivy.d, 88, 'children at 0.88')
  // the joe -> maya line is straight with its tick at 60%; the couple tick on the join
  assert.match(g.lines.find((l) => l.id === 'd:u:6:u:1').d, /^M[\d.]+,[\d.]+ L[\d.]+,[\d.]+$/)
  const ticks = g.ticks.map((t) => [t.x, t.y])
  assert.ok(ticks.some(([x, y]) => x === (maya.x + tom.x) / 2 && y === maya.y))
  assert.ok(ticks.some(([x, y]) => x === maya.x && Math.abs(y - (joe.y + 232 * 0.6)) < 0.6))
  // trays and Add stand in one column to the right of the drawing
  const inlaws = g.trays.find((t) => t.key === 'in-laws')
  const nieces = g.trays.find((t) => t.key === 'nieces-and-nephews')
  assert.equal(inlaws.x, nieces.x)
  assert.ok(inlaws.x > tom.x + tom.w / 2, 'right of the drawn blocks')
  assert.ok(g.add.y === joe.y && g.add.x - g.add.w / 2 >= inlaws.x - 0.5, 'Add at the right end of the row above')
})

test('descents bar at 62%, the line into you or your partner at 56%', () => {
  const s = arrange(view(HARTLEYS, 'maya', true))
  const g = layout(s, { size: 'wide' })
  const kate = g.lines.find((l) => l.id === 'd:u:5:u:7')
  const ys = [...kate.d.matchAll(/,(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]))
  const r = g.rows.find((x) => x.row === -1).y
  assert.ok(ys.some((y) => Math.abs(y - (r + 232 * 0.56)) < 0.6), 'Ruth to Kate bars at 56%')
  const ivy = g.lines.find((l) => l.id === 'd:u:1+u:2:u:3')
  const r0 = g.rows.find((x) => x.row === 0).y
  const iys = [...ivy.d.matchAll(/,(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]))
  assert.ok(iys.some((y) => Math.abs(y - (r0 + 232 * 0.62)) < 0.6), 'Maya and Tom to Ivy at 62%')
  const finn = g.lines.find((l) => l.id.endsWith(':u:9'))
  assert.match(finn.d, /^M[\d.]+,[\d.]+ L[\d.]+,[\d.]+$/, 'an only child straight under the join')
})

test('overlapping bars in one gap take lanes 10px apart', () => {
  // Ivy with links: Ruth's bar (to Kate and Tom) and Joe's (to Maya) can cross in the gap above row -1
  const s = arrange(view(LARGE, 'maya'))
  const g = layout(s, { size: 'compact' })
  const barYs = (id) => [...g.lines.find((l) => l.id === id).d.matchAll(/,(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]))
  const lucy = barYs(g.lines.find((l) => l.id.endsWith(':t:204')).id)
  const gina = barYs(g.lines.find((l) => l.id.endsWith(':u:104')).id)
  const lb = lucy[2], gb = gina[2]
  assert.ok(Math.abs(lb - gb) === 10 || lb === gb, `lanes ${lb} ${gb}`)
})

test('an empty row gap shrinks to three quarters', () => {
  // Ivy alone: grandparents wait in a tray two rows up; no line crosses that gap
  const s = arrange(view(HARTLEYS, 'ivy'))
  const g = layout(s, { size: 'wide' })
  const y = Object.fromEntries(g.rows.map((r) => [r.row, r.y]))
  assert.equal(y[-1] - y[-2], 232 * 0.75)
  assert.equal(y[0] - y[-1], 232)
})

test('trays: more than six (four on a phone) show five (three) and a +N disc', () => {
  const s = arrange(view(LARGE, 'maya'))
  const cousins = (size) => layout(s, { size }).trays.find((t) => t.key === 'cousins')
  assert.equal(cousins('wide').shown.length, 5)
  assert.equal(cousins('wide').more, 3)
  assert.equal(cousins('compact').shown.length, 3)
  assert.equal(cousins('compact').more, 5)
  const inlaws = layout(s, { size: 'compact' }).trays.find((t) => t.key === 'in-laws')
  assert.equal(inlaws.more, 0)
})

test('just you: Add a relative beside you', () => {
  const s = arrange({ me: { id: 1, username: 'me', full_name: 'Alex Morgan' }, relationships: [] })
  const g = layout(s, { size: 'compact' })
  assert.equal(g.nodes.length, 1)
  assert.equal(g.add.y, g.nodes[0].y)
  assert.equal(g.add.x - g.nodes[0].x, 150)
})

test('the same structure gives the same geometry', () => {
  const a = layout(arrange(view(LARGE, 'maya', true)), { size: 'regular' })
  const b = layout(arrange(view(LARGE, 'maya', true)), { size: 'regular' })
  assert.deepEqual(a, b)
})

test('elbow: rounded corners, a straight line when there is no turn', () => {
  assert.equal(elbow([[0, 0], [0, 50], [100, 50], [100, 100]]), 'M0,0 L0,28 Q0,50 22,50 L78,50 Q100,50 100,72 L100,100')
})

test('two hundred people lay out in under 10ms', () => {
  // a wide family: you, a partner, 4 siblings each with a partner and 4 children, 40 cousins and more
  const me = { id: 1, username: 'me', full_name: 'Alex Morgan' }
  const relationships = []
  const tags = []
  let id = 2
  const rel = (name, word) => relationships.push({ id: id, other_user_id: id++, other_user_username: `p${id}`, other_user_display_name: name, other_user_avatar_url: null, my_relationship_to_them: word, their_relationship_to_me: 'other', status: 'accepted', proposed_by_me: true, created_at: '2026-01-01T00:00:00', accepted_at: '2026-01-01T00:00:00' })
  rel('Sam Morgan', 'wife'); rel('Lou Morgan', 'father'); rel('Pat Morgan', 'mother'); rel('Ida Kane', 'mother-in-law'); rel('Rob Kane', 'father-in-law')
  const sibs = []
  for (let i = 0; i < 4; i++) { sibs.push(id); rel(`Sib${i} Morgan`, i % 2 ? 'brother' : 'sister') }
  for (let i = 0; i < 5; i++) rel(`Kid${i} Morgan`, i % 2 ? 'son' : 'daughter')
  for (let i = 0; i < 75; i++) rel(`Cousin${i} Lane`, 'cousin')
  for (let i = 0; i < 30; i++) rel(`Aunt${i} Lane`, 'aunt')
  for (let i = 0; i < 20; i++) rel(`Friend${i} Lee`, 'friend')
  let tid = 500
  for (const sid of sibs) {
    tags.push({ id: tid++, name: `Spouse${tid}`, relationship_to_creator: 'sister-in-law', photo_url: null, birth_date: null, created_by_id: 1, is_merged: false, relationships: [{ id: tid * 10, user_id: sid, relationship_type: 'wife' }] })
    for (let k = 0; k < 4; k++) tags.push({ id: tid++, name: `Niece${tid}`, relationship_to_creator: 'niece', photo_url: null, birth_date: null, created_by_id: 1, is_merged: false, relationships: [{ id: tid * 10, user_id: sid, relationship_type: 'daughter' }] })
  }
  for (let k = 0; k < 40; k++) tags.push({ id: tid++, name: `Grand${k}`, relationship_to_creator: 'granddaughter', photo_url: null, birth_date: null, created_by_id: 1, is_merged: false, relationships: [{ id: tid * 10, user_id: 15 + (k % 5), relationship_type: 'daughter' }] })
  const input = { me, relationships, tags }
  const s = arrange(input)
  assert.ok(s.people.size >= 200, `${s.people.size} people`)
  for (const size of ['compact', 'wide']) layout(s, { size }) // warm up
  const t0 = performance.now()
  const runs = 20
  for (let i = 0; i < runs; i++) layout(s, { size: 'wide' })
  const ms = (performance.now() - t0) / runs
  assert.ok(ms < 10, `${ms.toFixed(2)}ms`)
  assertNoOverlap(layout(s, { size: 'wide' }), 'two hundred')
  const t1 = performance.now()
  for (let i = 0; i < runs; i++) arrange(input)
  assert.ok((performance.now() - t1) / runs < 25, 'arranging two hundred stays quick too')
})
