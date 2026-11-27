// node --test src/daylight/family/   (owner: FAMILY). The truth graphs and each person's own words.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HARTLEYS, LARGE, OWNER, egoWords, truthLinks, seedPairs, seedTags, relationshipRow, tagRow, truthDirectory, viewOf, idOf, pairId, SCHEMA_KEYS } from './fixtures.js'
import { TYPES } from './kin.js'

// The landing's own fixture (frontend/scripts/landing/fixtures/api.mjs, the REL rows): the
// Daylight sample must give Maya exactly the words the landing drew.
process.env.CAPTURE_ORIGIN = '__ORIGIN__'
const landingApi = await import('../../../scripts/landing/fixtures/api.mjs')
const { USERS } = await import('../../../scripts/landing/fixtures/cast.mjs')
async function landingRows(path) {
  const u = new URL(`http://fixture.invalid/api/v1${path}`)
  return landingApi.answer({ method: () => 'GET', postData: () => null }, u, { viewer: 'maya', theme: 'light' })
}

test("Maya's words reproduce the landing's rows, both sides", async () => {
  const rows = await landingRows('/relationships')
  const landing = Object.fromEntries(rows.map((r) => [r.other_user_username, [r.my_relationship_to_them, r.their_relationship_to_me]]))
  const dir = truthDirectory(HARTLEYS)
  const mine = viewOf(HARTLEYS, 'maya', dir).relationships
  const ours = Object.fromEntries(mine.map((r) => [r.other_user_username, [r.my_relationship_to_them, r.their_relationship_to_me]]))
  assert.deepEqual(ours, landing)
  assert.equal(mine.length, 8)
})

test("egoWords: Maya's own words, and Biscuit is a pet (not 'pet owner')", () => {
  assert.deepEqual(egoWords(HARTLEYS, 'maya'), {
    biscuit: 'pet', finn: 'nephew', ivy: 'daughter', joe: 'father', kate: 'sister-in-law', leo: 'son', marcus: 'brother-in-law', ruth: 'mother-in-law', tom: 'husband',
  })
})

test('egoWords: every cast member has their own words', () => {
  assert.deepEqual(egoWords(HARTLEYS, 'ivy'), { finn: 'cousin', joe: 'grandfather', kate: 'aunt', leo: 'brother', marcus: 'uncle', maya: 'mother', ruth: 'grandmother', tom: 'father' })
  assert.deepEqual(egoWords(HARTLEYS, 'kate'), { finn: 'son', ivy: 'niece', leo: 'nephew', marcus: 'husband', maya: 'sister-in-law', ruth: 'mother', tom: 'brother' })
  assert.deepEqual(egoWords(HARTLEYS, 'ruth'), { finn: 'grandson', ivy: 'granddaughter', kate: 'daughter', leo: 'grandson', marcus: 'son-in-law', maya: 'daughter-in-law', tom: 'son' })
  assert.deepEqual(egoWords(HARTLEYS, 'joe'), { ivy: 'granddaughter', leo: 'grandson', maya: 'daughter', tom: 'son-in-law' })
  assert.deepEqual(egoWords(HARTLEYS, 'marcus'), { finn: 'son', ivy: 'niece', kate: 'wife', leo: 'nephew', maya: 'sister-in-law', ruth: 'mother-in-law', tom: 'brother-in-law' })
  assert.deepEqual(egoWords(HARTLEYS, 'finn'), { ivy: 'cousin', kate: 'mother', leo: 'cousin', marcus: 'father', maya: 'aunt', ruth: 'grandmother', tom: 'uncle' })
  assert.equal(egoWords(HARTLEYS, 'tom').joe, 'father-in-law')
  assert.equal(egoWords(HARTLEYS, 'tom').biscuit, 'pet')
})

test('the large family: about fifty people around Maya, in their own words', () => {
  const w = egoWords(LARGE, 'maya')
  assert.ok(Object.keys(w).length >= 45, `${Object.keys(w).length} people`)
  const expect = {
    ann: 'mother', carol: 'stepmother', nico: 'brother', gina: 'sister', lucy: 'half-sister', sal: 'grandfather', rosa: 'grandmother',
    lucia: 'great-grandmother', frank: 'uncle', patty: 'aunt', diane: 'aunt', rick: 'uncle', anthony: 'cousin', grace: 'cousin',
    erin: 'sister-in-law', sofia: 'niece', theo: 'nephew', bill: 'father-in-law', ben: 'brother-in-law', amy: 'sister-in-law',
    owen: 'nephew', priya: 'friend', hank: 'neighbor', bea: 'godmother', biscuit: 'pet',
  }
  for (const [k, word] of Object.entries(expect)) assert.equal(w[k], word, k)
  const tags = seedTags(LARGE).filter((t) => t.by === 'maya')
  assert.ok(tags.length >= 8)
  const people = Object.values(LARGE.people)
  assert.ok(people.filter((p) => !p.avatar).length > people.length / 2, 'mostly without photos')
})

test('confirmed pairs: both words are relationship types, ids stable from either side', () => {
  for (const truth of [HARTLEYS, LARGE]) {
    const pairs = seedPairs(truth)
    const ids = new Set()
    for (const p of pairs) {
      assert.ok(TYPES.includes(p.aToB) && TYPES.includes(p.bToA), `${p.a}-${p.b}`)
      assert.ok(!ids.has(p.id))
      ids.add(p.id)
    }
  }
  assert.equal(pairId(3, 9), pairId(9, 3))
})

test("Biscuit: Maya's tag, linked to Maya and to Tom as 'pet'", () => {
  const [b] = seedTags(HARTLEYS)
  assert.equal(b.word, 'pet')
  assert.deepEqual(b.links.map((l) => [l.user, l.word]), [['maya', 'pet'], ['tom', 'pet']])
  const row = tagRow(b, truthDirectory(HARTLEYS))
  assert.deepEqual(Object.keys(row), SCHEMA_KEYS.tag)
  for (const l of row.relationships) assert.deepEqual(Object.keys(l), SCHEMA_KEYS.tagLink)
  assert.equal(row.relationship_to_creator, 'pet')
})

test('rows carry exactly the production keys (no other_user_full_name)', () => {
  const dir = truthDirectory(HARTLEYS)
  const [rec] = seedPairs(HARTLEYS)
  assert.deepEqual(Object.keys(relationshipRow(rec, rec.a, dir)), SCHEMA_KEYS.relationship)
  assert.equal(USERS.maya.id, HARTLEYS.people.maya.user, 'the truth uses the landing cast ids')
  assert.equal(USERS.marcus.username, 'james')
})

test("links preview: the facts among Maya's relatives, none about Maya", () => {
  const links = truthLinks(HARTLEYS, 'maya')
  const has = (a, word, b) => links.some((l) => l.a === idOf(HARTLEYS, a) && l.word === word && l.b === idOf(HARTLEYS, b))
  assert.ok(has('kate', 'wife', 'marcus'), 'a couple once, from either side')
  assert.ok(has('kate', 'daughter', 'ruth'))
  assert.ok(has('finn', 'son', 'kate'))
  assert.ok(has('finn', 'son', 'marcus'))
  assert.ok(has('biscuit', 'pet', 'tom'))
  assert.ok(!links.some((l) => l.a === 'u:1' || l.b === 'u:1'))
  assert.ok(!links.some((l) => l.a === idOf(HARTLEYS, 'joe') || l.b === idOf(HARTLEYS, 'joe')), 'Joe is related to the others only through Maya')
  // the same input gives the same list
  assert.deepEqual(truthLinks(HARTLEYS, 'maya'), links)
})

test("the owner's family shape, in the viewer's own words", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(egoWords(OWNER, 'nate')).filter(([k]) => OWNER.people[k].user != null || OWNER.people[k].tag != null)),
    { chris: 'brother', hal: 'father-in-law', jake: 'cousin', june: 'daughter', kelly: 'sister', lena: 'wife', maureen: 'mother', megan: 'sister', rob: 'brother', rosie: 'daughter' },
  )
  const v = viewOf(OWNER, 'nate')
  assert.equal(v.relationships.length, 6, 'his wife, mother, two brothers, a sister and a cousin have accounts')
  assert.equal(v.tags.length, 4, 'two daughters, a sister and his father-in-law are tags')
  for (const t of v.tags) assert.equal(t.relationships.length, 1, 'each tag carries only his own word')
  assert.ok(!truthLinks(OWNER, 'nate').some((l) => /undefined/.test(l.a + l.b)), 'people in the truth only never become links')
})
