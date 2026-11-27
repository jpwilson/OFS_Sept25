// Facts to structure (owner: FAMILY). docs/app/FAMILY.md section 2.
// Pure ESM: no DOM, no JSX, explicit extensions, so `node --test` runs it. Deterministic: a
// total order everywhere, never the API's order, no clock, no randomness.
//
//   arrange({me, relationships, tags, sent, links}) -> structure
//     me             the signed-in user (GET /users/me)
//     relationships  GET /relationships (your confirmed relationships)
//     tags           GET /tag-profiles/mine (tag profiles you created, with their links)
//     sent           GET /relationships/sent (people you asked: drawn faint, never anchors)
//     links          extra facts {a, word, b} among your relatives ("a is b's word"); only the
//                    dev-only ?links=preview passes them (what a Stage-2 endpoint would add)
//
// structure: {
//   me, people: Map<id, person>, drawn: Set<id>, asked: Set<id>,
//   units: Map<unitId, {id, row, members}>, root: {core, left, right, extra},
//   lines: [{id, kind: 'couple'|'descent'|'bar'|'own', ...}], trays: [...], shelf: [ids],
//   steps: Map<id, step>, stepCount, rows: [..], count, generations, dropped: [...]
// }
// A person id is 'u:<user id>' or 't:<tag id>'.
import { readWord, trayCaption } from './kin.js'

export const collator = new Intl.Collator('en', { sensitivity: 'base' })

// ---------------------------------------------------------------- names and order
const TITLES = new Set(['grandma', 'grandpa', 'granny', 'nana', 'nonna', 'nonno', 'oma', 'opa', 'aunt', 'auntie', 'aunty', 'uncle', 'great', 'papa', 'mama', 'baby', 'cousin'])

/** The name under a face: a first name, or the whole name when it starts with a title ("Aunt Bea"). */
export function shortName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'Someone'
  if (parts.length > 1 && TITLES.has(parts[0].toLowerCase())) return parts.slice(0, 2).join(' ')
  return parts[0]
}

const isPet = (p) => !!p.info?.pet
/** Total order: people before pets, then first name, then full name, then id. */
export function cmpPeople(a, b) {
  return (
    (isPet(a) ? 1 : 0) - (isPet(b) ? 1 : 0) ||
    collator.compare(a.first, b.first) ||
    collator.compare(a.name, b.name) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  )
}
/**
 * Siblings and children, oldest on the left where we know it: first by first name, then
 * everyone whose birth date is known re-ordered by age among their own places. All dated: pure
 * age order. None dated: first names. So nobody is drawn older than we know them to be.
 * People before pets. (Tag profiles carry birth_date today; users will slot in through birthOf.)
 */
export function orderSiblings(list) {
  return [...ageMerge(list.filter((p) => !isPet(p))), ...ageMerge(list.filter(isPet))]
}
function ageMerge(list) {
  const byName = [...list].sort(cmpPeople)
  const slots = byName.map((p, i) => (p.birth ? i : -1)).filter((i) => i >= 0)
  const dated = slots.map((i) => byName[i]).sort((a, b) => (a.birth < b.birth ? -1 : a.birth > b.birth ? 1 : cmpPeople(a, b)))
  const out = [...byName]
  slots.forEach((slot, k) => {
    out[slot] = dated[k]
  })
  return out
}
const cmpSiblings = orderSiblings

/**
 * A person's birth date as YYYY-MM-DD, or null. Users have none in the API today; when
 * RelationshipResponse gains one (proposed: other_user_birth_date), it is read here and every
 * sibling group orders by age with no other change.
 */
export function birthOf(row) {
  const v = row?.birth_date ?? row?.other_user_birth_date ?? row?.recipient_birth_date ?? null
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null
}
/** Parents in order: father, mother, parent (by the word you use for them), then by name. */
function cmpParents(a, b) {
  return (a.info?.parentRank ?? 2) - (b.info?.parentRank ?? 2) || cmpPeople(a, b)
}

// ---------------------------------------------------------------- people
function personFromRelationship(r) {
  const name = r.other_user_display_name || r.other_user_username || 'Someone'
  return {
    id: `u:${r.other_user_id}`, kind: 'user', status: 'confirmed', name, first: shortName(name),
    username: r.other_user_username, userId: r.other_user_id, tagId: null, avatar: r.other_user_avatar_url || null, birth: birthOf(r),
    word: r.my_relationship_to_them || '', theirWord: r.their_relationship_to_me || '', relId: r.id, source: r,
  }
}
function personFromTag(t) {
  const name = t.name || 'Someone'
  return {
    id: `t:${t.id}`, kind: 'tag', status: 'confirmed', name, first: shortName(name),
    username: null, userId: null, tagId: t.id, avatar: t.photo_url || null, birth: birthOf(t),
    word: t.relationship_to_creator || '', theirWord: '', relId: null, source: t,
  }
}
function personFromSent(s) {
  const name = s.recipient_display_name || s.recipient_username || 'Someone'
  return {
    id: `u:${s.recipient_id}`, kind: 'user', status: 'asked', name, first: shortName(name),
    username: s.recipient_username, userId: s.recipient_id, tagId: null, avatar: s.recipient_avatar_url || null, birth: birthOf(s),
    word: s.i_call_them || '', theirWord: s.they_would_call_me || '', relId: s.id, source: s,
  }
}

/** Everyone in the data, keyed by id (you included), with the word you use for them read. */
export function collectPeople({ me, relationships = [], tags = [], sent = [] }) {
  const out = new Map()
  const meName = me?.display_name || me?.full_name || me?.username || 'You'
  const meId = `u:${me?.id}`
  out.set(meId, {
    id: meId, kind: 'me', status: 'me', name: meName, first: shortName(meName), username: me?.username || null, userId: me?.id ?? null,
    tagId: null, avatar: me?.avatar_url || null, birth: birthOf(me), word: '', theirWord: '', relId: null, source: me,
    info: { kind: 'me', row: 0, known: true, group: 'me', parentRank: 2 },
  })
  const add = (p) => {
    if (p.id === meId || out.has(p.id)) return
    p.info = readWord(p.word)
    out.set(p.id, p)
  }
  // a fixed order, never the API's: confirmed users, then tags, then people you asked
  for (const r of [...relationships].filter((r) => r && r.other_user_id != null).sort((a, b) => a.other_user_id - b.other_user_id)) add(personFromRelationship(r))
  for (const t of [...tags].filter((t) => t && t.id != null && !t.is_merged).sort((a, b) => a.id - b.id)) add(personFromTag(t))
  for (const s of [...sent].filter((s) => s && s.recipient_id != null).sort((a, b) => a.recipient_id - b.recipient_id)) add(personFromSent(s))
  disambiguate(out)
  return out
}

/** Two faces with the same first name get a last initial ("John S."), then whole names. */
function disambiguate(people) {
  const by = new Map()
  for (const p of people.values()) {
    const k = p.first.toLowerCase()
    by.set(k, [...(by.get(k) || []), p])
  }
  for (const list of by.values()) {
    if (list.length < 2) continue
    for (const p of list) {
      const parts = p.name.trim().split(/\s+/)
      if (parts.length > 1 && p.first !== p.name) p.first = `${p.first} ${parts[parts.length - 1][0]}.`
    }
    const again = new Map()
    for (const p of list) again.set(p.first.toLowerCase(), [...(again.get(p.first.toLowerCase()) || []), p])
    for (const l of again.values()) if (l.length > 1) for (const p of l) p.first = p.name
  }
}

// ---------------------------------------------------------------- facts to edges
// A fact is (a, word, b): "a is b's word". Edges are the primitives the drawing uses.
const SRC_RANK = { me: 0, rule: 1, tag: 2, link: 3 }

function factsOf(input, people, meId) {
  const facts = []
  for (const p of people.values()) {
    if (p.kind === 'me' || p.status === 'asked') continue
    facts.push({ a: p.id, b: meId, word: p.word, info: p.info, src: 'me' })
  }
  for (const t of input.tags || []) {
    if (!t || t.is_merged) continue
    for (const l of t.relationships || []) {
      const b = `u:${l.user_id}`
      if (b === meId || !people.has(b) || people.get(b).status !== 'confirmed') continue
      facts.push({ a: `t:${t.id}`, b, word: l.relationship_type, info: readWord(l.relationship_type), src: 'tag', linkId: l.id })
    }
  }
  for (const l of input.links || []) {
    if (!l || l.a === meId || l.b === meId || !people.has(l.a) || !people.has(l.b)) continue
    if (people.get(l.a).status !== 'confirmed' || people.get(l.b).status !== 'confirmed') continue
    facts.push({ a: l.a, b: l.b, word: l.word, info: readWord(l.word), src: 'link' })
  }
  return facts.sort((x, y) => SRC_RANK[x.src] - SRC_RANK[y.src] || cmpIds(x.a, y.a) || cmpIds(x.b, y.b) || collator.compare(x.word, y.word))
}
function cmpIds(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Primitive edges from one fact, or [] when the word is not one the drawing uses directly. */
function edgesOfFact(f) {
  const k = f.info.kind
  if (k === 'partner') return [{ type: 'spouse', a: f.a, b: f.b, src: f.src }]
  if (k === 'parent') return [{ type: 'parent', p: f.a, c: f.b, src: f.src, pet: !!f.info.petOwner }]
  if (k === 'child') return [{ type: 'parent', p: f.b, c: f.a, src: f.src, pet: !!f.info.pet }]
  if (k === 'sibling') return [{ type: 'sibling', a: f.a, b: f.b, src: f.src }]
  return []
}

// ---------------------------------------------------------------- the arrangement
export function arrange(input) {
  const people = collectPeople(input)
  const meId = `u:${input.me?.id}`
  const me = people.get(meId)
  const dropped = []
  const facts = factsOf(input, people, meId)
  const P = (id) => people.get(id)
  const confirmed = (id) => P(id)?.status === 'confirmed' || id === meId

  // ---- your own words, by kind (confirmed only)
  const mine = (kind) => [...people.values()].filter((p) => p.status === 'confirmed' && p.info.kind === kind)
  const partners = mine('partner').sort(cmpPeople).slice(0, 2)
  for (const extra of mine('partner').sort(cmpPeople).slice(2)) dropped.push({ why: 'a third partner', id: extra.id })
  const onlyPartner = partners.length === 1 ? partners[0] : null
  const myParents = mine('parent').sort(cmpParents)

  // ---- edges: your words, the named rules, then tag links and preview links
  let edges = []
  for (const f of facts) for (const e of edgesOfFact(f)) edges.push(e)
  edges = edges.filter((e) => e.type !== 'spouse' || e.src !== 'me' || partners.some((p) => p.id === e.a) || e.a === meId)
  // rule: parents-in-law sit above your only partner (who hangs from them)
  if (onlyPartner) for (const pil of mine('parentInLaw')) edges.push({ type: 'parent', p: pil.id, c: onlyPartner.id, src: 'rule', rule: 'in-law' })
  // rule: stepchildren hang from your only partner
  if (onlyPartner) for (const sc of mine('stepChild')) edges.push({ type: 'parent', p: onlyPartner.id, c: sc.id, src: 'rule', rule: 'stepchild', step: true })
  // rule: a stepmother is joined to your only father; a stepfather to your only mother
  for (const sp of mine('stepParent')) {
    const want = sp.info.needs
    const match = want ? myParents.filter((q) => readWord(q.word).word === want) : []
    if (match.length === 1) edges.push({ type: 'spouse', a: match[0].id, b: sp.id, src: 'rule', rule: 'step-parent', step: true })
  }

  // ---- rows: everyone in the tree has a word for you with a generation; a fact must agree
  const rowOf = (id) => (id === meId ? 0 : P(id)?.status === 'confirmed' ? P(id).info.row : null)
  const keep = []
  for (const e of edges) {
    const ids = e.type === 'parent' ? [e.p, e.c] : [e.a, e.b]
    if (ids.some((id) => rowOf(id) == null) || ids[0] === ids[1]) { dropped.push({ why: 'no generation', edge: e }); continue }
    const ok = e.type === 'parent' ? rowOf(e.p) === rowOf(e.c) - 1 : rowOf(e.a) === rowOf(e.b)
    if (!ok) { dropped.push({ why: 'contradicts the rows', edge: e }); continue }
    keep.push(e)
  }
  edges = keep

  // ---- reachable from you over those edges (the candidates for lines)
  const adj = new Map()
  const link = (x, y) => { (adj.get(x) || adj.set(x, []).get(x)).push(y); (adj.get(y) || adj.set(y, []).get(y)).push(x) }
  for (const e of edges) e.type === 'parent' ? link(e.p, e.c) : link(e.a, e.b)
  const dist = new Map([[meId, 0]])
  const queue = [meId]
  while (queue.length) {
    const x = queue.shift()
    for (const y of (adj.get(x) || []).slice().sort(cmpIds)) if (!dist.has(y)) { dist.set(y, dist.get(x) + 1); queue.push(y) }
  }
  const reach = (id) => dist.has(id)
  edges = edges.filter((e) => (e.type === 'parent' ? reach(e.p) && reach(e.c) : reach(e.a) && reach(e.b)))

  // ---- parents of each person (deduplicated), in parent order
  const parentsOf = new Map()
  for (const e of edges) {
    if (e.type !== 'parent') continue
    const list = parentsOf.get(e.c) || parentsOf.set(e.c, []).get(e.c)
    if (!list.some((x) => x.p === e.p)) list.push(e)
  }
  const sortedParents = (c) => (parentsOf.get(c) || []).slice().sort((x, y) => cmpParents(P(x.p), P(y.p)))

  // ---- couples: chains of partners, built in priority order (each person two partners at most, no rings)
  const mates = new Map()
  const deg = (id) => (mates.get(id) || []).length
  const uf = new Map()
  const find = (x) => { while (uf.has(x) && uf.get(x) !== x) x = uf.get(x); return x }
  const couples = []
  const addCouple = (a, b, why) => {
    if (a === b || (mates.get(a) || []).includes(b)) return true
    if (deg(a) >= 2 || deg(b) >= 2 || find(a) === find(b)) { dropped.push({ why: `couple ${why} would break a chain`, a, b }); return false }
    ;(mates.get(a) || mates.set(a, []).get(a)).push(b)
    ;(mates.get(b) || mates.set(b, []).get(b)).push(a)
    uf.set(find(a), find(b))
    couples.push({ a, b, why })
    return true
  }
  for (const p of partners) addCouple(meId, p.id, 'you')
  const myTwo = sortedParents(meId).slice(0, 2).map((e) => e.p)
  if (myTwo.length === 2) addCouple(myTwo[0], myTwo[1], 'your parents')
  for (const e of edges.filter((e) => e.type === 'spouse' && e.rule === 'step-parent')) addCouple(e.a, e.b, 'step-parent')
  if (onlyPartner) {
    const theirTwo = sortedParents(onlyPartner.id).slice(0, 2).map((e) => e.p)
    if (theirTwo.length === 2) addCouple(theirTwo[0], theirTwo[1], "your partner's parents")
  }
  for (const e of edges.filter((e) => e.type === 'spouse' && e.src !== 'me' && e.rule !== 'step-parent')) addCouple(e.a, e.b, 'stated')
  const byDistance = [...dist.keys()].sort((x, y) => dist.get(x) - dist.get(y) || cmpPeople(P(x), P(y)))
  for (const c of byDistance) {
    if (c === meId || c === onlyPartner?.id) continue
    const two = sortedParents(c).slice(0, 2).map((e) => e.p)
    if (two.length === 2 && !isMine(c, 'child') && !isMine(c, 'sibling')) addCouple(two[0], two[1], 'co-parents')
  }
  function isMine(id, kind) {
    return P(id)?.status === 'confirmed' && P(id).info.kind === kind
  }
  const areMates = (a, b) => (mates.get(a) || []).includes(b)

  // ---- anchors: where each person hangs from ({members, conv}); extra parents get their own line
  const anchors = new Map()
  const extraParents = [] // {p, c}
  const myAnchor = (() => {
    const ps = sortedParents(meId).map((e) => e.p)
    if (!ps.length) return null
    if (ps.length >= 2 && areMates(ps[0], ps[1])) {
      for (const x of ps.slice(2)) extraParents.push({ p: x, c: meId })
      return { members: [ps[0], ps[1]] }
    }
    for (const x of ps.slice(1)) extraParents.push({ p: x, c: meId })
    return { members: [ps[0]] }
  })()
  if (myAnchor) anchors.set(meId, myAnchor)
  for (const c of byDistance) {
    if (c === meId) continue
    const p = P(c)
    if (p.status !== 'confirmed') continue
    if (isMine(c, 'child')) {
      // C1: your children and pets hang from you and your only partner, else from you
      anchors.set(c, onlyPartner ? { members: [meId, onlyPartner.id], conv: 'C1' } : { members: [meId], conv: 'C1' })
      continue
    }
    if (isMine(c, 'sibling')) {
      // C2: your siblings share your parents' join (with no parent, a sibling bar instead)
      if (myAnchor) anchors.set(c, { members: myAnchor.members, conv: 'C2' })
      continue
    }
    const ps = sortedParents(c).map((e) => e.p)
    if (!ps.length) continue
    if (ps.length >= 2 && areMates(ps[0], ps[1])) anchors.set(c, { members: [ps[0], ps[1]] })
    else anchors.set(c, { members: [ps[0]] })
  }
  const anchorKey = (members) => members.join('+')

  // ---- units: chains of partners
  const unitOf = new Map()
  const units = new Map()
  for (const id of byDistance) {
    if (unitOf.has(id)) continue
    // walk to one end of the chain, then along it
    let end = id, prev = null
    for (;;) {
      const next = (mates.get(end) || []).find((x) => x !== prev)
      if (!next || next === id) break
      prev = end
      end = next
      if (end === id) break
    }
    const chain = [end]
    prev = null
    let cur = end
    for (;;) {
      const next = (mates.get(cur) || []).find((x) => x !== prev && !chain.includes(x))
      if (!next) break
      chain.push(next)
      prev = cur
      cur = next
    }
    const uid = `n${units.size}`
    units.set(uid, { id: uid, row: rowOf(id), chain })
    for (const m of chain) unitOf.set(m, uid)
  }

  // children of each anchor (drawn candidates)
  const kidsOf = new Map()
  for (const [c, a] of anchors) {
    const k = anchorKey(a.members)
    ;(kidsOf.get(k) || kidsOf.set(k, []).get(k)).push(c)
  }

  // ---- asked people: placed by your word, never anchors
  const asked = [...people.values()].filter((p) => p.status === 'asked').sort(cmpPeople)
  const askedChildren = asked.filter((p) => p.info.kind === 'child')
  const askedSiblings = asked.filter((p) => p.info.kind === 'sibling')
  const askedParents = asked.filter((p) => p.info.kind === 'parent')
  const askedPartners = asked.filter((p) => p.info.kind === 'partner').slice(0, partners.length >= 2 ? 0 : 1)

  // ---- the blocks: your unit and descendants, your side up and left, your partner's up and right
  const visited = new Set()
  const drawn = new Set()
  const lines = []
  const reachedVia = new Map() // id -> ids it was reached through (for growth steps)

  const orient = (chain, blood, end) => {
    // end: 'left' puts `blood` at the left end, 'right' at the right end
    const c = [...chain]
    if (c.length < 2 || !c.includes(blood)) return c
    if (end === 'right' && c[0] === blood) c.reverse()
    else if (end === 'left' && c[c.length - 1] === blood) c.reverse()
    else if (end === 'right' && c[c.length - 1] !== blood && c.indexOf(blood) < c.length / 2 - 0.5) c.reverse()
    else if (end === 'left' && c[0] !== blood && c.indexOf(blood) > c.length / 2 - 0.5) c.reverse()
    return c
  }

  /** The anchors in a unit that have drawn children, left to right. */
  const anchorsIn = (members) => {
    const out = []
    members.forEach((m, i) => {
      if (kidsOf.has(m)) out.push({ members: [m], pos: i })
      if (i < members.length - 1) {
        const pair = [m, members[i + 1]]
        for (const k of [anchorKey(pair), anchorKey([pair[1], pair[0]])]) if (kidsOf.has(k)) out.push({ members: k === anchorKey(pair) ? pair : [pair[1], pair[0]], pos: i + 0.5 })
      }
    })
    return out.sort((a, b) => a.pos - b.pos)
  }
  const kidsSorted = (members) => cmpSiblings((kidsOf.get(anchorKey(members)) || []).map(P))

  function markUnit(members) {
    for (const m of members) drawn.add(m)
  }

  /** A unit and everything below it. blood: the member it hangs by; end: where blood sits. */
  function down(uid, blood, end) {
    visited.add(uid)
    const u = units.get(uid)
    const members = orient(u.chain, blood, end)
    markUnit(members)
    for (const m of members) if (m !== blood && !reachedVia.has(m)) reachedVia.set(m, [blood])
    const groups = []
    for (const a of anchorsIn(members)) {
      const list = kidsSorted(a.members).filter((k) => !visited.has(unitOf.get(k.id)))
      const children = []
      list.forEach((k, i) => {
        const side = i < (list.length - 1) / 2 ? 'right' : 'left'
        reachedVia.set(k.id, a.members)
        children.push(down(unitOf.get(k.id), k.id, side))
      })
      if (children.length) groups.push({ anchor: a.members, children })
    }
    return { unit: uid, row: u.row, members, blood, groups }
  }

  /** Children of a unit's other anchors that would sit on the inner side of the line (and so wait in a tray). */
  function stranded(members, lineAnchor, flank) {
    const all = anchorsIn(members)
    const linePos = all.find((a) => anchorKey(a.members) === anchorKey(lineAnchor))?.pos ?? 0
    let n = 0
    for (const a of all) {
      if (anchorKey(a.members) === anchorKey(lineAnchor)) continue
      if (flank === 'left' ? a.pos > linePos : a.pos < linePos) n += (kidsOf.get(anchorKey(a.members)) || []).length
    }
    return n
  }

  /** A leaf block for someone you asked (no unit, no children). */
  const askedBlock = (p, row) => ({ unit: null, row, members: [p.id], blood: p.id, groups: [], asked: true })

  /**
   * Ancestors: the unit `uid` that `line` hangs from, its other children toward the flank
   * (siblings and their families), and its own ancestors. flank: 'left' | 'right' | 'none'.
   * The outer parent keeps the flank; the inner one opens toward `innerFlank` (the other side,
   * when nobody's family stands there), else draws ancestors only.
   */
  function up(uid, line, flank, facing, extraKids = [], innerFlank = 'none') {
    visited.add(uid)
    const u = units.get(uid)
    const lineAnchor = anchors.get(line).members
    const end = facing // the line's parents face the middle of the tree
    let members
    if (lineAnchor.length === 2) {
      members = orient(u.chain, lineAnchor[0], 'left')
      if (members.indexOf(lineAnchor[0]) > members.indexOf(lineAnchor[1])) members = [...members].reverse()
      // your own parents stay father, mother (rule 2); another couple turns round when that
      // lets more of their children stand on the open side instead of waiting in a tray
      if (line !== meId && flank !== 'none') {
        const flipped = [...members].reverse()
        if (stranded(flipped, lineAnchor, flank) < stranded(members, lineAnchor, flank)) members = flipped
      }
    } else members = orient(u.chain, lineAnchor[0], end)
    markUnit(members)
    for (const m of members) if (!lineAnchor.includes(m) && !reachedVia.has(m)) reachedVia.set(m, lineAnchor)
    const groups = []
    const lineKey = anchorKey(lineAnchor)
    const linePos = anchorsIn(members).find((a) => anchorKey(a.members) === lineKey)?.pos ?? 0
    for (const a of anchorsIn(members)) {
      const isLine = anchorKey(a.members) === lineKey
      if (!isLine && (flank === 'none' || (flank === 'left' ? a.pos > linePos : a.pos < linePos))) {
        for (const k of kidsOf.get(anchorKey(a.members)) || []) dropped.push({ why: 'no room beside this line', id: k })
        continue
      }
      // by age where known, then first name; you stand beside your partner (rightmost) unless every
      // age in the group is known and no in-law family stands to your right; your partner leftmost
      let kids = kidsSorted(a.members).filter((k) => !isLine || k.id !== line)
      const youByAge = isLine && line === meId && rightFree && [me, ...kids].every((k) => k.birth)
      if (flank === 'none') {
        for (const k of kids) dropped.push({ why: 'a sibling in the middle of the tree', id: k.id })
        kids = []
      }
      kids = kids.filter((k) => !visited.has(unitOf.get(k.id)))
      const blocks = kids.map((k) => {
        reachedVia.set(k.id, a.members)
        return down(unitOf.get(k.id), k.id, flank === 'left' ? 'right' : 'left')
      })
      // people you asked to be your siblings stand outermost
      if (isLine) blocks.unshift(...extraKids)
      // left flank: [siblings..., LINE]; right flank: [LINE, siblings...]; you by age when it is all known
      let children = isLine ? (flank === 'right' ? ['LINE', ...blocks] : [...blocks, 'LINE']) : blocks
      if (youByAge) {
        const older = blocks.filter((b) => b.asked || (P(b.blood).birth && P(b.blood).birth < me.birth))
        children = [...older, 'LINE', ...blocks.filter((b) => !older.includes(b))]
      }
      if (children.length) groups.push({ anchor: a.members, children, line: isLine })
    }
    // the ancestors of this unit's blood members (the line's parents), outer one keeps the flank
    const ups = []
    const blood = lineAnchor.filter((m) => anchors.has(m) && !visited.has(unitOf.get(anchors.get(m).members[0])))
    const outer = flank === 'left' ? lineAnchor[0] : flank === 'right' ? lineAnchor[lineAnchor.length - 1] : null
    const order = flank === 'right' ? [...blood].sort((x, y) => (x === outer) - (y === outer)) : [...blood].sort((x, y) => (y === outer) - (x === outer))
    for (const m of order) {
      if (visited.has(unitOf.get(anchors.get(m).members[0]))) continue
      reachedVia.set(anchors.get(m).members[0], [m])
      for (const x of anchors.get(m).members) reachedVia.set(x, [m])
      const f = m === outer ? flank : innerFlank
      ups.push({ member: m, up: up(unitOf.get(anchors.get(m).members[0]), m, f, f === 'left' ? 'right' : f === 'right' ? 'left' : facing) })
    }
    return { unit: uid, row: u.row, members, line, anchor: lineAnchor, flank, groups, ups }
  }

  // your unit: [second partner, you, first partner]; someone you asked to be your partner too
  const u0 = units.get(unitOf.get(meId))
  visited.add(u0.id)
  const coreMembers = partners.length === 2 ? [partners[1].id, meId, partners[0].id] : partners.length === 1 ? [meId, partners[0].id] : [meId]
  const askedPartner = askedPartners[0] || null
  if (askedPartner) {
    if (partners.length === 1) coreMembers.unshift(askedPartner.id)
    else if (!partners.length) coreMembers.push(askedPartner.id)
  }
  markUnit(coreMembers)
  const coreGroups = []
  for (const a of anchorsIn(coreMembers.filter((m) => confirmed(m)))) {
    const list = kidsSorted(a.members).filter((k) => !visited.has(unitOf.get(k.id)))
    const children = list.map((k, i) => {
      reachedVia.set(k.id, a.members)
      return down(unitOf.get(k.id), k.id, i < (list.length - 1) / 2 ? 'right' : 'left')
    })
    coreGroups.push({ anchor: a.members, children })
  }
  if (askedChildren.length) {
    const anchor = onlyPartner ? [meId, onlyPartner.id] : [meId]
    let g = coreGroups.find((x) => anchorKey(x.anchor) === anchorKey(anchor))
    if (!g) coreGroups.push((g = { anchor, children: [] }))
    for (const p of askedChildren) { g.children.push(askedBlock(p, 1)); drawn.add(p.id); reachedVia.set(p.id, anchor) }
    coreGroups.sort((x, y) => coreMembers.indexOf(x.anchor[0]) + (x.anchor.length - 1) * 0.5 - (coreMembers.indexOf(y.anchor[0]) + (y.anchor.length - 1) * 0.5))
  }
  const core = { unit: u0.id, row: 0, members: coreMembers, blood: meId, groups: coreGroups }

  const askedSibBlocks = askedSiblings.map((p) => { drawn.add(p.id); return askedBlock(p, 0) })
  // a side is free when nobody's family will stand there: the inner parent may open into it
  const partnerSibs = partners.length ? edges.some((e) => e.type === 'sibling' && (e.a === partners[0].id || e.b === partners[0].id)) : false
  const rightFree = !(onlyPartner && (anchors.has(onlyPartner.id) || partnerSibs))
  const leftFree = !myAnchor && !mine('sibling').length && !askedSiblings.length
  let left = null
  if (myAnchor) {
    left = up(unitOf.get(myAnchor.members[0]), meId, 'left', 'right', askedSibBlocks, rightFree ? 'right' : 'none')
  } else {
    const sibs = orderSiblings(mine('sibling')).filter((s) => !visited.has(unitOf.get(s.id)))
    const blocks = [...askedSibBlocks, ...sibs.map((s) => { reachedVia.set(s.id, [meId]); return down(unitOf.get(s.id), s.id, 'right') })]
    if (blocks.length) left = { unit: null, row: -1, members: [], line: meId, anchor: [], flank: 'left', bar: true, groups: [{ anchor: [], children: [...blocks, 'LINE'], line: true }], ups: [] }
  }
  let right = null
  if (onlyPartner && anchors.has(onlyPartner.id) && !visited.has(unitOf.get(anchors.get(onlyPartner.id).members[0]))) {
    right = up(unitOf.get(anchors.get(onlyPartner.id).members[0]), onlyPartner.id, 'right', 'left', [], leftFree ? 'left' : 'none')
  } else if (partners.length && !anchors.has(partners[0].id)) {
    // your partner's siblings by a stated link, with no parents drawn: a sibling bar to the right
    const sibs = edges.filter((e) => e.type === 'sibling' && (e.a === partners[0].id || e.b === partners[0].id)).map((e) => (e.a === partners[0].id ? e.b : e.a))
    const blocks = [...new Set(sibs)].map(P).sort(cmpPeople).filter((s) => !visited.has(unitOf.get(s.id))).map((s) => { reachedVia.set(s.id, [partners[0].id]); return down(unitOf.get(s.id), s.id, 'left') })
    if (blocks.length) right = { unit: null, row: -1, members: [], line: partners[0].id, anchor: [], flank: 'right', bar: true, groups: [{ anchor: [], children: ['LINE', ...blocks], line: true }], ups: [] }
  }
  // a third parent or more, and parents you asked: their own line to you
  const extra = []
  for (const { p } of extraParents) {
    const uid = unitOf.get(p)
    if (visited.has(uid)) continue
    visited.add(uid)
    const members = orient(units.get(uid).chain, p, 'right')
    markUnit(members)
    extra.push({ unit: uid, row: -1, members, line: meId, own: p, asked: false })
  }
  for (const p of askedParents) {
    drawn.add(p.id)
    extra.push({ unit: null, row: -1, members: [p.id], line: meId, own: p.id, asked: true })
  }
  const root = { core, left, right, extra }

  // ---- lines, tones and the conventions they rest on
  const OTHER = ['violet', 'tide', 'sun']
  let otherN = 0
  const toneOfUnit = new Map()
  const isTag = (id) => P(id)?.kind === 'tag'
  const isAsked = (id) => P(id)?.status === 'asked'
  const leftSide = new Set(), rightSide = new Set(), mineBelow = new Set()
  const collectUp = (b, set) => {
    if (!b) return
    if (b.unit) set.add(b.unit)
    for (const x of b.ups || []) collectUp(x.up, set)
  }
  collectUp(left, leftSide)
  collectUp(right, rightSide)
  const collectDown = (b) => {
    if (!b || b === 'LINE') return
    if (b.unit) mineBelow.add(b.unit)
    for (const g of b.groups || []) for (const c of g.children) collectDown(c)
  }
  for (const g of core.groups) for (const c of g.children) collectDown(c)
  const otherTone = (uid) => {
    if (!toneOfUnit.has(uid)) toneOfUnit.set(uid, OTHER[otherN++ % OTHER.length])
    return toneOfUnit.get(uid)
  }
  const toneForUnit = (uid) => (uid === u0.id ? 'fizz' : leftSide.has(uid) ? 'azure' : rightSide.has(uid) ? 'zest' : otherTone(uid))
  const descentTone = (uid) => (uid === u0.id || mineBelow.has(uid) ? 'lime' : leftSide.has(uid) ? 'azure' : rightSide.has(uid) ? 'zest' : otherTone(uid))

  const coupleLines = (uid, members) => {
    for (let i = 0; i < members.length - 1; i++) {
      const a = members[i], b = members[i + 1]
      const ask = isAsked(a) || isAsked(b)
      const youPartner = uid === u0.id && (a === meId || b === meId)
      const other = a === meId ? b : a
      const why = couples.find((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a))?.why
      lines.push({
        id: `c:${a}:${b}`, kind: 'couple', a, b, unit: uid, tone: ask ? null : toneForUnit(uid), dashed: !ask && (isTag(a) || isTag(b)), faint: ask,
        tick: youPartner && !ask && P(other)?.kind === 'user', coparent: why === 'co-parents' || why === 'your parents' || why === "your partner's parents",
      })
    }
  }
  const descentLines = (uid, anchor, childId, { conv = null, into = false } = {}) => {
    const ask = isAsked(childId)
    lines.push({
      id: `d:${anchor.join('+')}:${childId}`, kind: 'descent', from: anchor, to: childId, unit: uid, conv,
      tone: ask ? null : descentTone(uid), dashed: !ask && (isTag(childId) || anchor.every(isTag)), faint: ask, into,
      tick: childId === meId && anchor.some((m) => P(m)?.kind === 'user'),
    })
  }
  const walkDown = (b) => {
    if (!b || b === 'LINE') return
    if (b.unit || b === core) coupleLines(b.unit || u0.id, b.members)
    for (const g of b.groups || []) {
      for (const c of g.children) {
        if (c === 'LINE') continue
        const conv = anchors.get(c.blood)?.conv || null
        descentLines(b.unit || u0.id, g.anchor, c.blood, { conv })
        walkDown(c)
      }
    }
  }
  walkDown(core)
  const walkUp = (b, intoRow0) => {
    if (!b) return
    if (b.bar) {
      const members = b.groups[0].children.map((c) => (c === 'LINE' ? b.line : c.blood))
      lines.push({ id: `b:${members.join('+')}`, kind: 'bar', members, conv: b.line === meId ? 'C2' : null, tone: b.line === meId ? 'azure' : 'zest', dashed: false, faint: false, asked: members.filter(isAsked) })
      for (const c of b.groups[0].children) if (c !== 'LINE') walkDown(c)
      return
    }
    coupleLines(b.unit, b.members)
    for (const g of b.groups) {
      for (const c of g.children) {
        const child = c === 'LINE' ? b.line : c.blood
        const conv = anchors.get(child)?.conv || null
        descentLines(b.unit, g.anchor, child, { conv, into: intoRow0 })
        if (c !== 'LINE') walkDown(c)
      }
    }
    for (const x of b.ups) walkUp(x.up, false)
  }
  walkUp(left, true)
  walkUp(right, true)
  for (const x of extra) {
    if (x.unit) coupleLines(x.unit, x.members)
    lines.push({ id: `o:${x.own}:${meId}`, kind: 'own', from: [x.own], to: meId, unit: x.unit, tone: x.asked ? null : 'azure', dashed: !x.asked && isTag(x.own), faint: x.asked, into: true })
  }

  // ---- trays: relatives the rules cannot place wait in their generation's row
  const hasPartner = partners.length > 0
  const siblingsDrawn = [...drawn].some((id) => id !== meId && P(id)?.info?.kind === 'sibling' && P(id).status === 'confirmed')
  const trayed = new Map()
  const shelf = []
  for (const p of [...people.values()].sort(cmpPeople)) {
    if (p.id === meId || drawn.has(p.id)) continue
    if (p.info.row == null) { shelf.push(p.id); continue }
    let key = p.info.tray
    if (!key) key = p.info.kind === 'partner' ? 'partners' : p.info.kind === 'parent' ? 'step-parents' : p.info.kind === 'sibling' ? 'half-and-step' : p.info.kind === 'child' ? 'stepchildren' : 'in-laws'
    const row = p.info.row
    let side
    if (key === 'grandparents') side = 'above'
    else if (key === 'grandchildren') side = 'below'
    else if (key === 'in-laws') side = hasPartner ? 'right' : 'left'
    else if (key === 'nieces-and-nephews') side = siblingsDrawn ? 'left' : 'right'
    else if (['step-parents', 'half-and-step', 'aunts-and-uncles', 'cousins'].includes(key)) side = 'left'
    else side = 'right'
    const k = `${key}@${row}`
    if (!trayed.has(k)) trayed.set(k, { key, row, side, caption: key === 'partners' ? 'Partners' : trayCaption(key, row), members: [] })
    trayed.get(k).members.push(p.id)
  }
  // nearest the drawing first, outermost last (cousins are the outermost on the left)
  const NEAR = ['in-laws', 'partners', 'step-parents', 'half-and-step', 'stepchildren', 'children-in-law', 'parents-in-law', 'nieces-and-nephews', 'aunts-and-uncles', 'cousins', 'grandparents', 'grandchildren']
  const trays = [...trayed.values()].sort((a, b) => a.row - b.row || NEAR.indexOf(a.key) - NEAR.indexOf(b.key))
  const slug = new Map()
  for (const t of trays) {
    let id = t.key
    if (slug.has(id)) id = `${t.key}-${t.row < 0 ? 'up' : 'down'}${Math.abs(t.row)}`
    slug.set(id, true)
    t.id = id
  }

  // ---- growth steps: 0 your unit; 1 the row above; 2 the row below; 3 the rest; 4 trays and asked; 5 add and ticks
  const base = (id) => {
    const p = P(id)
    if (coreMembers.includes(id) && !isAsked(id)) return 0
    if (isAsked(id)) return 4
    const r = rowOf(id)
    if (r === -1) return 1
    if (r === 1) return 2
    return 3
  }
  const steps = new Map()
  const stepOf = (id, seen = new Set()) => {
    if (steps.has(id)) return steps.get(id)
    if (seen.has(id)) return base(id)
    seen.add(id)
    let s = base(id)
    for (const via of reachedVia.get(id) || []) if (via !== id && drawn.has(via)) s = Math.max(s, stepOf(via, seen))
    steps.set(id, s)
    return s
  }
  for (const id of [...drawn].sort(cmpIds)) stepOf(id)
  for (const t of trays) for (const m of t.members) steps.set(m, 4)
  for (const l of lines) {
    const ends = l.kind === 'couple' ? [l.a, l.b] : l.kind === 'bar' ? l.members : [...l.from, l.to]
    l.step = Math.max(...ends.map((id) => steps.get(id) ?? 0))
    if (l.faint) l.step = Math.max(l.step, 4)
  }
  // drop empty steps so growth never pauses on nothing
  const used = [...new Set([...steps.values(), ...lines.map((l) => l.step), 5])].sort((a, b) => a - b)
  const remap = new Map(used.map((s, i) => [s, i]))
  for (const [id, s] of steps) steps.set(id, remap.get(s))
  for (const l of lines) l.step = remap.get(l.step)
  const finalStep = remap.get(5)
  for (const t of trays) t.step = remap.get(4) ?? finalStep

  // ---- counts
  const family = [...people.values()].filter((p) => p.status !== 'asked' && (p.id === meId || p.info.row != null))
  const genRows = new Set(family.map((p) => (p.id === meId ? 0 : p.info.row)))
  const rows = [...new Set([...drawn].map((id) => rowOf(id) ?? P(id)?.info?.row ?? 0).concat(trays.map((t) => t.row)))].sort((a, b) => a - b)

  return {
    me: meId,
    people,
    drawn,
    asked: new Set(asked.map((p) => p.id)),
    units,
    unitOf,
    anchors,
    couples,
    root,
    lines,
    trays,
    shelf,
    steps,
    finalStep,
    rows,
    count: family.length,
    generations: genRows.size,
    dropped,
    partners: partners.map((p) => p.id),
  }
}

/** Every relation the drawing asserts, in plain terms (the tests check these against the truth). */
export function relationsOf(s) {
  const out = []
  for (const l of s.lines) {
    if (l.faint) continue
    if (l.kind === 'couple') out.push({ type: 'couple', a: l.a, b: l.b, coparent: l.coparent })
    else if (l.kind === 'descent') out.push({ type: 'descent', parents: l.from, child: l.to, conv: l.conv })
    else if (l.kind === 'own') out.push({ type: 'descent', parents: l.from, child: l.to, conv: null })
    else if (l.kind === 'bar') out.push({ type: 'bar', members: l.members.filter((m) => !s.asked.has(m)), conv: l.conv })
  }
  return out
}
