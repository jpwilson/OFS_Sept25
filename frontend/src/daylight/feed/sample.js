// FEED's extension of the sample backend (owner: FEED). Asked before the core answers.
// Pure: no browser or Node globals. See dev/sampleApi.js.
//
//  - GET /events leaves out people the viewer has muted, as the server does
//    (backend/app/utils/privacy.py:214-219); the core snapshot does not.
//  - Maya has two drafts and one story in the trash, so Drafts and Trash have something to
//    show; publish, restore and delete-forever work on them in memory.
//  - Follow, unfollow and cancelling a request change what /is-following answers, so the
//    profile's follow states can be walked through (Request to follow, Requested, Following).
import manifest from '../../landing/art/manifest.json'

const art = (id) => (manifest[id] ? `__ORIGIN__${manifest[id].src}` : null)

function seed(db) {
  const maya = db.users.maya
  const base = {
    short_title: null, description: '', end_date: null, latitude: null, longitude: null, has_multiple_locations: false,
    category_2: null, custom_group_id: null, author_id: maya.id, author_username: maya.username, author_full_name: maya.full_name,
    view_count: 0, like_count: 0, comment_count: 0, share_enabled: false, share_expires_at: null, content_blocks: [], locations: [], event_images: [],
  }
  return {
    drafts: [
      {
        ...base, id: 801, slug: 'thanksgiving-at-ruths', title: "Thanksgiving at Ruth's", summary: null,
        start_date: '2026-11-26T13:00:00', location_name: 'Madison, Wisconsin', cover_image_url: null,
        privacy_level: 'close_family', category: 'Holiday', is_published: false, created_at: '2026-11-26T09:40:00Z', updated_at: '2026-11-26T09:40:00Z',
      },
      {
        ...base, id: 802, slug: 'the-kitchen-one-year-on', title: 'The kitchen, one year on', summary: 'What we would change, and the one drawer we got exactly right.',
        start_date: '2026-11-08T10:00:00', location_name: 'Madison, Wisconsin', cover_image_url: art('photo-kitchen-done'),
        privacy_level: 'followers', category: 'Project', is_published: false, created_at: '2026-11-09T20:00:00Z', updated_at: '2026-11-12T21:00:00Z',
      },
    ],
    trash: [
      {
        ...base, id: 803, slug: 'maui-snorkel-day-copy', title: 'Maui: snorkel day (copy)', summary: null,
        start_date: '2026-03-24T09:00:00', end_date: '2026-03-24T09:00:00', location_name: "Ka'anapali, Maui", cover_image_url: art('photo-maui-snorkel'),
        privacy_level: 'followers', category: 'Vacation', is_published: false, created_at: '2026-03-29T18:30:00Z', updated_at: '2026-03-30T08:00:00Z',
      },
    ],
    follow: {},
  }
}

const listShape = (e) => ({ ...e, description: '', short_title: null, category_2: null, like_count: 0, comment_count: 0, locations: [], event_images: [] })

export function answer(req, state, { ok, err, clone }) {
  const { method: m, path: p, query: q = {} } = req
  const db = state.db
  const fx = (state.feed ||= seed(db))
  const mine = state.viewer === 'maya'
  let r

  if (m === 'GET' && p === '/events') {
    const mutedIds = new Set((db.routes['GET /users/me/muted'] || []).map((x) => x.id))
    if (!mutedIds.size) return undefined
    const skip = Number(q.skip || 0), limit = Number(q.limit || 100)
    let list = db.list.filter((e) => !mutedIds.has(e.author_id))
    if (q.order_by === 'upload_date') list = [...list].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    return ok(list.slice(skip, skip + limit))
  }
  if (m === 'GET' && p === '/events/drafts') return ok(mine ? clone(fx.drafts) : [])
  if (m === 'GET' && p === '/events/trash') return ok(mine ? clone(fx.trash) : [])

  if (m === 'POST' && (r = p.match(/^\/events\/(\d+)\/publish$/))) {
    const id = Number(r[1])
    const d = fx.drafts.find((x) => x.id === id)
    if (!d) return err(404, 'Event not found')
    fx.drafts = fx.drafts.filter((x) => x.id !== id)
    const pub = { ...d, is_published: true }
    db.details[id] = pub
    db.slugs[pub.slug] = id
    db.list.unshift(listShape(pub))
    db.list.sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)))
    return ok({ message: 'Event published successfully' })
  }
  if (m === 'POST' && (r = p.match(/^\/events\/(\d+)\/restore$/))) {
    const id = Number(r[1])
    const t = fx.trash.find((x) => x.id === id)
    if (!t) return err(404, 'Event not found')
    fx.trash = fx.trash.filter((x) => x.id !== id)
    fx.drafts.unshift(t) // it was a draft when it was thrown away
    return ok({ message: 'Event restored' })
  }
  if (m === 'DELETE' && (r = p.match(/^\/events\/(\d+)\/permanent$/))) {
    const id = Number(r[1])
    if (!fx.trash.some((x) => x.id === id)) return err(404, 'Event not found')
    fx.trash = fx.trash.filter((x) => x.id !== id)
    return ok({ message: 'Event permanently deleted' })
  }

  if ((m === 'POST' || m === 'DELETE') && (r = p.match(/^\/users\/([^/]+)\/follow$/))) {
    fx.follow[r[1]] = m === 'POST' ? 'pending' : null
    return ok({ status: m === 'POST' ? 'pending' : 'removed', message: 'ok' })
  }
  if (m === 'GET' && (r = p.match(/^\/users\/([^/]+)\/is-following$/)) && r[1] in fx.follow) {
    const st = fx.follow[r[1]]
    return ok({ is_following: st === 'accepted', status: st })
  }
  return undefined
}
