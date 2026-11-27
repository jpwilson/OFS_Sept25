// FAMILY's extension of the sample backend (owner: FAMILY). Asked before the core
// (dev/sampleApi.js). Pure: no browser or Node globals. docs/app/FAMILY.md section 6.
//
// For whichever sample person is signed in (state.viewer), shaped exactly like production
// (backend/app/api/relationships.py, tag_profiles.py and their schemas):
//   GET  /relationships  /relationships/pending  /relationships/pending/count  /relationships/sent
//        /relationships/types (all 35)  /relationships/with/{user id}
//   POST /relationships/propose  /relationships/{id}/accept  /relationships/{id}/reject
//   DELETE /relationships/{id}
//   GET  /tag-profiles/mine  /tag-profiles/{id}  /tag-profiles/{id}/relationships  /tag-profiles/{id}/events
//   POST /tag-profiles   PUT /tag-profiles/{id}
//   POST /tag-profiles/{id}/relationships   DELETE /tag-profiles/{id}/relationships/{link id}
// and, in the sets that add people, /users/me/following and /users/me/followers for Maya.
//
// and GET /users/{username}/events (a person's stories, for the person sheet), and the tag-link
// requests: POST /tag-profiles/{id}/relationship-requests, GET /me/tag-profile-relationship-requests
// (and /count, /sent), POST /me/tag-profile-relationship-requests/{id}/approve|reject.
//
// The server's rules since the security fixes (PR #13), kept here:
//   - every route above needs sign-in except /tag-profiles/{id}/events and /users/{username}/events
//     (FastAPI 0.109's HTTPBearer answers 403 "Not authenticated" when the header is missing);
//   - a tag's birth_date reaches only its creator and the users linked to it;
//   - a tag-link request is approved or rejected only by the other party: the creator for a
//     member's request, the target for a creator's proposal (message starts "Proposed by ");
//   - a person's stories, and a tag's, list only the stories the viewer may open (mayOpen).
//
// Notes, history and birthdays (docs/app/FAMILY-NOTES.md, backend/app/api/family_notes.py and
// utils/family.py), with the server's rules, texts and orders:
//   GET /family-notes?user_id=|tag_profile_id=[&kind][&skip][&limit]   POST /family-notes
//   PATCH /family-notes/{id}   DELETE /family-notes/{id}   PUT /users/me/family-details
//   GET /users/me carries birth_date, birthplace and birth_date_visibility; relationships carry
//   other_user_birth_date and other_user_birthplace for accepted relatives who share them; tag
//   profiles carry birth_date_precision, birthplace, died_on and died_on_precision, and PUT
//   applies only the fields sent (an explicit null clears).
//   A sample member whose /users/me says is_demo_account is refused every write, as the server does.
//
// Sets: /__fx/family?set=hartley|requests|empty|large|error|lapsed|owner-shape|notes-many|notes-error&as=maya&next=/family-tree
//   hartley      the default: everyone in the cast sees their own family (fixtures.js)
//   requests     hartley, plus Nico asking to be Maya's brother, and Maya asking Gina and Ann
//   empty        nobody yet
//   large        about fifty people around Maya, mostly without photos, several tags
//   error        GET /relationships answers 500
//   lapsed       the plan has ended (GET /users/me: can_access_content false, expired)
//   owner-shape  the owner's own family's shape with made-up names; sign in as nate
//   notes-many   hartley, with 26 notes and 17 history entries about Ruth (Show more)
//   notes-error  hartley, and GET /family-notes answers 500
// GET /__fx/reset puts everything back (the core replaces the whole state).
import { HARTLEYS, LARGE, OWNER, MEMBER_DETAILS, seedPairs, seedTags, seedNotes, relationshipRow, sentRow, pendingRow, tagRow } from './fixtures.js'
import { TYPES } from './kin.js'

export const SETS = ['hartley', 'requests', 'empty', 'large', 'error', 'lapsed', 'owner-shape', 'notes-many', 'notes-error']
const NOW = '2026-11-26T12:00:00'
const TODAY = NOW.slice(0, 10)
const PEOPLE_ROUTES = /^\/(relationships|tag-profiles|me\/tag-profile-relationship-requests|family-notes)(\/|$)/
const OPEN_ROUTES = /^\/tag-profiles\/\d+\/events$/ // the one people route that does not need sign-in
const NOT_SIGNED_IN = { status: 403, json: { detail: 'Not authenticated' } }
// backend/app/api/tag_profiles.py CREATOR_PROPOSAL_PREFIX: how a creator's proposal is told apart
export const CREATOR_PROPOSAL_PREFIX = 'Proposed by '

// Someone Maya follows who does not follow her back (the Add sheet's "follow each other first").
const JORDAN = { key: 'jordan', id: 130, name: 'Jordan Lee' }
// The people the requests set brings in (Maya's family on her side, not yet on the app's tree).
const REQUESTS = { nico: { id: 103, name: 'Nico Russo' }, gina: { id: 104, name: 'Gina Russo' }, ann: { id: 101, name: 'Ann Russo' } }

function addUser(db, key, id, name) {
  if (db.users[key]) return
  const u = { id, username: key, full_name: name, display_name: name, avatar_url: null, bio: null, email: `${key}@example.test`, is_active: true, created_at: '2025-11-02T09:00:00Z' }
  db.users[key] = u
  db.profiles[key] = { id, username: key, full_name: name, display_name: name, bio: null, avatar_url: null, banner_url: null, event_count: 0, follower_count: 1, following_count: 1, created_at: u.created_at, is_active_member: true, subscription_tier: 'free' }
  // someone the sample can sign in as (GET /users/me), shaped like the cast's
  if (db.me && !db.me[key]) {
    db.me[key] = {
      ...u, banner_url: null, theme_preference: 'light', subscription_tier: 'premium', subscription_status: 'active', subscription_started_at: '2025-11-02T09:00:00Z',
      subscription_ends_at: null, trial_end_date: null, trial_days_remaining: 0, is_within_first_5_days: false, can_access_content: true,
      event_count: 0, follower_count: 6, following_count: 6, is_superuser: false, is_demo_account: false,
    }
  }
}

function seed(state, set = 'hartley') {
  const db = state.db
  const truth = set === 'large' ? LARGE : set === 'owner-shape' ? OWNER : HARTLEYS
  const withDetails = truth !== OWNER && set !== 'empty'
  for (const [key, p] of Object.entries(truth.people)) if (p.user != null) addUser(db, key, p.user, p.name)
  addUser(db, JORDAN.key, JORDAN.id, JORDAN.name)
  const fam = {
    set,
    truth,
    pairs: set === 'empty' ? [] : seedPairs(truth),
    tags: set === 'empty' ? [] : seedTags(truth),
    tagRequests: [],
    // member_details by cast key, and the notes and history (docs/app/FAMILY-NOTES.md)
    details: withDetails ? JSON.parse(JSON.stringify(MEMBER_DETAILS)) : {},
    notes: set === 'empty' ? [] : seedNotes(truth, set),
    nextNote: 9000,
    written: {}, // notes created per member (the server's 30 per 10 minutes)
    // who follows whom beyond the snapshot's lists: {viewer: [keys]} (both ways)
    mutualOf: set === 'large' ? { maya: Object.keys(truth.people).filter((k) => truth.people[k].user != null && k !== 'maya') }
      : set === 'owner-shape' ? { nate: Object.keys(truth.people).filter((k) => truth.people[k].user != null && k !== 'nate') }
        : {},
    nextRel: 7000,
    nextTag: 300,
    nextLink: 3000,
    nextReq: 5000,
  }
  if (set === 'requests') {
    for (const [key, p] of Object.entries(REQUESTS)) addUser(db, key, p.id, p.name)
    fam.mutualOf = { maya: Object.keys(REQUESTS) }
    fam.pairs.push(
      { id: fam.nextRel++, a: 'nico', b: 'maya', aToB: 'sister', bToA: 'brother', status: 'pending', by: 'nico', created_at: '2026-11-25T18:20:00', accepted_at: null },
      { id: fam.nextRel++, a: 'maya', b: 'gina', aToB: 'sister', bToA: 'sister', status: 'pending', by: 'maya', created_at: '2026-11-24T09:10:00', accepted_at: null },
      { id: fam.nextRel++, a: 'maya', b: 'ann', aToB: 'mother', bToA: 'daughter', status: 'pending', by: 'maya', created_at: '2026-11-23T20:05:00', accepted_at: null },
    )
  }
  return fam
}

/** The family state, seeded on first use (and again after /__fx/reset). */
export function familyOf(state) {
  return (state.family ||= seed(state))
}

const dirOf = (db) => (key) => {
  const u = db.users[key]
  if (!u) return { id: 0, username: key, full_name: key, display_name: key, avatar_url: null }
  return { id: u.id, username: u.username, full_name: u.full_name, display_name: u.display_name || u.full_name, avatar_url: u.avatar_url ?? null }
}
const keyOfUserId = (db, id) => Object.keys(db.users).find((k) => db.users[k].id === Number(id)) || null
const photoUrl = (k) => `__ORIGIN__/__fx/avatar/${k}.webp`

/** Do these two follow each other? Maya's lists come from the snapshot; the cast's own family all do. */
function mutual(state, a, b) {
  const db = state.db
  const fam = familyOf(state)
  if ((fam.mutualOf[a] || []).includes(b) || (fam.mutualOf[b] || []).includes(a)) return true
  const [x, y] = a === 'maya' ? [a, b] : [b, a]
  if (x === 'maya') return (db.following || []).includes(y) && (db.followers || []).includes(y)
  const fam1 = Object.keys(HARTLEYS.people)
  return fam1.includes(a) && fam1.includes(b)
}

/** Does a follow b (accepted)? Maya's list is the snapshot's; for the rest, as mutual() knows it. */
function follows(state, a, b) {
  if (a === 'maya' && (state.db.following || []).includes(b)) return true
  return mutual(state, a, b)
}

/**
 * May this viewer open this story? backend/app/utils/privacy.py audience_filter, as far as the
 * sample knows each audience. Signed out (viewer null): public only. The snapshot's list is
 * Maya's feed, so Maya may open the stories in it; anyone else their own, public ones and the
 * Followers stories of people they follow; Close Family, Custom Group and Private stories never
 * (the sample does not know those audiences, so it never assumes them).
 */
function mayOpen(state, viewer, e) {
  const level = e.privacy_level || state.db.details?.[e.id]?.privacy_level || 'public'
  if (viewer && e.author_username === viewer) return true
  if (level === 'public') return true
  if (!viewer || level === 'private') return false
  if (viewer === 'maya') return true
  return level === 'followers' && follows(state, viewer, e.author_username)
}

/** A tag's birthday reaches its creator and the users linked to it (can_see_birth_date). */
const seesBirth = (tag, viewer) => tag.by === viewer || tag.links.some((l) => l.user === viewer)

/** Only the other party resolves a tag-link request (can_resolve_relationship_request). */
function canResolve(req, tag, viewer) {
  if (tag.by === req.user) return false
  if (String(req.message || '').startsWith(CREATOR_PROPOSAL_PREFIX)) return viewer === req.user
  return viewer === tag.by
}

function tagRowsFor(state, viewer) {
  const fam = familyOf(state)
  const dir = dirOf(state.db)
  return fam.tags.filter((t) => t.by === viewer).sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id).map((t) => tagRow(t, dir, photoUrl))
}

/** The create package's tag search reads this recorded route: keep Maya's in step. */
function syncRecorded(state) {
  if (state.db.routes) state.db.routes['GET /tag-profiles/mine'] = tagRowsFor(state, 'maya')
}

export function answer(req, state, { ok, err }) {
  const { method: m, path: p, body } = req
  const db = state.db
  const viewer = state.viewer || 'maya'
  const fam = state.family
  const set = fam?.set || 'hartley'
  let r

  if (m === 'GET' && p === '/users/me' && req.auth && db.me[viewer]) {
    const base = set === 'lapsed'
      ? { ...db.me[viewer], subscription_status: 'expired', subscription_tier: 'free', can_access_content: false, subscription_ends_at: '2026-11-01T00:00:00' }
      : db.me[viewer]
    // the member's own birth keys (utils/family.py birthday_fields), 'relatives' when never saved
    return ok({ ...base, ...birthdayFields(familyOf(state).details[viewer]) })
  }
  if (m === 'PUT' && p === '/users/me/family-details') {
    if (!req.auth) return NOT_SIGNED_IN
    if (!db.me[viewer]) return undefined
    return saveBirthday(familyOf(state), viewer, body, isDemo(db, viewer))
  }
  if (m === 'GET' && (p === '/users/me/following' || p === '/users/me/followers') && fam?.mutualOf?.[viewer]?.length) {
    const base = viewer === 'maya' ? db.routes[`GET ${p}`] || [] : []
    const extra = fam.mutualOf[viewer].filter((k) => db.users[k] && !base.some((x) => x.username === db.users[k].username)).map((k) => {
      const u = db.users[k]
      return p.endsWith('following')
        ? { id: u.id, user_id: u.id, username: u.username, full_name: u.full_name, avatar_url: u.avatar_url, notify_new_events: true }
        : { id: u.id, username: u.username, full_name: u.full_name, avatar_url: u.avatar_url, is_close_family: false, status: 'accepted' }
    })
    return ok([...base, ...extra])
  }
  if ((m === 'GET') && (r = p.match(/^\/users\/([^/]+)\/(followers|following)$/)) && db.profiles[r[1]] && !db.routes[`GET ${p}`]) return ok([])
  // a person's own published stories (backend/app/api/users.py get_user_events), newest first
  if (m === 'GET' && (r = p.match(/^\/users\/([^/]+)\/events$/)) && !['me', 'search'].includes(r[1])) {
    if (!db.profiles[r[1]]) return err(404, 'User not found')
    const skip = Number(req.query?.skip || 0), limit = Number(req.query?.limit || 100)
    const who = req.auth ? viewer : null
    return ok(db.list.filter((e) => e.author_username === r[1] && mayOpen(state, who, e)).slice(skip, skip + limit))
  }

  if (!PEOPLE_ROUTES.test(p)) return undefined
  if (!req.auth && !OPEN_ROUTES.test(p)) return NOT_SIGNED_IN
  const F = familyOf(state)
  const dir = dirOf(db)
  const me = db.users[viewer]
  if (!me) return undefined
  const detailsOf = (k) => F.details[k] || null
  const demo = isDemo(db, viewer)

  // ------------------------------------------------------------ relationships
  if (m === 'GET' && p === '/relationships') {
    if (F.set === 'error') return { status: 500, json: { detail: 'Internal Server Error' } }
    // production orders by accepted_at, newest first; the page must not care
    const rows = F.pairs.filter((x) => x.status === 'accepted' && (x.a === viewer || x.b === viewer)).sort((a, b) => b.id - a.id)
    return ok(rows.map((x) => relationshipRow(x, viewer, dir, detailsOf)))
  }
  if (m === 'GET' && p === '/relationships/types') return ok({ types: TYPES })
  if (m === 'GET' && p === '/relationships/pending') {
    return ok(F.pairs.filter((x) => x.status === 'pending' && x.by !== viewer && (x.a === viewer || x.b === viewer)).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((x) => pendingRow(x, viewer, dir)))
  }
  if (m === 'GET' && p === '/relationships/pending/count') {
    return ok({ count: F.pairs.filter((x) => x.status === 'pending' && x.by !== viewer && (x.a === viewer || x.b === viewer)).length })
  }
  if (m === 'GET' && p === '/relationships/sent') {
    return ok(F.pairs.filter((x) => x.status === 'pending' && x.by === viewer).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((x) => sentRow(x, viewer, dir)))
  }
  if (m === 'GET' && (r = p.match(/^\/relationships\/with\/(\d+)$/))) {
    const other = keyOfUserId(db, r[1])
    const x = F.pairs.find((y) => (y.a === viewer && y.b === other) || (y.b === viewer && y.a === other))
    return x ? ok(relationshipRow(x, viewer, dir, detailsOf)) : err(404, 'No relationship found with this user')
  }
  if (m === 'POST' && p === '/relationships/propose') {
    const other = keyOfUserId(db, body?.other_user_id)
    if (Number(body?.other_user_id) === me.id) return err(400, 'Cannot propose a relationship with yourself')
    if (!other) return err(404, 'User not found')
    if (!mutual(state, viewer, other)) return err(400, 'You must mutually follow each other to propose a relationship')
    const existing = F.pairs.find((y) => (y.a === viewer && y.b === other) || (y.b === viewer && y.a === other))
    if (existing?.status === 'accepted') return err(400, 'A relationship already exists with this user')
    if (existing?.status === 'pending') return err(400, 'A relationship request is already pending with this user')
    if (existing) F.pairs = F.pairs.filter((y) => y !== existing)
    if (!TYPES.includes(body?.my_relationship_to_them)) return err(400, `Invalid relationship type: ${body?.my_relationship_to_them}`)
    if (!TYPES.includes(body?.their_relationship_to_me)) return err(400, `Invalid relationship type: ${body?.their_relationship_to_me}`)
    const rec = { id: F.nextRel++, a: viewer, b: other, aToB: body.my_relationship_to_them, bToA: body.their_relationship_to_me, status: 'pending', by: viewer, created_at: NOW, accepted_at: null }
    F.pairs.push(rec)
    return ok(relationshipRow(rec, viewer, dir))
  }
  if (m === 'POST' && (r = p.match(/^\/relationships\/(\d+)\/(accept|reject)$/))) {
    const rec = F.pairs.find((y) => y.id === Number(r[1]))
    if (!rec) return err(404, 'Relationship request not found')
    if (rec.by === viewer) return err(400, `Cannot ${r[2]} your own relationship request`)
    if (rec.a !== viewer && rec.b !== viewer) return err(403, `Not authorized to ${r[2]} this request`)
    if (rec.status !== 'pending') return err(400, `Relationship is already ${rec.status}`)
    if (r[2] === 'reject') {
      rec.status = 'rejected'
      return ok({ message: 'Relationship request rejected' })
    }
    rec.status = 'accepted'
    rec.accepted_at = NOW
    return ok(relationshipRow(rec, viewer, dir, detailsOf))
  }
  if (m === 'DELETE' && (r = p.match(/^\/relationships\/(\d+)$/))) {
    const rec = F.pairs.find((y) => y.id === Number(r[1]))
    if (!rec) return err(404, 'Relationship not found')
    if (rec.a !== viewer && rec.b !== viewer) return err(403, 'Not authorized to delete this relationship')
    F.pairs = F.pairs.filter((y) => y !== rec)
    return ok({ message: 'Relationship deleted' })
  }

  // ------------------------------------------------------------ tag profiles
  if (m === 'GET' && p === '/tag-profiles/mine') return ok(tagRowsFor(state, viewer))
  if (m === 'POST' && p === '/tag-profiles') {
    if (!body?.name || !String(body.name).trim()) return { status: 422, json: { detail: [{ type: 'missing', loc: ['body', 'name'], msg: 'Field required' }] } }
    const bad = badFields(body, TAG_FIELDS)
    if (bad) return bad
    const dates = tagDates(body.birth_date ?? null, body.birth_date_precision ?? null, body.died_on ?? null, body.died_on_precision ?? null)
    if (dates.res) return dates.res
    const place = cleanPlace(body.birthplace ?? null)
    if (place.res) return place.res
    const word = body.relationship_to_creator || null
    const tag = { id: F.nextTag++, key: null, name: String(body.name), photo: null, photoUrl: body.photo_url || null, ...dates.value, birthplace: place.value, word, by: viewer, created_at: NOW, links: [] }
    if (word) tag.links.push({ id: F.nextLink++, user: viewer, word })
    F.tags.push(tag)
    syncRecorded(state)
    return ok(tagRowWithUrl(tag, dir))
  }
  if ((r = p.match(/^\/tag-profiles\/(\d+)(\/.*)?$/))) {
    const tag = F.tags.find((t) => t.id === Number(r[1]))
    const rest = r[2] || ''
    if (!tag) {
      // tags this package does not keep (none today): leave them to the recorded routes
      return db.routes[`${m} ${p}`] !== undefined ? undefined : err(404, 'Tag profile not found')
    }
    if (m === 'GET' && !rest) {
      const row = tagRowWithUrl(tag, dir)
      // the birth date, its precision, the birthplace and the date of death (can_see_birth_date)
      if (!seesBirth(tag, viewer)) for (const k of ['birth_date', 'birth_date_precision', 'birthplace', 'died_on', 'died_on_precision']) row[k] = null
      return ok(row)
    }
    if (m === 'GET' && rest === '/relationships') return ok(tagRowWithUrl(tag, dir).relationships)
    if (m === 'GET' && rest === '/events') {
      const who = req.auth ? viewer : null
      return ok((db.routes[`GET ${p}`] || []).filter((e) => mayOpen(state, who, e)))
    }
    if (m === 'POST' && rest === '/relationship-requests') {
      // a member asks to be linked to someone else's tag; the creator approves
      if (tag.by === viewer) return err(400, 'You created this profile - use the direct relationship endpoint instead')
      if (tag.links.some((l) => l.user === viewer)) return err(400, 'You already have a relationship with this tag profile')
      if (F.tagRequests.some((x) => x.tag === tag.id && x.user === viewer && x.status === 'pending')) return err(400, 'You already have a pending relationship request for this profile')
      if (String(body?.message || '').startsWith(CREATOR_PROPOSAL_PREFIX)) return err(400, `Your message cannot start with "${CREATOR_PROPOSAL_PREFIX.trim()}"`)
      const rec = { id: F.nextReq++, tag: tag.id, user: viewer, word: body?.relationship_type, message: body?.message ?? null, status: 'pending', created_at: NOW }
      F.tagRequests.push(rec)
      return ok(tagSentRow(rec, tag, dir))
    }
    if (tag.by !== viewer) return err(403, rest ? 'Only the creator can change relationships on this tag profile' : 'You can only update your own tag profiles')
    if (m === 'PUT' && !rest) {
      // production applies only the fields sent (an explicit null clears, except the name) and
      // never rewrites the creator's link
      const sent = body || {}
      const bad = badFields(sent, TAG_FIELDS)
      if (bad) return bad
      if ('name' in sent && sent.name == null) return err(422, 'A name is needed')
      const birth = mergedDate(sent, 'birth_date', 'birth_date_precision', tag.birth_date, tag.birth_date_precision)
      const died = mergedDate(sent, 'died_on', 'died_on_precision', tag.died_on, tag.died_on_precision)
      const dates = tagDates(birth[0], birth[1], died[0], died[1])
      if (dates.res) return dates.res
      const place = 'birthplace' in sent ? cleanPlace(sent.birthplace) : { value: tag.birthplace ?? null }
      if (place.res) return place.res
      Object.assign(tag, dates.value, { birthplace: place.value })
      if ('name' in sent) tag.name = String(sent.name)
      if ('relationship_to_creator' in sent) tag.word = sent.relationship_to_creator
      if ('photo_url' in sent) { tag.photoUrl = sent.photo_url; tag.photo = null }
      syncRecorded(state)
      return ok(tagRowWithUrl(tag, dir))
    }
    if (m === 'POST' && rest === '/relationships') {
      const userKey = keyOfUserId(db, body?.user_id)
      if (!userKey) return err(404, 'User not found')
      if (tag.links.some((l) => l.user === userKey)) return err(400, 'A relationship already exists between this tag profile and user')
      const u = dir(userKey)
      if (userKey === viewer) {
        const link = { id: F.nextLink++, user: userKey, word: body.relationship_type }
        tag.links.push(link)
        syncRecorded(state)
        return ok({ id: link.id, user_id: u.id, username: u.username, display_name: u.display_name, avatar_url: u.avatar_url, relationship_type: link.word, created_at: NOW })
      }
      if (F.tagRequests.some((x) => x.tag === tag.id && x.user === userKey && x.status === 'pending')) return err(400, 'A pending relationship request already exists for this user')
      // stored with the target as proposer and the creator's prefix: the target approves
      const by = dir(viewer)
      F.tagRequests.push({ id: F.nextReq++, tag: tag.id, user: userKey, word: body.relationship_type, message: `${CREATOR_PROPOSAL_PREFIX}${by.display_name || by.username}`, status: 'pending', created_at: NOW })
      return ok({ id: 0, user_id: u.id, username: u.username, display_name: u.display_name, avatar_url: u.avatar_url, relationship_type: `${body.relationship_type} (pending approval)`, created_at: NOW })
    }
    if (m === 'DELETE' && (r = rest.match(/^\/relationships\/(\d+)$/))) {
      const link = tag.links.find((l) => l.id === Number(r[1]))
      if (!link) return err(404, 'Relationship not found')
      tag.links = tag.links.filter((l) => l !== link)
      syncRecorded(state)
      return ok({ message: 'Relationship removed' })
    }
  }

  // ------------------------------------------------------------ notes and history
  if (p === '/family-notes' || p.startsWith('/family-notes/')) return notesRoute(req, state, F, viewer, demo)

  // ------------------------------------------------------------ tag-link requests (/me/…)
  const tagOf = (x) => F.tags.find((t) => t.id === x.tag)
  if (m === 'GET' && (p === '/me/tag-profile-relationship-requests' || p === '/me/tag-profile-relationship-requests/count')) {
    const mine = F.tagRequests.filter((x) => x.status === 'pending' && tagOf(x) && canResolve(x, tagOf(x), viewer)).sort((a, b) => b.created_at.localeCompare(a.created_at))
    return ok(p.endsWith('/count') ? { count: mine.length } : mine.map((x) => tagRequestRow(x, tagOf(x), dir)))
  }
  if (m === 'GET' && p === '/me/tag-profile-relationship-requests/sent') {
    // production lists the requests whose proposer is you, a creator's proposals for you among them
    return ok(F.tagRequests.filter((x) => x.user === viewer && tagOf(x)).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((x) => tagSentRow(x, tagOf(x), dir)))
  }
  if (m === 'POST' && (r = p.match(/^\/me\/tag-profile-relationship-requests\/(\d+)\/(approve|reject)$/))) {
    const rec = F.tagRequests.find((x) => x.id === Number(r[1]))
    const tag = rec && tagOf(rec)
    if (!rec || !tag) return err(404, 'Request not found')
    if (!canResolve(rec, tag, viewer)) return err(403, `You don't have permission to ${r[2]} this request`)
    if (rec.status !== 'pending') return err(400, 'This request has already been processed')
    if (r[2] === 'reject') {
      rec.status = 'rejected'
      return ok({ message: 'Relationship request rejected' })
    }
    rec.status = 'approved'
    tag.links.push({ id: F.nextLink++, user: rec.user, word: rec.word })
    syncRecorded(state)
    return ok({ message: 'Relationship request approved' })
  }
  return undefined
}

/** TagProfileRelationshipRequestResponse: a request waiting for you (the proposer is the other user). */
function tagRequestRow(rec, tag, dir) {
  const u = dir(rec.user)
  return {
    id: rec.id, tag_profile_id: tag.id, tag_profile_name: tag.name, tag_profile_photo_url: tag.photoUrl || (tag.photo ? photoUrl(tag.photo) : null),
    proposer_id: u.id, proposer_username: u.username, proposer_display_name: u.display_name, proposer_avatar_url: u.avatar_url ?? null,
    relationship_type: rec.word, message: rec.message, status: rec.status, created_at: rec.created_at,
  }
}

/** TagProfileRelationshipRequestSentResponse. */
function tagSentRow(rec, tag, dir) {
  const c = dir(tag.by)
  return {
    id: rec.id, tag_profile_id: tag.id, tag_profile_name: tag.name, tag_profile_photo_url: tag.photoUrl || (tag.photo ? photoUrl(tag.photo) : null),
    profile_creator_id: c.id, profile_creator_username: c.username, profile_creator_display_name: c.display_name,
    relationship_type: rec.word, message: rec.message, status: rec.status, created_at: rec.created_at,
  }
}

/** A tag row whose photo may be an uploaded URL rather than a cast avatar. */
function tagRowWithUrl(tag, dir) {
  const row = tagRow(tag, dir, photoUrl)
  if (tag.photoUrl) row.photo_url = tag.photoUrl
  return row
}

/** /__fx/family?set=…&as=…&next=…: choose a set, then sign in through the core's page. */
export function fixturePage(req, state) {
  if (req.path !== '/__fx/family') return null
  const q = req.query || {}
  const set = SETS.includes(q.set) ? q.set : 'hartley'
  state.family = seed(state, set)
  syncRecorded(state)
  const as = String(q.as || 'maya').replace(/[^a-z]/g, '') || 'maya'
  const next = /^\/[^/]/.test(q.next || '') ? q.next : '/family-tree'
  return { redirect: `/__fx/signin?as=${as}&next=${encodeURIComponent(next)}` }
}

// ---------------------------------------------------------------- notes, history and birthdays
// backend/app/api/family_notes.py, utils/family.py and the tag profile PUT, as the page meets them.
const DEMO_REFUSED = { status: 403, json: { detail: 'Demo accounts cannot perform this action. Sign up for your own account!' } }
const isDemo = (db, viewer) => !!db.me?.[viewer]?.is_demo_account
const PRECISION = ['day', 'month', 'year']
const MAX_NOTE = 4000
const MAX_PLACE = 120

/** FastAPI's own 422: a list of what failed validation. */
const invalid = (loc, msg, input, type = 'value_error') => ({ status: 422, json: { detail: [{ type, loc, msg, input }] } })
const isDay = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof v === 'string' ? v : '')
  if (!m) return false
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]
}
/** Pydantic's field checks, for the fields that are present and not null: {field: 'date' | 'str' | 'int' | [allowed values]}. */
function badFields(body, spec) {
  for (const [k, rule] of Object.entries(spec)) {
    const v = body?.[k]
    if (v == null) continue
    if (rule === 'date' && !isDay(v)) return invalid(['body', k], 'Input should be a valid date in the format YYYY-MM-DD', v, 'date_from_datetime_parsing')
    if (rule === 'str' && typeof v !== 'string') return invalid(['body', k], 'Input should be a valid string', v, 'string_type')
    if (rule === 'int' && !Number.isInteger(v)) return invalid(['body', k], 'Input should be a valid integer', v, 'int_type')
    if (Array.isArray(rule) && !rule.includes(v)) return invalid(['body', k], `Input should be ${rule.map((x) => `'${x}'`).join(' or ')}`, v, 'literal_error')
  }
  return null
}
const TAG_FIELDS = { name: 'str', relationship_to_creator: 'str', photo_url: 'str', birth_date: 'date', birth_date_precision: PRECISION, birthplace: 'str', died_on: 'date', died_on_precision: PRECISION }
const NOTE_CREATE = { user_id: 'int', tag_profile_id: 'int', kind: ['note', 'history'], body: 'str', happened_on: 'date', happened_precision: PRECISION }
const NOTE_UPDATE = { kind: ['note', 'history'], body: 'str', happened_on: 'date', happened_precision: PRECISION }
const DETAILS_FIELDS = { birth_date: 'date', birthplace: 'str', birth_date_visibility: ['relatives', 'only_me'] }

// utils/family.py clean_text: CRLF to LF, no control characters but \t and \n, no bidi
// overrides or isolates (zero-width joiners stay), trimmed, at most one blank line in a row
const UNSAFE = /[\x00-\x08\x0b-\x1f\x7f-\x9f‪-‮⁦-⁩]/g
const cleanText = (raw) => String(raw).replace(/\r\n/g, '\n').replace(UNSAFE, '').trim().replace(/\n{3,}/g, '\n\n')
const chars = (t) => [...t].length // Python counts code points
function cleanBody(raw) {
  const body = cleanText(raw)
  if (!body) return { res: { status: 422, json: { detail: 'Write something first.' } } }
  if (chars(body) > MAX_NOTE) return { res: { status: 422, json: { detail: `Keep it to ${MAX_NOTE} characters.` } } }
  return { value: body }
}
function cleanPlace(raw) {
  if (raw == null) return { value: null }
  const place = cleanText(raw)
  if (place.includes('\n')) return { res: { status: 422, json: { detail: 'A birthplace is one line.' } } }
  if (chars(place) > MAX_PLACE) return { res: { status: 422, json: { detail: `Keep the birthplace to ${MAX_PLACE} characters.` } } }
  return { value: place || null }
}
const unprocessable = (detail) => ({ res: { status: 422, json: { detail } } })
/** Stored form: month precision as YYYY-MM-01, year precision as YYYY-01-01. */
const normalise = (ymd, precision) => (precision === 'month' ? `${ymd.slice(0, 7)}-01` : precision === 'year' ? `${ymd.slice(0, 4)}-01-01` : ymd)
const nextDay = (ymd) => {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}
/** utils/family.py note_date: the stored {on, precision}, or a 422. */
function noteDate(kind, on, precision) {
  if (on == null) return precision != null ? unprocessable('A date precision needs a date.') : { value: { on: null, precision: null } }
  if (kind !== 'history') return unprocessable('Only history entries have a date')
  const p = precision || 'day'
  const stored = normalise(on, p)
  if (!(stored >= '1000-01-01' && stored <= nextDay(TODAY))) return unprocessable('Choose a date between the year 1000 and today.')
  return { value: { on: stored, precision: p } }
}
/** utils/family.py tag_dates: the stored birth and death pairs, or a 422. */
function tagDates(birth, birthP, died, diedP) {
  if (birth == null && birthP != null) return unprocessable('A birth date precision needs a birth date.')
  if (died == null && diedP != null) return unprocessable('A date of death precision needs a date.')
  const b = birth == null ? null : normalise(birth, birthP)
  const dp = died == null ? null : diedP || 'day'
  const d = died == null ? null : normalise(died, dp)
  if (b && d) {
    // compared at the coarser of the two precisions: born 10 June 1952, died 1952 is fine
    const grain = PRECISION[Math.max(PRECISION.indexOf(birthP || 'day'), PRECISION.indexOf(dp))]
    if (normalise(d, grain) < normalise(b, grain)) return unprocessable('The date of death is before the birth date.')
  }
  return { value: { birth_date: b, birth_date_precision: b == null ? null : birthP ?? null, died_on: d, died_on_precision: dp } }
}
/** tag_profiles.py _merged_date: a new date keeps the old precision unless one is sent; a null date clears both. */
function mergedDate(sent, dateKey, precisionKey, oldDate, oldPrecision) {
  if (dateKey in sent) {
    const next = sent[dateKey]
    return [next, next ? (precisionKey in sent ? sent[precisionKey] : oldPrecision) : null]
  }
  return [oldDate ?? null, precisionKey in sent ? sent[precisionKey] : oldPrecision ?? null]
}

/** A member's birth keys for GET /users/me (birthday_fields). */
function birthdayFields(d) {
  return d ? { birth_date: d.birth_date ?? null, birthplace: d.birthplace ?? null, birth_date_visibility: d.birth_date_visibility } : { birth_date: null, birthplace: null, birth_date_visibility: 'relatives' }
}
/** PUT /users/me/family-details: only the fields sent; null clears; never "public". */
function saveBirthday(F, viewer, body, demo) {
  if (demo) return DEMO_REFUSED
  const sent = body || {}
  const bad = badFields(sent, DETAILS_FIELDS)
  if (bad) return bad
  if ('birth_date_visibility' in sent && sent.birth_date_visibility == null) return { status: 422, json: { detail: 'Choose who sees your birthday.' } }
  if (sent.birth_date != null && !(sent.birth_date >= '1900-01-01' && sent.birth_date <= TODAY)) return { status: 422, json: { detail: 'Choose a birthday between 1900 and today.' } }
  const place = cleanPlace(sent.birthplace ?? null)
  if (place.res) return place.res
  const d = (F.details[viewer] ||= { birth_date: null, birthplace: null, birth_date_visibility: 'relatives' })
  if ('birth_date' in sent) d.birth_date = sent.birth_date
  if ('birthplace' in sent) d.birthplace = place.value
  if ('birth_date_visibility' in sent) d.birth_date_visibility = sent.birth_date_visibility
  return { status: 200, json: birthdayFields(d) }
}

const acceptedPair = (F, a, b) => F.pairs.some((x) => x.status === 'accepted' && ((x.a === a && x.b === b) || (x.a === b && x.b === a)))
/** utils/family.py resolve_subject: who the note is about, and whether the viewer is their family. */
function resolveSubject(state, F, viewer, userId, tagId) {
  const db = state.db
  if ((userId == null) === (tagId == null)) return { res: { status: 422, json: { detail: 'Give either user_id or tag_profile_id.' } } }
  if (userId != null) {
    const key = keyOfUserId(db, userId)
    if (!key) return { res: { status: 404, json: { detail: 'User not found' } } }
    const u = db.users[key]
    return { userKey: key, userId: u.id, tagId: null, name: u.display_name || u.full_name || u.username, owner: key, isFamily: key === viewer || acceptedPair(F, viewer, key) }
  }
  const tag = F.tags.find((t) => t.id === Number(tagId))
  if (!tag) return { res: { status: 404, json: { detail: 'Tag profile not found' } } }
  // its creator, users with an approved link, and the creator's accepted relatives
  const isFamily = tag.by === viewer || tag.links.some((l) => l.user === viewer) || acceptedPair(F, viewer, tag.by)
  return { userKey: null, userId: null, tagId: tag.id, name: tag.name, owner: tag.by, isFamily }
}
const forbidden = (subject) => ({ status: 403, json: { detail: `Only ${subject.name}'s family can see notes about ${subject.name}.` } })
const isAbout = (n, subject) => (subject.tagId != null ? n.tag === subject.tagId : n.user === subject.userKey)
const subjectOfNote = (state, F, viewer, n) => (n.tag != null ? resolveSubject(state, F, viewer, null, n.tag) : resolveSubject(state, F, viewer, state.db.users[n.user]?.id ?? -1, null))

/** FamilyNoteResponse. */
function noteRow(n, viewer, subject, dir, demo) {
  const a = dir(n.by)
  return {
    id: n.id,
    subject_user_id: subject.userId,
    subject_tag_profile_id: subject.tagId,
    kind: n.kind,
    body: n.body,
    happened_on: n.on,
    happened_precision: n.precision,
    author: { id: a.id, username: a.username, display_name: a.display_name, avatar_url: a.avatar_url ?? null },
    created_at: n.created_at,
    edited_at: n.edited_at,
    can_edit: !demo && n.by === viewer && subject.isFamily,
    can_delete: !demo && (viewer === n.by || viewer === subject.owner),
  }
}
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const historyOrder = (a, b) => (!a.on !== !b.on ? (!a.on ? 1 : -1) : cmp(a.on || '', b.on || '') || cmp(a.created_at, b.created_at) || a.id - b.id)
const notesOrder = (a, b) => cmp(b.created_at, a.created_at) || b.id - a.id
/** FamilyNotePage: limit + 1 rows tell has_more. */
function notesPage(F, subject, kind, skip, limit, viewer, demo, dir) {
  const rows = F.notes.filter((n) => isAbout(n, subject) && n.kind === kind).sort(kind === 'history' ? historyOrder : notesOrder).slice(skip, skip + limit + 1)
  return { items: rows.slice(0, limit).map((n) => noteRow(n, viewer, subject, dir, demo)), has_more: rows.length > limit }
}
/** The query of GET /family-notes, with FastAPI's 422s. */
function notesQuery(q) {
  const int = (k, dflt) => {
    if (q[k] == null || q[k] === '') return { value: dflt }
    return /^-?\d+$/.test(String(q[k])) ? { value: Number(q[k]) } : { res: invalid(['query', k], 'Input should be a valid integer, unable to parse string as an integer', q[k], 'int_parsing') }
  }
  const userId = int('user_id', null), tagId = int('tag_profile_id', null), skip = int('skip', 0), limit = int('limit', 10)
  for (const x of [userId, tagId, skip, limit]) if (x.res) return x
  if (q.kind != null && !['note', 'history'].includes(q.kind)) return { res: invalid(['query', 'kind'], "Input should be 'note' or 'history'", q.kind, 'literal_error') }
  if (skip.value < 0) return { res: invalid(['query', 'skip'], 'Input should be greater than or equal to 0', q.skip, 'greater_than_equal') }
  if (limit.value < 1) return { res: invalid(['query', 'limit'], 'Input should be greater than or equal to 1', q.limit, 'greater_than_equal') }
  if (limit.value > 50) return { res: invalid(['query', 'limit'], 'Input should be less than or equal to 50', q.limit, 'less_than_equal') }
  return { value: { userId: userId.value, tagId: tagId.value, kind: q.kind ?? null, skip: skip.value, limit: limit.value } }
}

function notesRoute(req, state, F, viewer, demo) {
  const { method: m, path: p, body } = req
  const dir = dirOf(state.db)
  if (p === '/family-notes' && m === 'GET') {
    if (F.set === 'notes-error') return { status: 500, json: { detail: 'Internal Server Error' } }
    const q = notesQuery(req.query || {})
    if (q.res) return q.res
    const { userId, tagId, kind, skip, limit } = q.value
    const subject = resolveSubject(state, F, viewer, userId, tagId)
    if (subject.res) return subject.res
    if (!subject.isFamily) return forbidden(subject)
    const page = (k) => (kind == null || kind === k ? notesPage(F, subject, k, skip, limit, viewer, demo, dir) : null)
    return { status: 200, json: { subject_user_id: subject.userId, subject_tag_profile_id: subject.tagId, can_write: !demo, history: page('history'), notes: page('note') } }
  }
  if (p === '/family-notes' && m === 'POST') {
    if (demo) return DEMO_REFUSED
    const b = body || {}
    if (b.body == null) return invalid(['body', 'body'], 'Field required', b, 'missing')
    const bad = badFields(b, NOTE_CREATE)
    if (bad) return bad
    const subject = resolveSubject(state, F, viewer, b.user_id ?? null, b.tag_profile_id ?? null)
    if (subject.res) return subject.res
    if (!subject.isFamily) return forbidden(subject)
    const kind = b.kind ?? 'note'
    const text = cleanBody(b.body)
    if (text.res) return text.res
    const when = noteDate(kind, b.happened_on ?? null, b.happened_precision ?? null)
    if (when.res) return when.res
    if ((F.written[viewer] || 0) >= 30) return { status: 429, json: { detail: 'That is a lot of notes at once. Try again in a few minutes.' } }
    F.written[viewer] = (F.written[viewer] || 0) + 1
    const n = { id: F.nextNote++, user: subject.userKey, tag: subject.tagId, by: viewer, kind, body: text.value, on: when.value.on, precision: when.value.precision, created_at: NOW, edited_at: null }
    F.notes.push(n)
    return { status: 201, json: noteRow(n, viewer, subject, dir, demo) }
  }
  const r = p.match(/^\/family-notes\/(\d+)$/)
  if (!r || (m !== 'PATCH' && m !== 'DELETE')) return { status: 405, json: { detail: 'Method Not Allowed' } }
  if (demo) return DEMO_REFUSED
  const sent = body || {}
  if (m === 'PATCH') {
    const bad = badFields(sent, NOTE_UPDATE)
    if (bad) return bad
  }
  const n = F.notes.find((x) => x.id === Number(r[1]))
  if (!n) return { status: 404, json: { detail: 'Note not found' } }
  const subject = subjectOfNote(state, F, viewer, n)
  if (subject.res) return { status: 404, json: { detail: 'Note not found' } }
  if (m === 'DELETE') {
    // the author (even after losing access), the member it is about, or the tag's creator
    if (viewer !== n.by && viewer !== subject.owner) {
      if (!subject.isFamily) return { status: 404, json: { detail: 'Note not found' } }
      return { status: 403, json: { detail: `Only the author or ${subject.name} can delete this note.` } }
    }
    F.notes = F.notes.filter((x) => x !== n)
    return { status: 200, json: { message: 'Note deleted' } }
  }
  // PATCH: the author only, while still family; only the fields sent, the rules on the result
  if (n.by !== viewer) {
    if (!subject.isFamily) return { status: 404, json: { detail: 'Note not found' } }
    return { status: 403, json: { detail: 'Only the author can edit this note.' } }
  }
  if (!subject.isFamily) return forbidden(subject)
  if ('kind' in sent && sent.kind == null) return { status: 422, json: { detail: 'Choose note or history.' } }
  if ('body' in sent && sent.body == null) return { status: 422, json: { detail: 'Write something first.' } }
  const kind = 'kind' in sent ? sent.kind : n.kind
  const text = 'body' in sent ? cleanBody(sent.body) : { value: n.body }
  if (text.res) return text.res
  let on, precision
  if ('happened_on' in sent) {
    on = sent.happened_on
    precision = on ? ('happened_precision' in sent ? sent.happened_precision : n.precision) : null
  } else if ('happened_precision' in sent) {
    precision = sent.happened_precision
    on = precision ? n.on : null
  } else {
    on = n.on
    precision = n.precision
  }
  const when = noteDate(kind, on ?? null, precision ?? null)
  if (when.res) return when.res
  Object.assign(n, { kind, body: text.value, on: when.value.on, precision: when.value.precision, edited_at: NOW })
  return { status: 200, json: noteRow(n, viewer, subject, dir, demo) }
}
