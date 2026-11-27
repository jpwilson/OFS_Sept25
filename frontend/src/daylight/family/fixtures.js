// The sample families as truth graphs (owner: FAMILY). docs/app/FAMILY.md section 6.
// Pure ESM (no DOM, no Node globals): the sample server, the tests and the dev-only
// ?links=preview all read it.
//
//   HARTLEYS, LARGE                 truth graphs: people, couples, parents, pets
//   egoWords(truth, viewer)         each person's own words for everyone else they are related to
//   truthLinks(truth, viewer)       facts among the viewer's relatives (what Stage 2 would add)
//   seedPairs(truth) / seedTags(truth)   the records the sample server keeps
//   relationshipRow, sentRow, pendingRow, tagRow   production-shaped rows from those records
//   idOf(truth, key) -> 'u:1' | 't:41'
//
// Finn is Kate and James's son (decided in FAMILY.md, so the app agrees with the landing).
// Everything here is invented sample data.
import { TYPES } from './kin.js'

const U = (id, name, sex, extra = {}) => ({ user: id, name, sex, ...extra })
const T = (id, name, sex, by, extra = {}) => ({ tag: id, name, sex, by, ...extra })

/** The Hartleys of Madison, as the landing draws them. Keys are the landing cast's keys. */
export const HARTLEYS = {
  key: 'hartley',
  people: {
    maya: U(1, 'Maya Hartley', 'f', { avatar: 'maya' }),
    tom: U(2, 'Tom Hartley', 'm', { avatar: 'tom' }),
    ivy: U(3, 'Ivy Hartley', 'f', { avatar: 'ivy' }),
    leo: U(4, 'Leo Hartley', 'm', { avatar: 'leo' }),
    ruth: U(5, 'Ruth Hartley', 'f', { avatar: 'ruth' }),
    joe: U(6, 'Joe Russo', 'm', { avatar: 'joe' }),
    kate: U(7, 'Kate Hartley', 'f', { avatar: 'kate' }),
    marcus: U(8, 'James Reed', 'm', { avatar: 'marcus', username: 'james' }),
    finn: U(9, 'Finn Hartley', 'm', { avatar: 'finn' }),
    biscuit: T(41, 'Biscuit', null, 'maya', { pet: true, avatar: 'biscuit', created: '2026-01-10T10:00:00Z' }),
  },
  spouses: [['maya', 'tom'], ['kate', 'marcus']],
  parents: [
    ['joe', 'maya'],
    ['ruth', 'tom'], ['ruth', 'kate'],
    ['maya', 'ivy'], ['tom', 'ivy'], ['maya', 'leo'], ['tom', 'leo'],
    ['kate', 'finn'], ['marcus', 'finn'],
  ],
  siblings: [],
  pets: [['maya', 'biscuit'], ['tom', 'biscuit']],
  // words a person uses that are not kinship (friends), viewer -> {other: word}
  words: {},
}

/**
 * About fifty people around Maya, mostly without photos: her mother and stepmother, her
 * brother and sister with their families, a half-sister, grandparents and a
 * great-grandmother (tags), aunts, uncles and eight cousins, Tom's family, friends, and a
 * neighbour and a godmother (tags with words of their own).
 */
export const LARGE = {
  key: 'large',
  people: {
    ...HARTLEYS.people,
    priya: U(10, 'Priya Nair', 'f', { avatar: 'priya' }),
    sam: U(11, 'Sam Lin', null, { avatar: 'sam' }),
    deb: U(12, 'Deb Walsh', 'f', { avatar: 'deb' }),
    ann: U(101, 'Ann Russo', 'f'),
    carol: U(102, 'Carol Russo', 'f'),
    nico: U(103, 'Nico Russo', 'm'),
    gina: U(104, 'Gina Russo', 'f'),
    marco: U(105, 'Marco Russo', 'm'),
    ella: U(106, 'Ella Russo', 'f'),
    frank: U(107, 'Frank Russo', 'm'),
    patty: U(108, 'Patty Russo', 'f'),
    teresa: U(109, 'Teresa Moretti', 'f'),
    paul: U(110, 'Paul Moretti', 'm'),
    diane: U(111, 'Diane Lane', 'f'),
    rick: U(112, 'Rick Lane', 'm'),
    anthony: U(113, 'Anthony Russo', 'm'),
    gianna: U(114, 'Gianna Russo', 'f'),
    dominic: U(115, 'Dominic Russo', 'm'),
    claire: U(116, 'Claire Moretti', 'f'),
    luke: U(117, 'Luke Moretti', 'm'),
    emma: U(118, 'Emma Lane', 'f'),
    jack: U(119, 'Jack Lane', 'm'),
    grace: U(120, 'Grace Lane', 'f'),
    ben: U(121, 'Ben Hartley', 'm'),
    amy: U(122, 'Amy Hartley', 'f'),
    owen: U(123, 'Owen Hartley', 'm'),
    mia: U(124, 'Mia Hartley', 'f'),
    laura: U(125, 'Laura Kim', 'f'),
    // Marco has an account; Maya never linked Erin's tag to him, so he waits with the nieces and nephews
    erin: T(201, 'Erin Russo', 'f', 'maya', { created: '2026-02-02T10:00:00Z', unlinked: ['marco'] }),
    sofia: T(202, 'Sofia Russo', 'f', 'maya', { created: '2026-02-02T10:05:00Z', birth: '2019-04-12' }),
    theo: T(203, 'Theo Russo', 'm', 'maya', { created: '2026-02-02T10:10:00Z', birth: '2021-09-30' }),
    lucy: T(204, 'Lucy Russo', 'f', 'maya', { created: '2026-02-03T09:00:00Z', word: 'half-sister' }),
    sal: T(205, 'Sal Russo', 'm', 'maya', { created: '2026-02-04T09:00:00Z' }),
    rosa: T(206, 'Rosa Russo', 'f', 'maya', { created: '2026-02-04T09:05:00Z' }),
    lucia: T(207, 'Nonna Lucia', 'f', 'maya', { created: '2026-02-04T09:10:00Z', extraLinks: [['joe', 'grandmother']] }),
    bill: T(208, 'Bill Hartley', 'm', 'maya', { created: '2026-02-05T09:00:00Z' }),
    hank: T(209, 'Hank Miller', 'm', 'maya', { created: '2026-02-06T09:00:00Z', word: 'neighbor' }),
    bea: T(210, 'Aunt Bea', 'f', 'maya', { created: '2026-02-06T09:05:00Z', word: 'godmother' }),
  },
  spouses: [
    ['maya', 'tom'], ['kate', 'marcus'], ['joe', 'ann'], ['joe', 'carol'], ['nico', 'erin'], ['frank', 'patty'],
    ['teresa', 'paul'], ['diane', 'rick'], ['ruth', 'bill'], ['ben', 'amy'], ['sal', 'rosa'],
  ],
  parents: [
    ...HARTLEYS.parents,
    ['ann', 'maya'], ['joe', 'nico'], ['ann', 'nico'], ['joe', 'gina'], ['ann', 'gina'], ['joe', 'lucy'], ['carol', 'lucy'],
    ['sal', 'joe'], ['rosa', 'joe'], ['sal', 'frank'], ['rosa', 'frank'], ['sal', 'teresa'], ['rosa', 'teresa'], ['lucia', 'sal'],
    ['frank', 'anthony'], ['patty', 'anthony'], ['frank', 'gianna'], ['patty', 'gianna'], ['frank', 'dominic'], ['patty', 'dominic'],
    ['teresa', 'claire'], ['paul', 'claire'], ['teresa', 'luke'], ['paul', 'luke'],
    ['diane', 'emma'], ['rick', 'emma'], ['diane', 'jack'], ['rick', 'jack'], ['diane', 'grace'], ['rick', 'grace'],
    ['bill', 'tom'], ['bill', 'kate'], ['ruth', 'ben'], ['bill', 'ben'],
    ['nico', 'sofia'], ['erin', 'sofia'], ['nico', 'marco'], ['erin', 'marco'], ['gina', 'theo'], ['gina', 'ella'],
    ['ben', 'owen'], ['amy', 'owen'], ['ben', 'mia'], ['amy', 'mia'],
  ],
  siblings: [['ann', 'diane']],
  pets: HARTLEYS.pets,
  words: {
    maya: { priya: 'friend', sam: 'friend', deb: 'friend', laura: 'friend' },
    priya: { maya: 'friend' }, sam: { maya: 'friend' }, deb: { maya: 'friend' }, laura: { maya: 'friend' },
  },
}

/**
 * The owner's own family's shape, with made-up names (owner-shape): the viewer and his wife
 * (both on the app), their two daughters (tags, birth dates known), his wife's father (a tag,
 * "father-in-law"), his mother (on the app), two brothers (on the app), two sisters (one on the
 * app, one a tag) and a cousin (on the app). His father and uncle are in the truth only, so the
 * cousin is a cousin; nobody added them. Tags carry only the creator's word (no other links).
 * Expected: his mother above him and his four siblings, his father-in-law above his wife, the
 * daughters under the couple (oldest on the left), the cousin in the Cousins tray on his row.
 */
export const OWNER = {
  key: 'owner-shape',
  creatorLinksOnly: true,
  people: {
    nate: U(301, 'Nate Walker', 'm'),
    lena: U(302, 'Lena Walker', 'f'),
    maureen: U(303, 'Maureen Walker', 'f'),
    rob: U(304, 'Rob Walker', 'm'),
    chris: U(305, 'Chris Walker', 'm'),
    kelly: U(306, 'Kelly Walker', 'f'),
    jake: U(307, 'Jake Walker', 'm'),
    rosie: T(401, 'Rosie Walker', 'f', 'nate', { created: '2026-03-01T10:00:00Z', birth: '2016-04-12' }),
    june: T(402, 'June Walker', 'f', 'nate', { created: '2026-03-01T10:05:00Z', birth: '2019-09-03' }),
    hal: T(403, 'Hal Brooks', 'm', 'nate', { created: '2026-03-02T10:00:00Z' }),
    megan: T(404, 'Megan Walker', 'f', 'nate', { created: '2026-03-02T10:05:00Z', birth: '1984-02-20' }),
    // in the truth only (no account, no tag): they make the cousin a cousin
    dad: { name: 'Pete Walker', sex: 'm' },
    gary: { name: 'Gary Walker', sex: 'm' },
  },
  spouses: [['nate', 'lena'], ['maureen', 'dad']],
  parents: [
    ['maureen', 'nate'], ['dad', 'nate'], ['maureen', 'rob'], ['dad', 'rob'], ['maureen', 'chris'], ['dad', 'chris'],
    ['maureen', 'kelly'], ['dad', 'kelly'], ['maureen', 'megan'], ['dad', 'megan'],
    ['nate', 'rosie'], ['lena', 'rosie'], ['nate', 'june'], ['lena', 'june'], ['hal', 'lena'], ['gary', 'jake'],
  ],
  siblings: [['dad', 'gary']],
  pets: [],
  words: {},
}

// ---------------------------------------------------------------- the graph
function graph(truth) {
  const up = new Map(), down = new Map(), mates = new Map(), sibs = new Map(), owners = new Map(), pets = new Map()
  const add = (m, k, v) => (m.get(k) || m.set(k, new Set()).get(k)).add(v)
  for (const [p, c] of truth.parents) { add(up, c, p); add(down, p, c) }
  for (const [a, b] of truth.spouses) { add(mates, a, b); add(mates, b, a) }
  for (const [a, b] of truth.siblings || []) { add(sibs, a, b); add(sibs, b, a) }
  for (const [o, p] of truth.pets || []) { add(owners, p, o); add(pets, o, p) }
  const get = (m, k) => [...(m.get(k) || [])]
  const parents = (k) => get(up, k)
  const children = (k) => get(down, k)
  const spouses = (k) => get(mates, k)
  const siblings = (k) => {
    const s = new Set(get(sibs, k))
    for (const p of parents(k)) for (const c of children(p)) if (c !== k) s.add(c)
    return [...s]
  }
  return { parents, children, spouses, siblings, owners: (k) => get(owners, k), pets: (k) => get(pets, k) }
}

const flat = (xs) => [...new Set(xs.flat())]
function ancestorsAt(g, k, n) {
  let level = [k]
  for (let i = 0; i < n; i++) level = flat(level.map(g.parents))
  return level
}
function descendantsAt(g, k, n) {
  let level = [k]
  for (let i = 0; i < n; i++) level = flat(level.map(g.children))
  return level
}

const SEXED = {
  partner: ['wife', 'husband', 'partner'],
  parent: ['mother', 'father', 'parent'],
  child: ['daughter', 'son', 'child'],
  sibling: ['sister', 'brother', 'sibling'],
  grandparent: ['grandmother', 'grandfather', 'grandparent'],
  grandchild: ['granddaughter', 'grandson', 'grandchild'],
  auntUncle: ['aunt', 'uncle', 'aunt'],
  nieceNephew: ['niece', 'nephew', 'niece'],
  cousin: ['cousin', 'cousin', 'cousin'],
  parentInLaw: ['mother-in-law', 'father-in-law', 'mother-in-law'],
  childInLaw: ['daughter-in-law', 'son-in-law', 'daughter-in-law'],
  siblingInLaw: ['sister-in-law', 'brother-in-law', 'sister-in-law'],
  stepParent: ['stepmother', 'stepfather', 'stepmother'],
  stepChild: ['stepdaughter', 'stepson', 'stepdaughter'],
}
const sexed = (kind, sex) => SEXED[kind][sex === 'f' ? 0 : sex === 'm' ? 1 : 2]

/** The word `viewer` uses for `other`, from the truth, or null when they have none. */
function wordFor(truth, g, viewer, other) {
  const sex = truth.people[other]?.sex
  const is = (list) => list.includes(other)
  if (truth.words?.[viewer]?.[other]) return truth.words[viewer][other]
  if (is(g.spouses(viewer))) return sexed('partner', sex)
  if (is(g.parents(viewer))) return sexed('parent', sex)
  if (is(g.children(viewer))) return sexed('child', sex)
  if (is(g.pets(viewer))) return 'pet'
  if (is(g.owners(viewer))) return 'pet owner'
  if (is(g.siblings(viewer))) return sexed('sibling', sex)
  for (let n = 2; n <= 5; n++) {
    if (is(ancestorsAt(g, viewer, n))) return `${'great-'.repeat(n - 2)}${sexed('grandparent', sex)}`
    if (is(descendantsAt(g, viewer, n))) return `${'great-'.repeat(n - 2)}${sexed('grandchild', sex)}`
  }
  const parentSibs = flat(g.parents(viewer).map(g.siblings))
  if (is(parentSibs) || is(flat(parentSibs.map(g.spouses)))) return sexed('auntUncle', sex)
  const mySibs = g.siblings(viewer)
  const mateSibs = flat(g.spouses(viewer).map(g.siblings))
  if (is(flat(mySibs.map(g.children))) || is(flat(mateSibs.map(g.children)))) return sexed('nieceNephew', sex)
  if (is(flat(parentSibs.map(g.children)))) return sexed('cousin', sex)
  if (is(flat(g.spouses(viewer).map(g.parents)))) return sexed('parentInLaw', sex)
  if (is(flat(g.children(viewer).map(g.spouses)))) return sexed('childInLaw', sex)
  if (is(mateSibs) || is(flat(mySibs.map(g.spouses))) || is(flat(mateSibs.map(g.spouses)))) return sexed('siblingInLaw', sex)
  if (is(flat(g.parents(viewer).map(g.spouses)))) return sexed('stepParent', sex)
  if (is(flat(g.spouses(viewer).map(g.children)))) return sexed('stepChild', sex)
  return null
}

/**
 * Each person's own words: {other: word} for everyone `viewer` is related to (tags
 * included), keys in a fixed order. A tag's own `word` (its relationship_to_creator) wins
 * for its creator.
 */
export function egoWords(truth, viewer) {
  const g = graph(truth)
  const out = {}
  for (const other of Object.keys(truth.people).sort()) {
    if (other === viewer) continue
    const p = truth.people[other]
    const w = p.tag != null && p.by === viewer && p.word ? p.word : wordFor(truth, g, viewer, other)
    if (w) out[other] = w
  }
  return out
}

/** 'u:<user id>' or 't:<tag id>' for a truth key. */
export function idOf(truth, key) {
  const p = truth.people[key]
  if (!p) return null
  return p.tag != null ? `t:${p.tag}` : `u:${p.user}`
}

/** The truth key for an arrange id. */
export function keyOfId(truth, id) {
  return Object.keys(truth.people).find((k) => idOf(truth, k) === id) || null
}

/**
 * Facts among the viewer's relatives (not about the viewer): couples, parents, pets, and
 * siblings whose shared parent is not among them. Shaped as arrange's extra facts:
 * {a, word, b} meaning "a is b's word". This is what a Stage-2 endpoint would let the
 * tree draw (FAMILY.md section 8); the page shows it only in the dev-only ?links=preview.
 */
export function truthLinks(truth, viewer) {
  const g = graph(truth)
  const words = egoWords(truth, viewer)
  const near = new Set(Object.keys(words).filter((k) => {
    const p = truth.people[k]
    return p.user != null || (p.tag != null && p.by === viewer)
  }))
  const id = (k) => idOf(truth, k)
  const sex = (k) => truth.people[k]?.sex
  const out = []
  for (const [a, b] of truth.spouses) {
    if (near.has(a) && near.has(b)) out.push({ a: id(a), word: sexed('partner', sex(a)), b: id(b) })
  }
  for (const [p, c] of truth.parents) {
    if (near.has(p) && near.has(c)) out.push({ a: id(c), word: sexed('child', sex(c)), b: id(p) })
  }
  for (const [o, p] of truth.pets || []) {
    if (near.has(o) && near.has(p)) out.push({ a: id(p), word: 'pet', b: id(o) })
  }
  for (const a of near) {
    for (const b of g.siblings(a)) {
      if (!near.has(b) || a >= b) continue
      const shared = g.parents(a).filter((x) => g.parents(b).includes(x))
      if (shared.some((x) => near.has(x) || x === viewer)) continue
      out.push({ a: id(a), word: sexed('sibling', sex(a)), b: id(b) })
    }
  }
  return out.sort((x, y) => `${x.a} ${x.b} ${x.word}`.localeCompare(`${y.a} ${y.b} ${y.word}`))
}

// ---------------------------------------------------------------- the records the sample keeps
const STAMP_C = '2026-01-05T10:00:00'
const STAMP_A = '2026-01-05T12:00:00'

/** Relationship id for a pair of user ids: stable, the same from either side. */
export const pairId = (a, b) => 5000 + Math.min(a, b) * 200 + Math.max(a, b)

/**
 * Confirmed relationships between every two account holders who each have a word for the
 * other (and both words are relationship types, as the backend insists).
 */
export function seedPairs(truth) {
  const keys = Object.keys(truth.people).filter((k) => truth.people[k].user != null).sort()
  const words = Object.fromEntries(keys.map((k) => [k, egoWords(truth, k)]))
  const out = []
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i], b = keys[j]
      const ab = words[a][b], ba = words[b][a]
      if (!ab || !ba || !TYPES.includes(ab) || !TYPES.includes(ba)) continue
      const ua = truth.people[a].user, ub = truth.people[b].user
      // the older account proposed: a fixed rule, so "proposed_by_me" never changes between runs
      const proposer = ua < ub ? a : b
      out.push({ id: pairId(ua, ub), a, b, aToB: ab, bToA: ba, status: 'accepted', by: proposer, created_at: STAMP_C, accepted_at: STAMP_A })
    }
  }
  return out
}

/** The tag profiles in the truth, with their links: the creator's word, then truth facts with account holders. */
export function seedTags(truth) {
  const g = graph(truth)
  const out = []
  let linkId = 900
  for (const key of Object.keys(truth.people).sort()) {
    const p = truth.people[key]
    if (p.tag == null) continue
    const word = egoWords(truth, p.by)[key] || null
    const links = []
    if (word) links.push({ id: linkId++, user: p.by, word })
    const isUser = (k) => !truth.creatorLinksOnly && truth.people[k]?.user != null && k !== p.by && !(p.unlinked || []).includes(k)
    const sex = p.sex
    for (const m of g.spouses(key).filter(isUser)) links.push({ id: linkId++, user: m, word: sexed('partner', sex) })
    for (const c of g.children(key).filter(isUser)) links.push({ id: linkId++, user: c, word: sexed('parent', sex) })
    for (const q of g.parents(key).filter(isUser)) links.push({ id: linkId++, user: q, word: sexed('child', sex) })
    for (const o of g.owners(key).filter(isUser)) links.push({ id: linkId++, user: o, word: 'pet' })
    for (const [u, w] of p.extraLinks || []) links.push({ id: linkId++, user: u, word: w })
    out.push({
      id: p.tag, key, name: p.name, photo: p.avatar || null, birth_date: p.birth || null, word, by: p.by,
      created_at: p.created || '2026-01-10T10:00:00Z', links,
    })
  }
  return out
}

// ---------------------------------------------------------------- production-shaped rows
// `dir(key)` -> {id, username, full_name, display_name, avatar_url} (the sample's users).
const shown = (u) => u.display_name || u.full_name || u.username

/** GET /relationships and /relationships/with/{id} (RelationshipResponse), for `viewer`. */
export function relationshipRow(rec, viewer, dir) {
  const mine = rec.a === viewer
  const other = dir(mine ? rec.b : rec.a)
  return {
    id: rec.id,
    other_user_id: other.id,
    other_user_username: other.username,
    other_user_display_name: shown(other),
    other_user_avatar_url: other.avatar_url ?? null,
    my_relationship_to_them: mine ? rec.aToB : rec.bToA,
    their_relationship_to_me: mine ? rec.bToA : rec.aToB,
    status: rec.status,
    proposed_by_me: rec.by === viewer,
    created_at: rec.created_at,
    accepted_at: rec.accepted_at ?? null,
  }
}

/** GET /relationships/sent (RelationshipSentResponse): a request `viewer` proposed. */
export function sentRow(rec, viewer, dir) {
  const mine = rec.a === viewer
  const other = dir(mine ? rec.b : rec.a)
  return {
    id: rec.id,
    recipient_id: other.id,
    recipient_username: other.username,
    recipient_display_name: shown(other),
    recipient_avatar_url: other.avatar_url ?? null,
    i_call_them: mine ? rec.aToB : rec.bToA,
    they_would_call_me: mine ? rec.bToA : rec.aToB,
    status: rec.status,
    created_at: rec.created_at,
  }
}

/** GET /relationships/pending (RelationshipRequestResponse): a request to `viewer`. */
export function pendingRow(rec, viewer, dir) {
  const mine = rec.a === viewer
  const other = dir(mine ? rec.b : rec.a)
  return {
    id: rec.id,
    proposer_id: other.id,
    proposer_username: other.username,
    proposer_display_name: shown(other),
    proposer_avatar_url: other.avatar_url ?? null,
    they_call_me: mine ? rec.bToA : rec.aToB,
    i_would_call_them: mine ? rec.aToB : rec.bToA,
    created_at: rec.created_at,
  }
}

/** TagProfileResponse, with its approved links (TagProfileRelationshipResponse). */
export function tagRow(tag, dir, photoUrl = (k) => k) {
  const by = dir(tag.by)
  return {
    name: tag.name,
    relationship_to_creator: tag.word ?? null,
    photo_url: tag.photo ? photoUrl(tag.photo) : null,
    birth_date: tag.birth_date ?? null,
    id: tag.id,
    created_by_id: by.id,
    created_by_username: by.username,
    created_by_display_name: shown(by),
    is_merged: false,
    merged_user_id: null,
    created_at: tag.created_at,
    relationships: tag.links.map((l) => {
      const u = dir(l.user)
      return { id: l.id, user_id: u.id, username: u.username, display_name: shown(u), avatar_url: u.avatar_url ?? null, relationship_type: l.word, created_at: tag.created_at }
    }),
  }
}

/** The production key lists, from backend/app/schemas (for the tests and the sample). */
export const SCHEMA_KEYS = {
  relationship: ['id', 'other_user_id', 'other_user_username', 'other_user_display_name', 'other_user_avatar_url', 'my_relationship_to_them', 'their_relationship_to_me', 'status', 'proposed_by_me', 'created_at', 'accepted_at'],
  pending: ['id', 'proposer_id', 'proposer_username', 'proposer_display_name', 'proposer_avatar_url', 'they_call_me', 'i_would_call_them', 'created_at'],
  sent: ['id', 'recipient_id', 'recipient_username', 'recipient_display_name', 'recipient_avatar_url', 'i_call_them', 'they_would_call_me', 'status', 'created_at'],
  tag: ['name', 'relationship_to_creator', 'photo_url', 'birth_date', 'id', 'created_by_id', 'created_by_username', 'created_by_display_name', 'is_merged', 'merged_user_id', 'created_at', 'relationships'],
  tagLink: ['id', 'user_id', 'username', 'display_name', 'avatar_url', 'relationship_type', 'created_at'],
}

/** A plain directory for tests and previews: the truth's own people as users. */
export function truthDirectory(truth, avatarUrl = (k) => `/__fx/avatar/${k}.webp`) {
  return (key) => {
    const p = truth.people[key]
    if (!p) throw new Error(`no such person ${key}`)
    return { id: p.user ?? p.tag, username: p.username || key, full_name: p.name, display_name: p.name, avatar_url: p.avatar ? avatarUrl(p.avatar) : null }
  }
}

/** Everything arrange needs for `viewer`, built from the truth (tests and the preview). */
export function viewOf(truth, viewer, dir = truthDirectory(truth)) {
  const me = dir(viewer)
  return {
    me: { id: me.id, username: me.username, full_name: me.full_name, display_name: me.display_name, avatar_url: me.avatar_url },
    relationships: seedPairs(truth).filter((r) => r.a === viewer || r.b === viewer).map((r) => relationshipRow(r, viewer, dir)),
    tags: seedTags(truth).filter((t) => t.by === viewer).map((t) => tagRow(t, dir)),
  }
}
