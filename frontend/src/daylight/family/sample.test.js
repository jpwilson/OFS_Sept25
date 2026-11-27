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
const ask = (state, method, p, body) => answer({ method, path: p, query: {}, body, auth: '' }, state, helpers)

test('row keys match the production schemas exactly', () => {
  assert.deepEqual(SCHEMA_KEYS.relationship, fields('user_relationship.py', 'RelationshipResponse'))
  assert.deepEqual(SCHEMA_KEYS.pending, fields('user_relationship.py', 'RelationshipRequestResponse'))
  assert.deepEqual(SCHEMA_KEYS.sent, fields('user_relationship.py', 'RelationshipSentResponse'))
  assert.deepEqual(SCHEMA_KEYS.tag, fields('tag_profile.py', 'TagProfileResponse'))
  assert.deepEqual(SCHEMA_KEYS.tagLink, fields('tag_profile.py', 'TagProfileRelationshipResponse'))
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
  // a birthday, as the API keeps it: set or changed, and a null leaves it alone
  assert.equal(ask(st, 'POST', '/tag-profiles', { name: 'Bea', relationship_to_creator: 'daughter', birth_date: '2018-03-04' }).json.birth_date, '2018-03-04')
  assert.equal(ask(st, 'PUT', `/tag-profiles/${t.id}`, { birth_date: '2021-05-06' }).json.birth_date, '2021-05-06')
  assert.equal(ask(st, 'PUT', `/tag-profiles/${t.id}`, { birth_date: null }).json.birth_date, '2021-05-06')
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
