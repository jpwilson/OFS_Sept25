// node --test src/daylight/family/*.test.js   (owner: FAMILY). The sample backend answers like production.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { answer, fixturePage, familyOf } from './sample.js'
import { SCHEMA_KEYS } from './fixtures.js'
import { TYPES } from './kin.js'

process.env.CAPTURE_ORIGIN = '__ORIGIN__'
const { USERS, FOLLOWING_KEYS, FOLLOWER_KEYS } = await import('../../../scripts/landing/fixtures/cast.mjs')
const HERE = path.dirname(fileURLToPath(import.meta.url))
const SCHEMAS = path.resolve(HERE, '../../../../backend/app/schemas')

/** Field names of a Pydantic model in a schema file, with its base model's first (as Pydantic orders them). */
function fields(file, cls) {
  const src = fs.readFileSync(path.join(SCHEMAS, file), 'utf8')
  const read = (name) => {
    const m = src.match(new RegExp(`^class ${name}\\((\\w+)\\):\\n([\\s\\S]*?)(?=^class |$(?![\\s\\S]))`, 'm'))
    if (!m) throw new Error(`no class ${name} in ${file}`)
    const own = [...m[2].matchAll(/^ {4}(\w+)\s*:/gm)].map((x) => x[1])
    return m[1] === 'BaseModel' ? own : [...read(m[1]), ...own.filter((k) => !read(m[1]).includes(k))]
  }
  return read(cls)
}

const ok = (json) => ({ status: 200, json })
const err = (status, detail) => ({ status, json: { detail } })
const helpers = { ok, err }
function freshState(viewer = 'maya') {
  const users = JSON.parse(JSON.stringify(USERS))
  const profiles = Object.fromEntries(Object.values(users).map((u) => [u.username, { id: u.id, username: u.username }]))
  const me = Object.fromEntries(Object.keys(users).map((k) => [k, { ...users[k], can_access_content: true, subscription_status: 'active' }]))
  return { db: { users, profiles, me, routes: {}, following: FOLLOWING_KEYS, followers: FOLLOWER_KEYS }, viewer }
}
const ask = (state, method, p, body, query = {}) => answer({ method, path: p, query, body, auth: 'Bearer sample' }, state, helpers)
const askSignedOut = (state, method, p, body) => answer({ method, path: p, query: {}, body, auth: '' }, state, helpers)

test('row keys match the production schemas exactly', () => {
  assert.deepEqual(SCHEMA_KEYS.relationship, fields('user_relationship.py', 'RelationshipResponse'))
  assert.deepEqual(SCHEMA_KEYS.pending, fields('user_relationship.py', 'RelationshipRequestResponse'))
  assert.deepEqual(SCHEMA_KEYS.sent, fields('user_relationship.py', 'RelationshipSentResponse'))
  assert.deepEqual(SCHEMA_KEYS.tag, fields('tag_profile.py', 'TagProfileResponse'))
  assert.deepEqual(SCHEMA_KEYS.tagLink, fields('tag_profile.py', 'TagProfileRelationshipResponse'))
  assert.deepEqual(SCHEMA_KEYS.noteAuthor, fields('family_note.py', 'FamilyNoteAuthor'))
  assert.deepEqual(SCHEMA_KEYS.note, fields('family_note.py', 'FamilyNoteResponse'))
  assert.deepEqual(SCHEMA_KEYS.notePage, fields('family_note.py', 'FamilyNotePage'))
  assert.deepEqual(SCHEMA_KEYS.notes, fields('family_note.py', 'FamilyNotesResponse'))
  assert.deepEqual(SCHEMA_KEYS.details, fields('family_note.py', 'FamilyDetailsResponse'))
  const st = freshState()
  fixturePage({ path: '/__fx/family', query: { set: 'requests' } }, st)
  const keys = (rows) => rows.map((r) => Object.keys(r).sort().join(','))
  const same = (rows, want) => { assert.ok(rows.length); for (const k of keys(rows)) assert.equal(k, [...want].sort().join(',')) }
  same(ask(st, 'GET', '/relationships').json, SCHEMA_KEYS.relationship)
  same(ask(st, 'GET', '/relationships/pending').json, SCHEMA_KEYS.pending)
  same(ask(st, 'GET', '/relationships/sent').json, SCHEMA_KEYS.sent)
  const tags = ask(st, 'GET', '/tag-profiles/mine').json
  same(tags, SCHEMA_KEYS.tag)
  same(tags.flatMap((t) => t.relationships), SCHEMA_KEYS.tagLink)
  same([ask(st, 'GET', '/relationships/with/2').json], SCHEMA_KEYS.relationship)
  // the tag-link request rows
  const t = ask(st, 'GET', '/tag-profiles/mine').json[0]
  ask(st, 'POST', `/tag-profiles/${t.id}/relationships`, { user_id: USERS.joe.id, relationship_type: 'pet' })
  st.viewer = 'joe'
  same(ask(st, 'GET', '/me/tag-profile-relationship-requests').json, fields('tag_profile.py', 'TagProfileRelationshipRequestResponse'))
  same(ask(st, 'GET', '/me/tag-profile-relationship-requests/sent').json, fields('tag_profile.py', 'TagProfileRelationshipRequestSentResponse'))
  // notes, history and birthdays, in the server's field order
  st.viewer = 'maya'
  const order = (o) => Object.keys(o)
  const list = ask(st, 'GET', '/family-notes', undefined, { user_id: '5' }).json
  assert.deepEqual(order(list), SCHEMA_KEYS.notes)
  assert.deepEqual(order(list.history), SCHEMA_KEYS.notePage)
  assert.deepEqual(order(list.notes.items[0]), SCHEMA_KEYS.note)
  assert.deepEqual(order(list.notes.items[0].author), SCHEMA_KEYS.noteAuthor)
  assert.deepEqual(order(ask(st, 'PUT', '/users/me/family-details', { birthplace: 'Madison' }).json), SCHEMA_KEYS.details)
  assert.deepEqual(order(ask(st, 'POST', '/family-notes', { user_id: 5, body: 'x' }).json), SCHEMA_KEYS.note)
})

test("Maya's sample: eight relationships, Biscuit linked to Maya and Tom as 'pet', 35 types", () => {
  const st = freshState()
  const rows = ask(st, 'GET', '/relationships').json
  assert.equal(rows.length, 8)
  assert.ok(!rows.some((r) => 'other_user_full_name' in r))
  const tom = rows.find((r) => r.other_user_username === 'tom')
  assert.deepEqual([tom.my_relationship_to_them, tom.their_relationship_to_me, tom.status], ['husband', 'wife', 'accepted'])
  const [biscuit] = ask(st, 'GET', '/tag-profiles/mine').json
  assert.equal(biscuit.relationship_to_creator, 'pet')
  assert.deepEqual(biscuit.relationships.map((l) => [l.username, l.relationship_type]), [['maya', 'pet'], ['tom', 'pet']])
  assert.equal(ask(st, 'GET', '/relationships/types').json.types.length, 35)
  assert.deepEqual(ask(st, 'GET', '/relationships/types').json.types, TYPES)
  assert.deepEqual(ask(st, 'GET', '/relationships/pending').json, [])
  assert.equal(ask(st, 'GET', '/relationships/with/999').status, 404)
})

test('every cast member sees their own family', () => {
  for (const who of ['tom', 'ivy', 'ruth', 'joe', 'kate', 'marcus', 'finn']) {
    const st = freshState(who)
    const rows = ask(st, 'GET', '/relationships').json
    assert.ok(rows.length >= 4, who)
    for (const r of rows) assert.ok(TYPES.includes(r.my_relationship_to_them) && TYPES.includes(r.their_relationship_to_me))
  }
  const ivy = ask(freshState('ivy'), 'GET', '/relationships').json
  assert.equal(ivy.find((r) => r.other_user_username === 'james').my_relationship_to_them, 'uncle')
  assert.deepEqual(ask(freshState('tom'), 'GET', '/tag-profiles/mine').json, [], 'Biscuit is Maya\'s tag')
})

test('propose, accept, reject and delete, with the backend\'s refusals', () => {
  const st = freshState()
  // Priya follows Maya and Maya follows Priya
  const priya = USERS.priya
  assert.equal(ask(st, 'POST', '/relationships/propose', { other_user_id: priya.id, my_relationship_to_them: 'cousin', their_relationship_to_me: 'cousin' }).status, 200)
  assert.equal(ask(st, 'GET', '/relationships/sent').json.length, 1)
  assert.equal(ask(st, 'POST', '/relationships/propose', { other_user_id: priya.id, my_relationship_to_them: 'cousin', their_relationship_to_me: 'cousin' }).json.detail, 'A relationship request is already pending with this user')
  assert.equal(ask(st, 'POST', '/relationships/propose', { other_user_id: USERS.tom.id, my_relationship_to_them: 'husband', their_relationship_to_me: 'wife' }).status, 400, 'Tom does not follow Maya back in the sample')
  assert.equal(ask(st, 'POST', '/relationships/propose', { other_user_id: USERS.sam.id, my_relationship_to_them: 'bestie', their_relationship_to_me: 'friend' }).json.detail, 'Invalid relationship type: bestie')
  assert.equal(ask(st, 'POST', '/relationships/propose', { other_user_id: USERS.maya.id, my_relationship_to_them: 'friend', their_relationship_to_me: 'friend' }).status, 400)
  assert.equal(ask(st, 'POST', '/relationships/propose', { other_user_id: 4040, my_relationship_to_them: 'friend', their_relationship_to_me: 'friend' }).status, 404)
  // Priya sees it and accepts
  const sent = ask(st, 'GET', '/relationships/sent').json[0]
  assert.equal(ask(st, 'POST', `/relationships/${sent.id}/accept`).status, 400, 'you cannot accept your own request')
  st.viewer = 'priya'
  const pending = ask(st, 'GET', '/relationships/pending').json
  assert.equal(pending.length, 1)
  assert.deepEqual([pending[0].they_call_me, pending[0].i_would_call_them], ['cousin', 'cousin'])
  const accepted = ask(st, 'POST', `/relationships/${sent.id}/accept`).json
  assert.equal(accepted.status, 'accepted')
  assert.equal(accepted.proposed_by_me, false)
  st.viewer = 'maya'
  assert.equal(ask(st, 'GET', '/relationships').json.length, 9)
  // and either side may remove it
  assert.equal(ask(st, 'DELETE', `/relationships/${sent.id}`).json.message, 'Relationship deleted')
  assert.equal(ask(st, 'GET', '/relationships').json.length, 8)
})

test('the requests set: Nico asks to be your brother; you asked Gina and Ann', () => {
  const st = freshState()
  const page = fixturePage({ path: '/__fx/family', query: { set: 'requests', as: 'maya', next: '/family-tree' } }, st)
  assert.equal(page.redirect, '/__fx/signin?as=maya&next=%2Ffamily-tree')
  const [nico] = ask(st, 'GET', '/relationships/pending').json
  assert.equal(nico.proposer_display_name, 'Nico Russo')
  assert.deepEqual([nico.i_would_call_them, nico.they_call_me], ['brother', 'sister'])
  assert.equal(ask(st, 'GET', '/relationships/pending/count').json.count, 1)
  assert.deepEqual(ask(st, 'GET', '/relationships/sent').json.map((r) => [r.recipient_display_name, r.i_call_them]), [['Gina Russo', 'sister'], ['Ann Russo', 'mother']])
  assert.ok(st.db.profiles.nico, 'new people have profiles (the auth sample answers 404 otherwise)')
  assert.equal(ask(st, 'POST', `/relationships/${nico.id}/reject`).json.message, 'Relationship request rejected')
  assert.equal(ask(st, 'GET', '/relationships/pending').json.length, 0)
  const following = ask(st, 'GET', '/users/me/following').json
  assert.ok(following.some((u) => u.username === 'gina'))
  assert.deepEqual(Object.keys(following.at(-1)).sort(), ['avatar_url', 'full_name', 'id', 'notify_new_events', 'user_id', 'username'])
})

test('tags: create, edit (the creator link keeps its word), link and unlink', () => {
  const st = freshState()
  const t = ask(st, 'POST', '/tag-profiles', { name: 'Pip', relationship_to_creator: 'dog', photo_url: null }).json
  assert.equal(t.relationship_to_creator, 'dog')
  assert.deepEqual(t.relationships.map((l) => l.relationship_type), ['dog'])
  const edited = ask(st, 'PUT', `/tag-profiles/${t.id}`, { name: 'Pip', relationship_to_creator: 'pet', photo_url: '/x.jpg' }).json
  assert.equal(edited.relationship_to_creator, 'pet')
  assert.equal(edited.relationships[0].relationship_type, 'dog', 'production does not rewrite the link')
  assert.equal(edited.photo_url, '/x.jpg')
  // a birthday: set, changed, and (since FAMILY-NOTES) an explicit null clears it
  assert.equal(ask(st, 'POST', '/tag-profiles', { name: 'Bea', relationship_to_creator: 'daughter', birth_date: '2018-03-04' }).json.birth_date, '2018-03-04')
  assert.equal(ask(st, 'PUT', `/tag-profiles/${t.id}`, { birth_date: '2021-05-06' }).json.birth_date, '2021-05-06')
  assert.equal(ask(st, 'PUT', `/tag-profiles/${t.id}`, { name: 'Pip' }).json.birth_date, '2021-05-06', 'a field not sent is kept')
  assert.equal(ask(st, 'PUT', `/tag-profiles/${t.id}`, { birth_date: null }).json.birth_date, null)
  const self = ask(st, 'POST', `/tag-profiles/${t.id}/relationships`, { user_id: USERS.maya.id, relationship_type: 'pet' })
  assert.equal(self.status, 400, 'already linked to you')
  const other = ask(st, 'POST', `/tag-profiles/${t.id}/relationships`, { user_id: USERS.tom.id, relationship_type: 'pet' }).json
  assert.equal(other.id, 0)
  assert.equal(other.relationship_type, 'pet (pending approval)')
  const linkId = ask(st, 'GET', '/tag-profiles/mine').json.find((x) => x.id === t.id).relationships[0].id
  assert.equal(ask(st, 'DELETE', `/tag-profiles/${t.id}/relationships/${linkId}`).json.message, 'Relationship removed')
  st.viewer = 'tom'
  assert.equal(ask(st, 'PUT', `/tag-profiles/${t.id}`, { name: 'Mine now' }).status, 403)
  assert.equal(ask(st, 'GET', `/tag-profiles/${t.id}`).json.name, 'Pip')
  assert.equal(ask(st, 'GET', '/tag-profiles/4242').status, 404)
  assert.ok(st.db.routes['GET /tag-profiles/mine'].some((x) => x.name === 'Pip'), "the create package's tag search sees it")
})

test('the sets: empty, large, error, lapsed', () => {
  const st = freshState()
  fixturePage({ path: '/__fx/family', query: { set: 'empty' } }, st)
  assert.deepEqual(ask(st, 'GET', '/relationships').json, [])
  assert.deepEqual(ask(st, 'GET', '/tag-profiles/mine').json, [])
  fixturePage({ path: '/__fx/family', query: { set: 'large' } }, st)
  const rows = ask(st, 'GET', '/relationships').json
  assert.ok(rows.length >= 35, `${rows.length}`)
  assert.ok(ask(st, 'GET', '/tag-profiles/mine').json.length >= 9)
  assert.ok(rows.filter((r) => !r.other_user_avatar_url).length > rows.length / 2, 'mostly without photos')
  assert.ok(st.db.profiles.nico && st.db.users.nico)
  fixturePage({ path: '/__fx/family', query: { set: 'error' } }, st)
  assert.equal(ask(st, 'GET', '/relationships').status, 500)
  assert.equal(ask(st, 'GET', '/tag-profiles/mine').status, 200)
  fixturePage({ path: '/__fx/family', query: { set: 'lapsed' } }, st)
  const me = ask(st, 'GET', '/users/me').json
  assert.equal(me.can_access_content, false)
  assert.equal(me.subscription_status, 'expired')
  st.family = undefined
  assert.equal(familyOf(st).set, 'hartley', 'after a reset: the Hartleys again')
  assert.equal(fixturePage({ path: '/__fx/other', query: {} }, st), null)
})

test('the owner-shape set: sign in as nate; his family, his follows, and stories by person', () => {
  const st = freshState()
  const page = fixturePage({ path: '/__fx/family', query: { set: 'owner-shape', as: 'nate', next: '/family-tree' } }, st)
  assert.equal(page.redirect, '/__fx/signin?as=nate&next=%2Ffamily-tree')
  st.viewer = 'nate'
  assert.ok(st.db.me.nate && st.db.users.nate && st.db.profiles.nate, 'someone the sample can sign in as')
  const rows = ask(st, 'GET', '/relationships').json
  assert.deepEqual(rows.map((r) => r.other_user_username).sort(), ['chris', 'jake', 'kelly', 'lena', 'maureen', 'rob'])
  assert.deepEqual(ask(st, 'GET', '/tag-profiles/mine').json.map((t) => [t.name, t.relationship_to_creator, t.birth_date]), [
    ['Hal Brooks', 'father-in-law', null], ['June Walker', 'daughter', '2019-09-03'], ['Megan Walker', 'sister', '1984-02-20'], ['Rosie Walker', 'daughter', '2016-04-12'],
  ])
  assert.equal(ask(st, 'GET', '/users/me/following').json.length, 6)
  assert.equal(ask(st, 'POST', '/relationships/propose', { other_user_id: 307, my_relationship_to_them: 'cousin', their_relationship_to_me: 'cousin' }).json.detail, 'A relationship already exists with this user')
  st.db.list = [{ id: 1, author_username: 'maya', title: 'A' }, { id: 2, author_username: 'tom', title: 'B' }]
  assert.deepEqual(ask(st, 'GET', '/users/maya/events').json.map((e) => e.id), [1])
  assert.deepEqual(ask(st, 'GET', '/users/rob/events').json, [])
  assert.equal(ask(st, 'GET', '/users/nobody/events').status, 404)
})

test('the server since the security fixes: sign-in, birthdays, who resolves a request, which stories', () => {
  const st = freshState()
  // sign-in: every people route but a tag's stories
  assert.equal(askSignedOut(st, 'GET', '/tag-profiles/41').status, 403)
  assert.equal(askSignedOut(st, 'GET', '/tag-profiles/41/relationships').status, 403)
  assert.equal(askSignedOut(st, 'GET', '/relationships').status, 403)
  assert.equal(askSignedOut(st, 'GET', '/tag-profiles/41/events').status, 200)
  // birthdays: the creator and linked users only
  const bea = ask(st, 'POST', '/tag-profiles', { name: 'Bea', relationship_to_creator: 'daughter', birth_date: '2018-03-04' }).json
  assert.equal(ask(st, 'GET', `/tag-profiles/${bea.id}`).json.birth_date, '2018-03-04', 'the creator')
  st.viewer = 'joe'
  assert.equal(ask(st, 'GET', `/tag-profiles/${bea.id}`).json.birth_date, null, 'not linked')
  assert.equal(ask(st, 'GET', `/tag-profiles/${bea.id}`).json.name, 'Bea')
  // a creator's proposal: only the target resolves it, and the creator cannot
  st.viewer = 'maya'
  ask(st, 'POST', `/tag-profiles/${bea.id}/relationships`, { user_id: USERS.tom.id, relationship_type: 'daughter' })
  assert.deepEqual(ask(st, 'GET', '/me/tag-profile-relationship-requests').json, [], 'the creator does not approve her own proposal')
  st.viewer = 'tom'
  const [req] = ask(st, 'GET', '/me/tag-profile-relationship-requests').json
  assert.ok(req.message.startsWith('Proposed by '))
  assert.equal(ask(st, 'GET', '/me/tag-profile-relationship-requests/count').json.count, 1)
  assert.equal(ask(st, 'GET', `/tag-profiles/${bea.id}`).json.birth_date, null, 'a pending link shows no birthday')
  st.viewer = 'maya'
  assert.equal(ask(st, 'POST', `/me/tag-profile-relationship-requests/${req.id}/approve`).status, 403)
  st.viewer = 'joe'
  assert.equal(ask(st, 'POST', `/me/tag-profile-relationship-requests/${req.id}/reject`).status, 403)
  st.viewer = 'tom'
  assert.equal(ask(st, 'POST', `/me/tag-profile-relationship-requests/${req.id}/approve`).json.message, 'Relationship request approved')
  assert.equal(ask(st, 'POST', `/me/tag-profile-relationship-requests/${req.id}/approve`).status, 400)
  assert.equal(ask(st, 'GET', `/tag-profiles/${bea.id}`).json.birth_date, '2018-03-04', 'linked now')
  // a member's own request: the creator resolves it, and the creator's prefix is refused
  st.viewer = 'joe'
  assert.equal(ask(st, 'POST', `/tag-profiles/${bea.id}/relationship-requests`, { relationship_type: 'niece', message: 'Proposed by Maya' }).status, 400)
  const mine = ask(st, 'POST', `/tag-profiles/${bea.id}/relationship-requests`, { relationship_type: 'niece' }).json
  assert.equal(mine.profile_creator_username, 'maya')
  assert.equal(ask(st, 'POST', `/me/tag-profile-relationship-requests/${mine.id}/approve`).status, 403, 'not your own request')
  st.viewer = 'maya'
  assert.equal(ask(st, 'GET', '/me/tag-profile-relationship-requests').json.length, 1)
  assert.equal(ask(st, 'POST', `/me/tag-profile-relationship-requests/${mine.id}/reject`).json.message, 'Relationship request rejected')
  // stories: only those the viewer may open
  st.db.list = [
    { id: 1, author_username: 'tom', privacy_level: 'public' },
    { id: 2, author_username: 'tom', privacy_level: 'followers' },
    { id: 3, author_username: 'tom', privacy_level: 'close_family' },
    { id: 4, author_username: 'tom', privacy_level: 'private' },
  ]
  const ids = (res) => res.json.map((e) => e.id)
  assert.deepEqual(ids(ask(st, 'GET', '/users/tom/events')), [1, 2, 3], "Maya's feed, never a private story")
  assert.deepEqual(ids(askSignedOut(st, 'GET', '/users/tom/events')), [1], 'signed out: public only')
  st.viewer = 'tom'
  assert.deepEqual(ids(ask(st, 'GET', '/users/tom/events')), [1, 2, 3, 4], 'your own, all of them')
  st.viewer = 'jordan'
  familyOf(st)
  assert.deepEqual(ids(ask(st, 'GET', '/users/tom/events')), [1], 'someone Tom has no audience for')
})

// ---------------------------------------------------------------- notes, history and birthdays (FAMILY-NOTES.md)
const RUTH = { user_id: '5' }
const notesOf = (st, query) => ask(st, 'GET', '/family-notes', undefined, query)

test("notes: Ruth's family reads them, in the server's orders, with the server's flags", () => {
  const st = freshState()
  const r = notesOf(st, RUTH).json
  assert.equal(r.subject_user_id, 5)
  assert.equal(r.subject_tag_profile_id, null)
  assert.equal(r.can_write, true)
  // history: 1952 (a year), June 1974 (a month), then the undated entry
  assert.deepEqual(r.history.items.map((n) => [n.happened_on, n.happened_precision]), [['1952-01-01', 'year'], ['1974-06-01', 'month'], [null, null]])
  assert.equal(r.history.has_more, false)
  // notes: newest first, by Maya, Tom (edited) and Kate
  assert.deepEqual(r.notes.items.map((n) => n.author.username), ['maya', 'tom', 'kate'])
  assert.ok(r.notes.items[1].edited_at)
  assert.deepEqual(r.notes.items.map((n) => [n.can_edit, n.can_delete]), [[true, true], [false, false], [false, false]], "only Maya's own")
  // with kind, the other page is null
  const only = notesOf(st, { ...RUTH, kind: 'history' }).json
  assert.equal(only.notes, null)
  assert.equal(only.history.items.length, 3)
  // Ruth may delete any note about her, and edit only her own
  st.viewer = 'ruth'
  assert.deepEqual(notesOf(st, RUTH).json.notes.items.map((n) => [n.can_edit, n.can_delete]), [[false, true], [false, true], [false, true]])
  // a friend counts as family; a stranger does not; somebody nobody wrote about has none
  st.viewer = 'maya'
  assert.deepEqual(notesOf(st, { user_id: '4' }).json.notes, { items: [], has_more: false }, 'Leo: none')
  st.viewer = 'priya'
  familyOf(st).pairs.push({ id: 1, a: 'priya', b: 'ruth', aToB: 'friend', bToA: 'friend', status: 'accepted', by: 'priya', created_at: '2026-01-01T00:00:00', accepted_at: '2026-01-01T00:00:00' })
  assert.equal(notesOf(st, RUTH).status, 200, 'a friend')
  st.viewer = 'sam'
  assert.deepEqual(notesOf(st, RUTH), { status: 403, json: { detail: "Only Ruth Hartley's family can see notes about Ruth Hartley." } })
  assert.equal(notesOf(st, { user_id: '4040' }).status, 404)
  assert.equal(notesOf(st, {}).status, 422)
  assert.equal(notesOf(st, { user_id: '5', tag_profile_id: '41' }).json.detail, 'Give either user_id or tag_profile_id.')
  assert.ok(Array.isArray(notesOf(st, { ...RUTH, limit: '51' }).json.detail), "limit 51 is FastAPI's own 422")
  assert.equal(notesOf(st, { ...RUTH, kind: 'diary' }).status, 422)
  assert.equal(askSignedOut(st, 'GET', '/family-notes').status, 403)
})

test("notes on a tag: Biscuit's creator, linked users and the creator's relatives", () => {
  const st = freshState()
  const tag = { tag_profile_id: '41' }
  const r = notesOf(st, tag).json
  assert.equal(r.subject_tag_profile_id, 41)
  assert.deepEqual(r.notes.items.map((n) => [n.author.username, n.can_edit, n.can_delete]), [['tom', false, true]], "Maya created Biscuit: she may delete Tom's note")
  st.viewer = 'tom'
  assert.deepEqual(notesOf(st, tag).json.notes.items.map((n) => [n.can_edit, n.can_delete]), [[true, true]], 'linked, and the author')
  st.viewer = 'ruth'
  assert.equal(notesOf(st, tag).status, 200, "the creator's relative")
  st.viewer = 'sam'
  assert.equal(notesOf(st, tag).json.detail, "Only Biscuit's family can see notes about Biscuit.")
  assert.equal(notesOf(st, { tag_profile_id: '4242' }).json.detail, 'Tag profile not found')
})

test('writing: dates, cleaning, editing and deleting, with the server\'s words', () => {
  const st = freshState()
  const post = (b) => ask(st, 'POST', '/family-notes', { user_id: 5, ...b })
  // a history entry with only a year, stored at YYYY-01-01
  const y = post({ kind: 'history', body: 'Moved to Madison.', happened_on: '1979-08-17', happened_precision: 'year' })
  assert.equal(y.status, 201)
  assert.deepEqual([y.json.happened_on, y.json.happened_precision, y.json.can_edit, y.json.can_delete], ['1979-01-01', 'year', true, true])
  assert.equal(post({ kind: 'history', body: 'x', happened_on: '1979-08-17' }).json.happened_precision, 'day', 'no precision: a full day')
  assert.equal(post({ kind: 'history', body: 'x', happened_on: '1974-06-20', happened_precision: 'month' }).json.happened_on, '1974-06-01')
  const order = notesOf(st, { ...RUTH, kind: 'history' }).json.history.items.map((n) => n.happened_on)
  assert.deepEqual(order, ['1952-01-01', '1974-06-01', '1974-06-01', '1979-01-01', '1979-08-17', null])
  // every 422
  assert.equal(post({ body: 'x', happened_on: '1979-01-01' }).json.detail, 'Only history entries have a date')
  assert.equal(post({ kind: 'history', body: 'x', happened_precision: 'year' }).json.detail, 'A date precision needs a date.')
  assert.equal(post({ kind: 'history', body: 'x', happened_on: '0999-12-31' }).json.detail, 'Choose a date between the year 1000 and today.')
  assert.equal(post({ kind: 'history', body: 'x', happened_on: '2026-11-28' }).json.detail, 'Choose a date between the year 1000 and today.')
  assert.equal(post({ kind: 'history', body: 'x', happened_on: '2026-11-27' }).status, 201, 'today + 1 day')
  assert.equal(post({ body: '   \n ' }).json.detail, 'Write something first.')
  assert.equal(post({ body: 'a'.repeat(4001) }).json.detail, 'Keep it to 4000 characters.')
  assert.equal(post({ body: 'a'.repeat(4000) }).status, 201)
  assert.ok(Array.isArray(post({ kind: 'diary', body: 'x' }).json.detail))
  assert.ok(Array.isArray(post({ kind: 'history', body: 'x', happened_on: '1979-02-30' }).json.detail))
  // cleaned before it is counted, stored as written: never HTML
  const clean = post({ body: '  <b>Bold</b>\r\n\r\n\r\n\r\nnext‮ line\u0007 👨‍👩‍👧  ' }).json
  assert.equal(clean.body, '<b>Bold</b>\n\nnext line 👨‍👩‍👧')
  // the 31st note in ten minutes
  st.viewer = 'kate'
  for (let i = 0; i < 30; i++) assert.equal(post({ body: `n${i}` }).status, 201)
  assert.deepEqual(post({ body: 'one more' }), { status: 429, json: { detail: 'That is a lot of notes at once. Try again in a few minutes.' } })
  // editing: the author only; the date rules on the merged result
  st.viewer = 'maya'
  const patch = (id, b) => ask(st, 'PATCH', `/family-notes/${id}`, b)
  assert.equal(patch(8005, { body: 'mine now' }).json.detail, 'Only the author can edit this note.')
  const e1 = patch(y.json.id, { happened_on: '1980-05-05' }).json
  assert.deepEqual([e1.happened_on, e1.happened_precision], ['1980-01-01', 'year'], 'a new date keeps the old precision')
  assert.ok(e1.edited_at)
  const e2 = patch(y.json.id, { happened_on: '1980-05-05', happened_precision: 'day' }).json
  assert.deepEqual([e2.happened_on, e2.happened_precision], ['1980-05-05', 'day'])
  const e3 = patch(y.json.id, { happened_precision: 'month' }).json
  assert.deepEqual([e3.happened_on, e3.happened_precision], ['1980-05-01', 'month'], 'a new precision alone re-normalises the old date')
  assert.deepEqual([patch(y.json.id, { happened_precision: null }).json.happened_on], [null], 'a null precision alone clears both')
  assert.equal(patch(y.json.id, { kind: 'note', happened_on: '1980-05-05' }).json.detail, 'Only history entries have a date')
  assert.equal(patch(y.json.id, { kind: 'note', happened_on: null, body: ' now a note ' }).json.body, 'now a note')
  assert.equal(patch(y.json.id, { kind: null }).json.detail, 'Choose note or history.')
  assert.equal(patch(y.json.id, { body: null }).json.detail, 'Write something first.')
  assert.equal(patch(424242, { body: 'x' }).json.detail, 'Note not found')
  // deleting: the author, Ruth herself; another relative 403; someone outside Ruth's family 404
  assert.equal(ask(st, 'DELETE', '/family-notes/8005').json.detail, 'Only the author or Ruth Hartley can delete this note.')
  st.viewer = 'joe'
  assert.equal(ask(st, 'DELETE', '/family-notes/8005').status, 404, "Maya's father is not on Ruth's tree")
  st.viewer = 'sam'
  assert.equal(ask(st, 'DELETE', '/family-notes/8005').status, 404)
  st.viewer = 'ruth'
  assert.deepEqual(ask(st, 'DELETE', '/family-notes/8005').json, { message: 'Note deleted' })
  st.viewer = 'maya'
  assert.equal(ask(st, 'DELETE', `/family-notes/${y.json.id}`).status, 200)
  assert.equal(ask(st, 'DELETE', `/family-notes/${y.json.id}`).status, 404)
})

test('demo accounts read with can_write false and are refused every write', () => {
  const st = freshState()
  st.db.me.maya.is_demo_account = true
  const r = notesOf(st, RUTH).json
  assert.equal(r.can_write, false)
  assert.ok(r.notes.items.every((n) => !n.can_edit && !n.can_delete))
  const refused = 'Demo accounts cannot perform this action. Sign up for your own account!'
  assert.equal(ask(st, 'POST', '/family-notes', { user_id: 5, body: 'x' }).json.detail, refused)
  assert.equal(ask(st, 'PATCH', '/family-notes/8006', { body: 'x' }).status, 403)
  assert.equal(ask(st, 'DELETE', '/family-notes/8006').status, 403)
  assert.equal(ask(st, 'PUT', '/users/me/family-details', { birthplace: 'x' }).json.detail, refused)
})

test('the paging set, the error set, and an empty family', () => {
  const st = freshState()
  fixturePage({ path: '/__fx/family', query: { set: 'notes-many' } }, st)
  const first = notesOf(st, RUTH).json
  assert.deepEqual([first.notes.items.length, first.notes.has_more, first.history.items.length, first.history.has_more], [10, true, 10, true])
  const ids = []
  for (let skip = 0; ; skip += 10) {
    const page = notesOf(st, { ...RUTH, kind: 'note', skip: String(skip) }).json.notes
    ids.push(...page.items.map((n) => n.id))
    if (!page.has_more) break
  }
  assert.equal(ids.length, 26)
  assert.equal(new Set(ids).size, 26)
  fixturePage({ path: '/__fx/family', query: { set: 'notes-error' } }, st)
  assert.equal(notesOf(st, RUTH).status, 500)
  fixturePage({ path: '/__fx/family', query: { set: 'empty' } }, st)
  assert.equal(notesOf(st, RUTH).status, 403, 'nobody is related in the empty set')
})

test("birthdays: your own on /users/me and PUT, your relatives' in their rows when they share them", () => {
  const st = freshState()
  st.db.routes = {}
  const me = ask(st, 'GET', '/users/me').json
  assert.deepEqual([me.birth_date, me.birthplace, me.birth_date_visibility], ['1985-07-19', 'Madison', 'relatives'])
  const rows = Object.fromEntries(ask(st, 'GET', '/relationships').json.map((r) => [r.other_user_username, r]))
  assert.deepEqual([rows.ruth.other_user_birth_date, rows.ruth.other_user_birthplace], ['1952-03-03', 'Cork'])
  assert.deepEqual([rows.kate.other_user_birth_date, rows.kate.other_user_birthplace], [null, null], 'Kate keeps hers to herself')
  assert.equal(rows.marcus?.other_user_birth_date ?? rows.james?.other_user_birth_date, null, 'James never saved one')
  // Leo is older than Ivy: by age, Leo stands first
  assert.ok(rows.leo.other_user_birth_date < rows.ivy.other_user_birth_date)
  // PUT applies only the fields sent; null clears; never "public"
  const put = (b) => ask(st, 'PUT', '/users/me/family-details', b)
  assert.deepEqual(put({ birthplace: '  Madison, Wisconsin ' }).json, { birth_date: '1985-07-19', birthplace: 'Madison, Wisconsin', birth_date_visibility: 'relatives' })
  assert.deepEqual(put({ birth_date_visibility: 'only_me' }).json.birth_date_visibility, 'only_me')
  st.viewer = 'tom'
  assert.equal(ask(st, 'GET', '/relationships').json.find((r) => r.other_user_username === 'maya').other_user_birth_date, null, 'only_me hides it from Tom')
  st.viewer = 'maya'
  assert.deepEqual(put({ birth_date: null, birthplace: null }).json, { birth_date: null, birthplace: null, birth_date_visibility: 'only_me' })
  assert.equal(put({ birth_date_visibility: null }).json.detail, 'Choose who sees your birthday.')
  assert.ok(Array.isArray(put({ birth_date_visibility: 'public' }).json.detail))
  assert.equal(put({ birth_date: '2026-11-27' }).json.detail, 'Choose a birthday between 1900 and today.')
  assert.equal(put({ birth_date: '1899-12-31' }).json.detail, 'Choose a birthday between 1900 and today.')
  assert.equal(put({ birthplace: 'a\nb' }).json.detail, 'A birthplace is one line.')
  assert.equal(put({ birthplace: 'a'.repeat(121) }).json.detail, 'Keep the birthplace to 120 characters.')
  assert.equal(put({ birthplace: '   ' }).json.birthplace, null, 'an empty birthplace is none')
  // someone who never saved one
  st.viewer = 'marcus' in st.db.users ? 'marcus' : 'james'
  const fresh = ask(st, 'GET', '/users/me').json
  assert.deepEqual([fresh.birth_date, fresh.birthplace, fresh.birth_date_visibility], [null, null, 'relatives'])
  assert.equal(askSignedOut(st, 'PUT', '/users/me/family-details', {}).status, 403)
})

test('tag profiles: the new fields, applied only when sent, gated like the birth date', () => {
  const st = freshState()
  const t = ask(st, 'POST', '/tag-profiles', { name: 'Ivy Rose', relationship_to_creator: 'grandmother', birth_date: '1931-05-20', birth_date_precision: 'year', birthplace: 'Galway', died_on: '2019-03-02', died_on_precision: 'year' }).json
  assert.deepEqual([t.birth_date, t.birth_date_precision, t.birthplace, t.died_on, t.died_on_precision], ['1931-01-01', 'year', 'Galway', '2019-01-01', 'year'])
  const put = (b) => ask(st, 'PUT', `/tag-profiles/${t.id}`, b)
  assert.equal(put({ birthplace: null }).json.birthplace, null)
  assert.equal(put({ name: 'Ivy' }).json.birth_date_precision, 'year', 'a field not sent is kept')
  assert.deepEqual([put({ birth_date: '1931-05-20' }).json.birth_date, put({}).json.birth_date_precision], ['1931-01-01', 'year'], 'a new date keeps the old precision')
  assert.deepEqual([put({ birth_date_precision: null }).json.birth_date, put({}).json.birth_date_precision], ['1931-01-01', null], 'null precision: an exact day')
  assert.equal(put({ died_on: '2019-06-14', died_on_precision: null }).json.died_on_precision, 'day', 'a death date without a precision is a day')
  assert.equal(put({ died_on: '1930-01-01' }).json.detail, 'The date of death is before the birth date.')
  assert.equal(put({ died_on: '1931-01-01', died_on_precision: 'year' }).status, 200, 'the same year at the coarser precision')
  assert.equal(put({ name: null }).json.detail, 'A name is needed')
  assert.equal(put({ relationship_to_creator: null, photo_url: null }).json.relationship_to_creator, null)
  assert.equal(put({ died_on: null }).json.died_on_precision, null, 'a null date clears its precision')
  // gated: the creator and linked users only
  put({ birthplace: 'Galway', died_on: '2019-01-01', died_on_precision: 'year' })
  st.viewer = 'joe'
  const seen = ask(st, 'GET', `/tag-profiles/${t.id}`).json
  assert.deepEqual([seen.birth_date, seen.birth_date_precision, seen.birthplace, seen.died_on, seen.died_on_precision], [null, null, null, null, null])
  // the seed: Biscuit was born in 2019 (a year), in Madison
  st.viewer = 'maya'
  const biscuit = ask(st, 'GET', '/tag-profiles/mine').json.find((x) => x.id === 41)
  assert.deepEqual([biscuit.birth_date, biscuit.birth_date_precision, biscuit.birthplace], ['2019-01-01', 'year', 'Madison'])
})
