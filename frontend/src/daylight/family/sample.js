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
// Sets: /__fx/family?set=hartley|requests|empty|large|error|lapsed|owner-shape&as=maya&next=/family-tree
//   hartley      the default: everyone in the cast sees their own family (fixtures.js)
//   requests     hartley, plus Nico asking to be Maya's brother, and Maya asking Gina and Ann
//   empty        nobody yet
//   large        about fifty people around Maya, mostly without photos, several tags
//   error        GET /relationships answers 500
//   lapsed       the plan has ended (GET /users/me: can_access_content false, expired)
//   owner-shape  the owner's own family's shape with made-up names; sign in as nate
// GET /__fx/reset puts everything back (the core replaces the whole state).
import { HARTLEYS, LARGE, OWNER, seedPairs, seedTags, relationshipRow, sentRow, pendingRow, tagRow } from './fixtures.js'
import { TYPES } from './kin.js'

export const SETS = ['hartley', 'requests', 'empty', 'large', 'error', 'lapsed', 'owner-shape']
const NOW = '2026-11-26T12:00:00'
const PEOPLE_ROUTES = /^\/(relationships|tag-profiles|me\/tag-profile-relationship-requests)(\/|$)/
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
  for (const [key, p] of Object.entries(truth.people)) if (p.user != null) addUser(db, key, p.user, p.name)
  addUser(db, JORDAN.key, JORDAN.id, JORDAN.name)
  const fam = {
    set,
    truth,
    pairs: set === 'empty' ? [] : seedPairs(truth),
    tags: set === 'empty' ? [] : seedTags(truth),
    tagRequests: [],
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

  if (m === 'GET' && p === '/users/me' && set === 'lapsed' && db.me[viewer]) {
    return ok({ ...db.me[viewer], subscription_status: 'expired', subscription_tier: 'free', can_access_content: false, subscription_ends_at: '2026-11-01T00:00:00' })
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

  // ------------------------------------------------------------ relationships
  if (m === 'GET' && p === '/relationships') {
    if (F.set === 'error') return { status: 500, json: { detail: 'Internal Server Error' } }
    // production orders by accepted_at, newest first; the page must not care
    const rows = F.pairs.filter((x) => x.status === 'accepted' && (x.a === viewer || x.b === viewer)).sort((a, b) => b.id - a.id)
    return ok(rows.map((x) => relationshipRow(x, viewer, dir)))
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
    return x ? ok(relationshipRow(x, viewer, dir)) : err(404, 'No relationship found with this user')
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
    return ok(relationshipRow(rec, viewer, dir))
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
    const word = body.relationship_to_creator || null
    const tag = { id: F.nextTag++, key: null, name: String(body.name), photo: null, photoUrl: body.photo_url || null, birth_date: body.birth_date || null, word, by: viewer, created_at: NOW, links: [] }
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
      if (!seesBirth(tag, viewer)) row.birth_date = null
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
      // production applies only the fields that are not null, and never rewrites the creator's link
      if (body?.name != null) tag.name = String(body.name)
      if (body?.relationship_to_creator != null) tag.word = body.relationship_to_creator
      if (body?.photo_url != null) { tag.photoUrl = body.photo_url; tag.photo = null }
      if (body?.birth_date != null) tag.birth_date = body.birth_date
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
