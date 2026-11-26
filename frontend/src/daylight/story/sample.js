// Sample answers for the story page's routes the core sample does not cover (owner: STORY).
// Asked before the core (dev/sampleApi.js). Shapes follow the production endpoints:
//   POST /events/{id}/publish | /unpublish, DELETE /events/{id}       (events.py)
//   GET|POST /media/{id}/comments, DELETE /media/{id}/comments/{cid},
//   POST|DELETE /media/{id}/comments/{cid}/reactions                  (media comments)
export function answer(req, state, { ok, err }) {
  const { method: m, path: p, body } = req
  const db = state.db
  let r
  const is = (re) => (r = p.match(re))

  if (m === 'POST' && is(/^\/events\/(\d+)\/(publish|unpublish)$/)) {
    const d = db.details[r[1]]
    if (!d) return err(404, 'Event not found')
    d.is_published = r[2] === 'publish'
    return ok({ message: d.is_published ? 'Event published' : 'Event moved to drafts', is_published: d.is_published })
  }
  if (m === 'DELETE' && is(/^\/events\/(\d+)$/)) {
    const d = db.details[r[1]]
    if (!d) return err(404, 'Event not found')
    d.is_deleted = true
    db.list = db.list.filter((x) => x.id !== d.id)
    return ok({ message: 'Event moved to trash' })
  }

  const store = (db.mediaComments ||= {})
  if (m === 'GET' && is(/^\/media\/(\d+)\/comments$/)) return ok(store[r[1]] || [])
  if (m === 'POST' && is(/^\/media\/(\d+)\/comments$/)) {
    const u = db.users[state.viewer]
    const list = (store[r[1]] ||= [])
    const parent = list.find((c) => c.id === body?.parent_id)
    const c = {
      id: state.nextCommentId++, media_id: Number(r[1]), author_id: u.id, author_username: u.username, author_full_name: u.full_name, author_display_name: u.full_name,
      author_avatar_url: u.avatar_url, content: body?.content || '', created_at: '2026-11-26T18:00:00Z', parent_id: body?.parent_id ?? null,
      depth: parent ? (parent.depth || 0) + 1 : 0, reaction_count: 0, reaction_counts: {}, user_reaction: null,
    }
    list.push(c)
    const st = db.mediaStats[r[1]]
    if (st) st.comment_count = (st.comment_count || 0) + 1
    return { status: 201, json: c }
  }
  if (m === 'DELETE' && is(/^\/media\/(\d+)\/comments\/(\d+)$/)) {
    store[r[1]] = (store[r[1]] || []).filter((c) => c.id !== Number(r[2]))
    return ok({ message: 'deleted' })
  }
  if ((m === 'POST' || m === 'DELETE') && is(/^\/media\/(\d+)\/comments\/(\d+)\/reactions$/)) {
    const c = (store[r[1]] || []).find((x) => x.id === Number(r[2]))
    if (!c) return err(404, 'Comment not found')
    const rc = (c.reaction_counts ||= {})
    if (c.user_reaction) rc[c.user_reaction] = Math.max(0, (rc[c.user_reaction] || 1) - 1)
    c.user_reaction = m === 'POST' ? body?.reaction_type || 'heart' : null
    if (c.user_reaction) rc[c.user_reaction] = (rc[c.user_reaction] || 0) + 1
    c.reaction_count = Object.values(rc).reduce((a, b) => a + b, 0)
    return ok({ message: 'ok' })
  }
  return undefined
}
