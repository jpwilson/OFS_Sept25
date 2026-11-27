// node --test src/daylight/family/*.test.js   (owner: FAMILY). Facts to structure.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { arrange, relationsOf, shortName, cmpPeople, orderSiblings, birthOf } from './arrange.js'
import { HARTLEYS, LARGE, OWNER, viewOf, truthLinks, keyOfId, egoWords, idOf } from './fixtures.js'

const VIEWERS = ['maya', 'tom', 'ivy', 'leo', 'ruth', 'joe', 'kate', 'marcus', 'finn']
const view = (truth, who, links = false) => {
  const v = viewOf(truth, who)
  if (links) v.links = truthLinks(truth, who)
  return v
}
const firstNames = (s, ids) => [...ids].map((id) => s.people.get(id).first).sort()
const drawnNames = (s) => firstNames(s, s.drawn)
const trayOf = (s, key) => s.trays.find((t) => t.key === key)
const trayNames = (s, key) => (trayOf(s, key)?.members || []).map((id) => s.people.get(id).first)
const lineBetween = (s, kind, a, b) => s.lines.find((l) => l.kind === kind && (kind === 'couple' ? (l.a === a && l.b === b) || (l.a === b && l.b === a) : l.from.includes(a) && l.to === b))
const U = (n) => `u:${n}`

// ---------------------------------------------------------------- the truth as an oracle
function truthIndex(truth) {
  const parents = new Map(), spouses = new Set()
  for (const [p, c] of truth.parents) (parents.get(c) || parents.set(c, new Set()).get(c)).add(p)
  for (const [o, p] of truth.pets) (parents.get(p) || parents.set(p, new Set()).get(p)).add(o)
  for (const [a, b] of truth.spouses) { spouses.add(`${a}|${b}`); spouses.add(`${b}|${a}`) }
  const sib = (a, b) => [...(parents.get(a) || [])].some((p) => (parents.get(b) || new Set()).has(p)) || (truth.siblings || []).some(([x, y]) => (x === a && y === b) || (x === b && y === a))
  const isParent = (p, c) => !!parents.get(c)?.has(p)
  const coParents = (a, b) => [...parents.entries()].some(([, ps]) => ps.has(a) && ps.has(b))
  return { isParent, sib, spouse: (a, b) => spouses.has(`${a}|${b}`), coParents }
}

/** Every line the arrangement draws is true in the truth graph; only C1 and C2 may differ. */
function assertNoInventedLine(truth, viewer, s, label) {
  const T = truthIndex(truth)
  const k = (id) => keyOfId(truth, id)
  for (const r of relationsOf(s)) {
    if (r.type === 'couple') {
      const a = k(r.a), b = k(r.b)
      assert.ok(T.spouse(a, b) || T.coParents(a, b), `${label}: couple ${a}-${b} is not in the truth`)
    } else if (r.type === 'descent') {
      const c = k(r.child)
      const ps = r.parents.map(k)
      if (r.conv === 'C1') assert.ok(T.isParent(viewer, c), `${label}: C1 still needs you to be ${c}'s parent`)
      else if (r.conv === 'C2') assert.ok(T.sib(viewer, c), `${label}: C2 is for your siblings, not ${c}`)
      else for (const p of ps) assert.ok(T.isParent(p, c), `${label}: ${p} is not ${c}'s parent`)
    } else if (r.type === 'bar') {
      const ms = r.members.map(k)
      for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) if (r.conv !== 'C2') assert.ok(T.sib(ms[i], ms[j]), `${label}: ${ms[i]} and ${ms[j]} are not siblings`)
    }
  }
}

// ---------------------------------------------------------------- Maya, as the app can draw her today
test("Maya: the confirmed tree, with the rest waiting in trays (no invented lines)", () => {
  const s = arrange(view(HARTLEYS, 'maya'))
  assert.deepEqual(drawnNames(s), ['Biscuit', 'Ivy', 'Joe', 'Leo', 'Maya', 'Ruth', 'Tom'])
  assert.deepEqual(s.root.core.members, [U(1), U(2)], 'you left of your partner')
  assert.deepEqual(trayNames(s, 'in-laws'), ['James', 'Kate'])
  assert.equal(trayOf(s, 'in-laws').side, 'right', 'in-laws right when you have a partner')
  assert.equal(trayOf(s, 'in-laws').row, 0)
  assert.deepEqual(trayNames(s, 'nieces-and-nephews'), ['Finn'])
  assert.equal(trayOf(s, 'nieces-and-nephews').side, 'right', 'right: no siblings in the tree')
  assert.equal(s.count, 10)
  assert.equal(s.generations, 3)
  // Ivy, Leo, then the pet (people before pets), from Maya and Tom's join (C1)
  assert.deepEqual(s.root.core.groups[0].children.map((c) => s.people.get(c.blood).first), ['Ivy', 'Leo', 'Biscuit'])
  const mt = lineBetween(s, 'couple', U(1), U(2))
  assert.equal(mt.tone, 'fizz')
  assert.ok(mt.tick, 'a tick on your partner\'s line')
  const joe = lineBetween(s, 'descent', U(6), U(1))
  assert.equal(joe.tone, 'azure')
  assert.ok(joe.tick, 'a tick on your parents\' line')
  assert.equal(lineBetween(s, 'descent', U(5), U(2)).tone, 'zest', "your partner's parents")
  const biscuit = s.lines.find((l) => l.to === 't:41')
  assert.ok(biscuit.dashed, 'lines to tags are dashed')
  assert.equal(biscuit.tone, 'lime')
  assert.equal(biscuit.conv, 'C1')
  // steps: your unit, the row above, the row below, then trays, then Add (step 3 was empty and dropped)
  const st = (id) => s.steps.get(id)
  assert.deepEqual([st(U(1)), st(U(2)), st(U(6)), st(U(5)), st(U(3)), st('t:41'), st(U(7))], [0, 0, 1, 1, 2, 2, 3])
  assert.equal(s.finalStep, 4)
  assertNoInventedLine(HARTLEYS, 'maya', s, 'maya')
})

test("Maya with the Stage-2 links: the landing's drawing", () => {
  const s = arrange(view(HARTLEYS, 'maya', true))
  assert.equal(s.drawn.size, 10)
  assert.equal(s.trays.length, 0)
  const right = s.root.right
  assert.deepEqual(right.members, [U(5)], 'Ruth above Tom')
  const kids = right.groups[0].children
  assert.equal(kids[0], 'LINE', 'your partner leftmost in their sibling group')
  assert.deepEqual(kids[1].members, [U(7), U(8)], 'Kate beside Tom, James outside')
  assert.deepEqual(kids[1].groups[0].children.map((c) => c.blood), [U(9)], 'Finn under Kate and James')
  assert.equal(lineBetween(s, 'couple', U(7), U(8)).tone, 'violet')
  assert.equal(s.steps.get(U(9)), s.steps.get(U(7)), 'Finn grows with his parents')
  assertNoInventedLine(HARTLEYS, 'maya', s, 'maya+links')
})

test('every Hartley viewer: drawn people, trays and no invented line, with and without links', () => {
  const expect = {
    // Biscuit is Maya's tag (Tom never sees it); Kate is Tom's sister, so she shares Ruth's line (C2)
    tom: { drawn: ['Ivy', 'Joe', 'Kate', 'Leo', 'Maya', 'Ruth', 'Tom'], trays: { 'in-laws': ['James'], 'nieces-and-nephews': ['Finn'] } },
    ivy: { drawn: ['Ivy', 'Leo', 'Maya', 'Tom'], trays: { grandparents: ['Joe', 'Ruth'], 'aunts-and-uncles': ['James', 'Kate'], cousins: ['Finn'] } },
    leo: { drawn: ['Ivy', 'Leo', 'Maya', 'Tom'], trays: { grandparents: ['Joe', 'Ruth'], cousins: ['Finn'] } },
    ruth: { drawn: ['Kate', 'Ruth', 'Tom'], trays: { grandchildren: ['Finn', 'Ivy', 'Leo'], 'children-in-law': ['James', 'Maya'] } },
    joe: { drawn: ['Joe', 'Maya'], trays: { grandchildren: ['Ivy', 'Leo'], 'children-in-law': ['Tom'] } },
    kate: { drawn: ['Finn', 'James', 'Kate', 'Ruth', 'Tom'], trays: { 'in-laws': ['Maya'], 'nieces-and-nephews': ['Ivy', 'Leo'] } },
    marcus: { drawn: ['Finn', 'James', 'Kate', 'Ruth'], trays: { 'in-laws': ['Maya', 'Tom'], 'nieces-and-nephews': ['Ivy', 'Leo'] } },
    finn: { drawn: ['Finn', 'James', 'Kate'], trays: { grandparents: ['Ruth'], 'aunts-and-uncles': ['Maya', 'Tom'], cousins: ['Ivy', 'Leo'] } },
  }
  for (const who of VIEWERS) {
    const s = arrange(view(HARTLEYS, who))
    if (expect[who]) {
      assert.deepEqual(drawnNames(s), expect[who].drawn, who)
      for (const [key, names] of Object.entries(expect[who].trays)) assert.deepEqual(trayNames(s, key), names, `${who} ${key}`)
    }
    assertNoInventedLine(HARTLEYS, who, s, who)
    const linked = arrange(view(HARTLEYS, who, true))
    assertNoInventedLine(HARTLEYS, who, linked, `${who}+links`)
    const related = Object.keys(egoWords(HARTLEYS, who)).filter((k) => HARTLEYS.people[k].user != null || HARTLEYS.people[k].by === who)
    assert.equal(linked.drawn.size, related.length + 1, `${who}: with the links everyone stands in the tree`)
  }
})

test("Kate's own view: her brother shares her mother's line (C2), her husband and son beside her", () => {
  const s = arrange(view(HARTLEYS, 'kate'))
  assert.deepEqual(s.root.core.members, [U(7), U(8)])
  assert.deepEqual(s.root.left.members, [U(5)])
  const g = s.root.left.groups[0].children
  assert.equal(g.at(-1), 'LINE', 'you rightmost')
  assert.equal(g[0].blood, U(2), 'Tom to your left')
  assert.equal(lineBetween(s, 'descent', U(5), U(2)).conv, 'C2')
  assert.equal(trayOf(s, 'nieces-and-nephews').side, 'left', 'left: you have a sibling in the tree')
})

test("Ivy with links: an hourglass, Kate beside her brother Tom, Finn below his parents", () => {
  const s = arrange(view(HARTLEYS, 'ivy', true))
  const left = s.root.left
  assert.deepEqual(left.members, [U(2), U(5).replace('5', '1')], 'your parents: father, mother')
  const tomSide = left.ups.find((x) => x.member === U(2)).up
  assert.equal(tomSide.flank, 'left')
  const kate = tomSide.groups[0].children[0]
  assert.deepEqual(kate.members, [U(8), U(7)], 'Kate inner, James outer on the left')
  assert.equal(left.ups.find((x) => x.member === U(1)).up.flank, 'right', 'no partner: the inner parent opens to the free right side')
})

test("the middle: an inner parent's brothers and sisters stand only where nobody else's family does", () => {
  // you, your father and mother, your mother's sister (linked through a grandmother tag)
  const base = {
    me: ME,
    relationships: [rel(2, 'Lou Morgan', 'father'), rel(3, 'Pat Morgan', 'mother'), rel(4, 'Sue Lane', 'aunt')],
    tags: [tag(40, 'Grandma Rose', 'grandmother', [[3, 'mother'], [4, 'mother']])],
  }
  const free = arrange(base)
  assert.ok(free.drawn.has(U(4)), 'no partner: your mother\'s sister stands to the right')
  const taken = arrange({ ...base, relationships: [...base.relationships, rel(5, 'Sam Kane', 'wife'), rel(6, 'Ida Kane', 'mother-in-law')] })
  assert.ok(!taken.drawn.has(U(4)), 'your partner\'s family stands there: she waits in a tray')
  assert.deepEqual(trayNames(taken, 'aunts-and-uncles'), ['Sue'])
  assert.ok(taken.drawn.has('t:40'), 'your grandmother is still drawn above your mother')
})

test('the large family: about fifty people, rules and links, trays and the shelf', () => {
  const s = arrange(view(LARGE, 'maya'))
  assert.ok(s.people.size >= 46, `${s.people.size}`)
  const P = (k) => idOf(LARGE, k)
  // your parents father, mother; the stepmother joined to your only father, outside
  assert.deepEqual(s.root.left.members, [P('carol'), P('joe'), P('ann')])
  assert.ok(lineBetween(s, 'couple', P('joe'), P('carol')))
  // your siblings by name, you rightmost; your half-sister from her two parents' join
  const groups = s.root.left.groups
  assert.deepEqual(groups.map((g) => g.anchor), [[P('joe'), P('carol')], [P('joe'), P('ann')]])
  assert.deepEqual(groups[1].children.map((c) => (c === 'LINE' ? 'you' : s.people.get(c.blood).first)), ['Gina', 'Nico', 'you'])
  assert.deepEqual(groups[0].children.map((c) => s.people.get(c.blood).first), ['Lucy'])
  // grandparents (tags) above Joe, his brother and sister beside him on the outer side
  const sal = s.root.left.ups[0].up
  assert.deepEqual(sal.members, [P('sal'), P('rosa')])
  assert.deepEqual(sal.groups[0].children.map((c) => (c === 'LINE' ? 'Joe' : s.people.get(c.blood).first)), ['Frank', 'Teresa', 'Joe'])
  // Tom's parents turn round so Bill's own children can stand beside Tom
  assert.deepEqual(s.root.right.members, [P('ruth'), P('bill')])
  assert.deepEqual(s.root.right.groups.map((g) => g.children.map((c) => (c === 'LINE' ? 'Tom' : s.people.get(c.blood).first))), [['Tom'], ['Ben', 'Kate']])
  assert.equal(trayNames(s, 'cousins').length, 8)
  assert.equal(trayOf(s, 'cousins').side, 'left')
  assert.deepEqual(trayNames(s, 'grandparents'), ['Nonna Lucia'])
  assert.equal(trayOf(s, 'grandparents').caption, 'Great-grandparents')
  assert.equal(trayOf(s, 'grandparents').row, -3)
  assert.deepEqual(s.shelf.map((id) => s.people.get(id).first), ['Aunt Bea', 'Deb', 'Hank', 'Laura', 'Priya', 'Sam'])
  assertNoInventedLine(LARGE, 'maya', s, 'large')
  assertNoInventedLine(LARGE, 'maya', arrange(view(LARGE, 'maya', true)), 'large+links')
})

// ---------------------------------------------------------------- determinism
function rng(seed) {
  let x = seed >>> 0
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32)
}
function shuffle(list, r) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const canon = (s) => JSON.stringify({ ...s, people: [...s.people.keys()], drawn: [...s.drawn].sort(), asked: [...s.asked].sort(), units: [...s.units.entries()], unitOf: [...s.unitOf.entries()].sort(), anchors: [...s.anchors.entries()].sort(), steps: [...s.steps.entries()].sort() })

test('shuffled inputs give identical output, byte for byte', () => {
  for (const [truth, who] of [[HARTLEYS, 'maya'], [HARTLEYS, 'ivy'], [LARGE, 'maya']]) {
    for (const links of [false, true]) {
      const v = view(truth, who, links)
      const want = canon(arrange(v))
      for (let seed = 1; seed <= 6; seed++) {
        const r = rng(seed * 7919)
        const w = {
          me: v.me,
          relationships: shuffle(v.relationships, r),
          tags: shuffle(v.tags, r).map((t) => ({ ...t, relationships: shuffle(t.relationships, r) })),
          links: v.links ? shuffle(v.links, r) : undefined,
        }
        assert.equal(canon(arrange(w)), want, `${truth.key} ${who} links=${links} seed=${seed}`)
      }
    }
  }
})

// ---------------------------------------------------------------- edge cases
const ME = { id: 1, username: 'me', full_name: 'Alex Morgan', display_name: 'Alex Morgan', avatar_url: null }
let nextRel = 100
const rel = (id, name, mine, theirs = 'other') => ({
  id: nextRel++, other_user_id: id, other_user_username: name.toLowerCase().split(' ')[0], other_user_display_name: name, other_user_avatar_url: null,
  my_relationship_to_them: mine, their_relationship_to_me: theirs, status: 'accepted', proposed_by_me: true, created_at: '2026-01-01T00:00:00', accepted_at: '2026-01-01T00:00:00',
})
const tag = (id, name, word, links = [], extra = {}) => ({
  name, relationship_to_creator: word, photo_url: null, birth_date: extra.birth || null, id, created_by_id: 1, created_by_username: 'me', created_by_display_name: 'Alex Morgan',
  is_merged: !!extra.merged, merged_user_id: null, created_at: '2026-01-01T00:00:00',
  relationships: [...(word ? [{ id: id * 10, user_id: 1, username: 'me', display_name: 'Alex Morgan', avatar_url: null, relationship_type: word, created_at: '2026-01-01T00:00:00' }] : []),
    ...links.map(([uid, w], i) => ({ id: id * 10 + i + 1, user_id: uid, username: `u${uid}`, display_name: `U ${uid}`, avatar_url: null, relationship_type: w, created_at: '2026-01-01T00:00:00' }))],
})
const sent = (id, name, mine) => ({ id: nextRel++, recipient_id: id, recipient_username: name.toLowerCase(), recipient_display_name: name, recipient_avatar_url: null, i_call_them: mine, they_would_call_me: 'other', status: 'pending', created_at: '2026-01-01T00:00:00' })

test('empty: just you, then Add a relative', () => {
  const s = arrange({ me: ME, relationships: [], tags: [] })
  assert.deepEqual([...s.drawn], [U(1)])
  assert.equal(s.lines.length, 0)
  assert.equal(s.trays.length, 0)
  assert.equal(s.count, 1)
  assert.equal(s.steps.get(U(1)), 0)
  assert.equal(s.finalStep, 1, 'growth: you, then Add a relative')
})

test('C1: children hang from you and your only partner, else from you', () => {
  const one = arrange({ me: ME, relationships: [rel(2, 'Sam Morgan', 'wife'), rel(3, 'Bo Morgan', 'son')] })
  assert.deepEqual(one.lines.find((l) => l.to === U(3)).from, [U(1), U(2)])
  const none = arrange({ me: ME, relationships: [rel(3, 'Bo Morgan', 'son')] })
  assert.deepEqual(none.lines.find((l) => l.to === U(3)).from, [U(1)])
  const two = arrange({ me: ME, relationships: [rel(2, 'Sam Morgan', 'wife'), rel(4, 'Ana Ruiz', 'husband'), rel(3, 'Bo Morgan', 'son')] })
  assert.deepEqual(two.root.core.members, [U(2), U(1), U(4)], 'a second partner left of you')
  assert.deepEqual(two.lines.find((l) => l.to === U(3)).from, [U(1)], 'two partners: from you')
  const three = arrange({ me: ME, relationships: [rel(2, 'Sam Morgan', 'wife'), rel(4, 'Ana Ruiz', 'husband'), rel(5, 'Cy Lee', 'wife')] })
  assert.deepEqual(trayNames(three, 'partners'), ['Sam'])
})

test('C2: siblings share your parents\' join; with no parent, a sibling bar (you rightmost)', () => {
  const s = arrange({ me: ME, relationships: [rel(2, 'Zoe Morgan', 'sister'), rel(3, 'Ben Morgan', 'brother')] })
  const bar = s.lines.find((l) => l.kind === 'bar')
  assert.deepEqual(bar.members, [U(3), U(2), U(1)])
  assert.equal(bar.conv, 'C2')
  const p = arrange({ me: ME, relationships: [rel(2, 'Zoe Morgan', 'sister'), rel(4, 'Pat Morgan', 'mother'), rel(5, 'Lou Morgan', 'father')] })
  assert.deepEqual(p.root.left.members, [U(5), U(4)], 'father, mother')
  assert.equal(p.lines.find((l) => l.to === U(2)).conv, 'C2')
  assert.deepEqual(p.lines.find((l) => l.to === U(2)).from, [U(5), U(4)])
})

test('parents: two form your join, a third gets their own line', () => {
  const s = arrange({ me: ME, relationships: [rel(2, 'Pat Morgan', 'mother'), rel(3, 'Lou Morgan', 'father'), rel(4, 'Kim Ray', 'parent')] })
  assert.deepEqual(s.root.left.members, [U(3), U(2)])
  assert.ok(s.lines.find((l) => l.kind === 'own' && l.from[0] === U(4) && l.to === U(1)))
})

test('step-parents: joined to your only father; otherwise a tray', () => {
  const s = arrange({ me: ME, relationships: [rel(2, 'Lou Morgan', 'father'), rel(3, 'Di Morgan', 'stepmother')] })
  assert.deepEqual(s.root.left.members, [U(3), U(2)], 'step-parent outside, your father nearest you')
  assert.deepEqual(s.lines.find((l) => l.to === U(1)).from, [U(2)], 'you hang from your father alone')
  const t = arrange({ me: ME, relationships: [rel(3, 'Di Morgan', 'stepmother')] })
  assert.deepEqual(trayNames(t, 'step-parents'), ['Di'])
  assert.equal(trayOf(t, 'step-parents').side, 'left')
})

test('in-laws: your only partner hangs from their parents; with two partners, a tray', () => {
  const s = arrange({ me: ME, relationships: [rel(2, 'Sam Morgan', 'wife'), rel(3, 'Ida Kane', 'mother-in-law'), rel(4, 'Rob Kane', 'father-in-law')] })
  assert.deepEqual(s.root.right.members, [U(4), U(3)])
  const two = arrange({ me: ME, relationships: [rel(2, 'Sam Morgan', 'wife'), rel(5, 'Ana Ruiz', 'husband'), rel(3, 'Ida Kane', 'mother-in-law')] })
  assert.deepEqual(trayNames(two, 'parents-in-law'), ['Ida'])
  assert.equal(trayOf(two, 'parents-in-law').side, 'right')
})

test('stepchildren hang from your only partner, right of your children', () => {
  const s = arrange({ me: ME, relationships: [rel(2, 'Sam Morgan', 'wife'), rel(3, 'Bo Morgan', 'son'), rel(4, 'Cal Kane', 'stepson')] })
  assert.deepEqual(s.root.core.groups.map((g) => g.anchor), [[U(1), U(2)], [U(2)]])
  assert.deepEqual(s.lines.find((l) => l.to === U(4)).from, [U(2)])
})

test('never a substring: a godmother is not a mother; friends and other words go to the shelf', () => {
  const s = arrange({ me: ME, relationships: [rel(2, 'Pat Morgan', 'friend')], tags: [tag(7, 'Aunt Bea', 'godmother'), tag(8, 'Hank Miller', 'neighbor'), tag(9, 'Nobody', '')] })
  assert.deepEqual([...s.drawn], [U(1)])
  assert.deepEqual(s.shelf.map((id) => s.people.get(id).first).sort(), ['Aunt Bea', 'Hank', 'Nobody', 'Pat'])
  assert.equal(s.root.left, null)
})

test('tag links draw nieces and grandchildren; a contradicting link is dropped', () => {
  const s = arrange({
    me: ME,
    relationships: [rel(2, 'Ben Morgan', 'brother'), rel(3, 'Bo Morgan', 'son')],
    tags: [tag(20, 'Lily Morgan', 'niece', [[2, 'daughter']]), tag(21, 'Ava Morgan', 'granddaughter', [[3, 'daughter']]), tag(22, 'Rex', 'dog', [[2, 'father']])],
  })
  assert.ok(s.drawn.has('t:20'))
  assert.deepEqual(s.lines.find((l) => l.to === 't:20').from, [U(2)])
  assert.ok(s.drawn.has('t:21'))
  assert.deepEqual(s.lines.find((l) => l.to === 't:21').from, [U(3)])
  assert.ok(s.dropped.some((d) => d.why === 'contradicts the rows'), 'Rex the dog is not Ben\'s father')
  assert.deepEqual(s.lines.find((l) => l.to === 't:22').from, [U(1)], 'Rex is your pet (C1)')
  const lone = arrange({ me: ME, relationships: [rel(3, 'Bo Morgan', 'son')], tags: [tag(23, 'Kai', 'nephew')] })
  assert.deepEqual(trayNames(lone, 'nieces-and-nephews'), ['Kai'], 'no link: a tray, never a guessed parent')
})

test('people you asked: placed by your word, faint, never an anchor', () => {
  const s = arrange({
    me: ME,
    relationships: [rel(2, 'Lou Morgan', 'father'), rel(3, 'Bo Morgan', 'son')],
    sent: [sent(10, 'Sam Ruiz', 'wife'), sent(11, 'Pat Morgan', 'mother'), sent(12, 'Zoe Morgan', 'sister'), sent(13, 'Cy Morgan', 'daughter'), sent(14, 'Di Lane', 'aunt')],
  })
  assert.deepEqual(s.root.core.members, [U(1), U(10)])
  assert.ok(s.lines.find((l) => l.kind === 'couple' && l.b === U(10)).faint)
  assert.deepEqual(s.lines.find((l) => l.to === U(3)).from, [U(1)], 'your son hangs from you: an asked partner is not a join')
  assert.deepEqual(s.lines.find((l) => l.to === U(1) && l.kind === 'descent').from, [U(2)], 'your asked mother does not join your father')
  assert.ok(s.lines.find((l) => l.kind === 'own' && l.from[0] === U(11)).faint)
  assert.ok(s.lines.find((l) => l.to === U(12)).faint)
  assert.ok(s.lines.find((l) => l.to === U(13)).faint)
  assert.deepEqual(trayNames(s, 'aunts-and-uncles'), ['Di'])
  for (const id of [U(10), U(11), U(12), U(13)]) assert.equal(s.steps.get(id), s.steps.get(U(14)), 'asked people grow with the trays')
  assert.equal(s.count, 3, 'people you asked are not counted yet')
})

test('names: first names, titles kept, the same first name told apart', () => {
  assert.equal(shortName('Maya Hartley'), 'Maya')
  assert.equal(shortName('Aunt Bea'), 'Aunt Bea')
  assert.equal(shortName('Nonna Lucia Russo'), 'Nonna Lucia')
  assert.equal(shortName(''), 'Someone')
  const s = arrange({ me: ME, relationships: [rel(2, 'John Smith', 'brother'), rel(3, 'John Doe', 'cousin')] })
  assert.deepEqual(firstNames(s, [U(2), U(3)]), ['John D.', 'John S.'])
  const pets = [{ first: 'Ace', name: 'Ace', id: 'a', info: { pet: true } }, { first: 'Zed', name: 'Zed', id: 'b', info: {} }]
  assert.deepEqual([...pets].sort(cmpPeople).map((p) => p.first), ['Zed', 'Ace'], 'people before pets')
})

test('merged tags and broken rows are ignored, never thrown on', () => {
  const s = arrange({ me: ME, relationships: [null, { other_user_id: 5, my_relationship_to_them: 'son' }], tags: [tag(30, 'Old Me', 'son', [], { merged: true }), null] })
  assert.ok(s.drawn.has(U(5)))
  assert.equal(s.people.get(U(5)).name, 'Someone')
  assert.ok(!s.people.has('t:30'))
})

// ---------------------------------------------------------------- the owner's notes: a traditional tree, by age where known
const kid = (first, birth, extra = {}) => ({ id: `t:${first}`, first, name: `${first} Ray`, birth: birth || null, info: {}, ...extra })

test('siblings and children: by first name, the known ages re-ordered oldest first among their own places', () => {
  const names = (list) => orderSiblings(list).map((p) => p.first)
  // everyone dated: pure age order
  assert.deepEqual(names([kid('Ava', '2019-01-01'), kid('Zoe', '2012-05-05'), kid('Max', '2015-03-03')]), ['Zoe', 'Max', 'Ava'])
  // nobody dated: first names
  assert.deepEqual(names([kid('Zoe'), kid('Ava'), kid('Max')]), ['Ava', 'Max', 'Zoe'])
  // some dated: the undated keep their name places; the dated swap into age order among theirs
  assert.deepEqual(names([kid('Ava', '2019-01-01'), kid('Ben'), kid('Cal', '2010-01-01')]), ['Cal', 'Ben', 'Ava'])
  // one dated: nothing to compare, name order (nobody drawn older than we know)
  assert.deepEqual(names([kid('Ava', '2019-01-01'), kid('Ben')]), ['Ava', 'Ben'])
  // people before pets, each by age
  assert.deepEqual(names([kid('Rex', '2020-01-01', { info: { pet: true } }), kid('Ava', '2019-01-01'), kid('Zoe', '2012-05-05')]), ['Zoe', 'Ava', 'Rex'])
  // a user's birth date slots in once the API sends one
  assert.equal(birthOf({ other_user_birth_date: '1980-02-03T00:00:00' }), '1980-02-03')
  assert.equal(birthOf({ birth_date: null }), null)
  assert.equal(birthOf({ birth_date: 'soon' }), null)
})

test("the owner's family shape reads as a traditional tree", () => {
  const s = arrange(view(OWNER, 'nate'))
  const P = (k) => idOf(OWNER, k)
  const name = (b) => (b === 'LINE' ? 'Nate' : s.people.get(b.blood).first)
  // his mother above him and his four siblings, in one row under her line; he stands beside his wife
  assert.deepEqual(s.root.left.members, [P('maureen')])
  assert.deepEqual(s.root.left.groups[0].children.map(name), ['Chris', 'Kelly', 'Megan', 'Rob', 'Nate'])
  for (const k of ['chris', 'kelly', 'megan', 'rob']) assert.equal(lineBetween(s, 'descent', P('maureen'), P(k)).conv, 'C2')
  // his father-in-law (a tag) above his wife
  assert.deepEqual(s.root.right.members, [P('hal')])
  assert.ok(lineBetween(s, 'descent', P('hal'), P('lena')).dashed)
  // the daughters below the couple, oldest on the left (Rosie 2016, June 2019; by name it would be June first)
  assert.deepEqual(s.root.core.groups[0].anchor, [P('nate'), P('lena')])
  assert.deepEqual(s.root.core.groups[0].children.map(name), ['Rosie', 'June'])
  // the cousin in the Cousins tray on his row
  assert.deepEqual(trayNames(s, 'cousins'), ['Jake'])
  assert.equal(trayOf(s, 'cousins').row, 0)
  assert.equal(s.trays.length, 1)
  // strict generations: three rows
  assert.deepEqual(s.rows, [-1, 0, 1])
  assert.equal(s.count, 11)
  assertNoInventedLine(OWNER, 'nate', s, 'owner')
  // tags dashed, accounts solid
  assert.ok(lineBetween(s, 'descent', P('maureen'), P('megan')).dashed)
  assert.ok(!lineBetween(s, 'descent', P('maureen'), P('rob')).dashed)
})

test('you stand by age among your siblings when every age is known and no in-law family is to your right', () => {
  const dated = (id, name, word, birth) => ({ ...rel(id, name, word), other_user_birth_date: birth })
  const sibs = [dated(2, 'Zed Morgan', 'brother', '1975-01-01'), dated(3, 'Amy Morgan', 'sister', '1990-01-01'), dated(4, 'Lou Morgan', 'father', null)]
  const meDated = { ...ME, birth_date: '1982-06-01' }
  const order = (st) => st.root.left.groups[0].children.map((c) => (c === 'LINE' ? 'you' : st.people.get(c.blood).first))
  assert.deepEqual(order(arrange({ me: meDated, relationships: sibs })), ['Zed', 'you', 'Amy'])
  assert.deepEqual(order(arrange({ me: ME, relationships: sibs })), ['Zed', 'Amy', 'you'], 'your age unknown: you stay at the end, siblings by age')
  const withInLaws = [...sibs, rel(5, 'Sam Kane', 'wife'), rel(6, 'Ida Kane', 'mother-in-law')]
  assert.deepEqual(order(arrange({ me: meDated, relationships: withInLaws })), ['Zed', 'Amy', 'you'], 'beside your partner when their family stands to your right')
})
