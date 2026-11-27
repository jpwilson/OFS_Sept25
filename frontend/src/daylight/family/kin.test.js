// node --test src/daylight/family/   (owner: FAMILY). The words: normalised, then matched exactly.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TYPES, TYPE_GROUPS, COMMON, readWord, normalise, reverseOf, trayCaption, LIST_GROUPS, ALWAYS_DRAWN } from './kin.js'

test('all 35 relationship types are known words, and the groups hold each exactly once', () => {
  assert.equal(TYPES.length, 35)
  for (const t of TYPES) assert.ok(readWord(t).known, t)
  const grouped = TYPE_GROUPS.flatMap((g) => g.words)
  assert.equal(grouped.length, 35)
  assert.deepEqual([...grouped].sort(), [...TYPES].sort())
  for (const c of COMMON) assert.ok(TYPES.includes(c), c)
})

test('normalising: case, spaces, hyphens, step and half, pending approval', () => {
  assert.equal(normalise('  Mother  In  Law ').word, 'mother-in-law')
  assert.equal(normalise('mother in-law').word, 'mother-in-law')
  assert.equal(normalise('Sister - in - law').word, 'sister-in-law')
  assert.equal(normalise('Step Mother').word, 'stepmother')
  assert.equal(normalise('step-son').word, 'stepson')
  assert.equal(normalise('half sister').word, 'half-sister')
  assert.equal(normalise('daughter (pending approval)').word, 'daughter')
  assert.deepEqual(normalise('great grandmother'), { word: 'grandmother', greats: 1 })
  assert.deepEqual(normalise('Great-Great-Grandson'), { word: 'grandson', greats: 2 })
  assert.deepEqual(normalise(''), { word: '', greats: 0 })
  assert.deepEqual(normalise(null), { word: '', greats: 0 })
})

test('synonyms map to their word; nothing else does', () => {
  const cases = { Mom: 'mother', mum: 'mother', Dad: 'father', Grandma: 'grandmother', nana: 'grandmother', granny: 'grandmother', grandpa: 'grandfather', granddad: 'grandfather', spouse: 'partner', partner: 'partner', 'fiancé': 'partner', 'Fiancée': 'partner', Dog: 'pet', cat: 'pet', 'great grandma': 'grandmother' }
  for (const [raw, word] of Object.entries(cases)) assert.equal(readWord(raw).word, word, raw)
})

test('never a substring match: godmother is not a mother, stepson is not a son', () => {
  const god = readWord('godmother')
  assert.equal(god.kind, 'other')
  assert.equal(god.row, null)
  assert.equal(god.group, 'more')
  assert.equal(readWord('godson').kind, 'other')
  assert.equal(readWord('stepson').kind, 'stepChild')
  assert.equal(readWord('grandmother').kind, 'grandparent')
  assert.equal(readWord('mother').kind, 'parent')
  assert.equal(readWord('sister-in-law').kind, 'siblingInLaw')
  assert.equal(readWord('sister').kind, 'sibling')
  assert.equal(readWord('pet owner').kind, 'parent')
  assert.equal(readWord('pet').kind, 'child')
  assert.ok(readWord('pet').pet)
  assert.equal(readWord('boyfriend').kind, 'other')
  assert.equal(readWord('friend').kind, 'friend')
  assert.equal(readWord('best friend').group, 'friends')
  assert.equal(readWord('neighbor').group, 'more')
  assert.equal(readWord('').kind, 'other')
  assert.equal(readWord('other').kind, 'other')
})

test('rows: generations relative to the person the word describes', () => {
  const rows = { wife: 0, husband: 0, mother: -1, 'pet owner': -1, stepfather: -1, sister: 0, 'half-brother': 0, son: 1, pet: 1, stepdaughter: 1, 'mother-in-law': -1, grandfather: -2, aunt: -1, cousin: 0, 'brother-in-law': 0, 'son-in-law': 1, niece: 1, granddaughter: 2 }
  for (const [w, r] of Object.entries(rows)) assert.equal(readWord(w).row, r, w)
  assert.equal(readWord('great-grandmother').row, -3)
  assert.equal(readWord('great great grandson').row, 4)
  assert.equal(readWord('great-aunt').row, -2)
  assert.equal(readWord('great-nephew').row, 2)
  assert.equal(readWord('great-mother').kind, 'other', 'great- only where the word can take it')
  assert.equal(readWord('friend').row, null)
})

test('the parent order: father, mother, parent', () => {
  assert.ok(readWord('father').parentRank < readWord('mother').parentRank)
  assert.ok(readWord('mother').parentRank < readWord('parent').parentRank)
  assert.equal(readWord('stepmother').needs, 'father')
  assert.equal(readWord('stepfather').needs, 'mother')
})

test('always drawn: partners, parents, siblings, children; the rest need a rule or a link', () => {
  assert.deepEqual([...ALWAYS_DRAWN].sort(), ['child', 'parent', 'partner', 'sibling'])
  assert.equal(readWord('niece').tray, 'nieces-and-nephews')
  assert.equal(readWord('cousin').tray, 'cousins')
})

test('reverse words: suggested only when one word fits anyone', () => {
  assert.deepEqual(reverseOf('husband'), { words: ['wife', 'husband'], suggest: null })
  assert.deepEqual(reverseOf('mother'), { words: ['daughter', 'son', 'child'], suggest: 'child' })
  assert.deepEqual(reverseOf('cousin'), { words: ['cousin'], suggest: 'cousin' })
  assert.deepEqual(reverseOf('pet'), { words: ['pet owner'], suggest: 'pet owner' })
  assert.deepEqual(reverseOf('pet owner'), { words: ['pet'], suggest: 'pet' })
  assert.deepEqual(reverseOf('mother-in-law').words, ['daughter-in-law', 'son-in-law'])
  for (const t of TYPES) for (const w of reverseOf(t).words) assert.ok(TYPES.includes(w), `${t} -> ${w}`)
})

test('tray captions add Great- beyond their home row', () => {
  assert.equal(trayCaption('grandparents', -2), 'Grandparents')
  assert.equal(trayCaption('grandparents', -3), 'Great-grandparents')
  assert.equal(trayCaption('grandchildren', 4), 'Great-great-grandchildren')
  assert.equal(trayCaption('aunts-and-uncles', -2), 'Great-aunts and uncles')
  assert.equal(trayCaption('children-in-law', 1), 'In-laws')
  assert.equal(LIST_GROUPS[0].label, 'Asking to join')
  assert.equal(LIST_GROUPS.at(-1).label, 'Waiting to confirm')
})
