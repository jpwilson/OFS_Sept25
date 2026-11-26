// From draft to POST /events (stub by F0; CREATE owns this file). PLAN-DAYLIGHT 4.2 steps 3 and 5.
//   composeEvent(draft, ai, edits) -> {eventData, captions, tags}
//   draft: buildDraft() result, with photo urls replaced by uploaded URLs (edits.uploaded: {photoId: url})
//   ai:    the generate-story response or null (the photo story stands on its own)
//   edits: {title, privacy_level, category, custom_group_id, cover, place, start, end, tags, uploaded, summary}
// The stub skips finalizeStoryHtml (keeping the model's text and repairing its photos);
// it builds the photo story with marker spans so the server creates the stops itself.
import { draftHtml } from './draft.js'

export function composeEvent(draft, ai, edits = {}) {
  const uploaded = edits.uploaded || {}
  const withUrls = { ...draft, photos: draft.photos.map((p) => ({ ...p, url: uploaded[p.id] || p.url })) }
  const html = ai?.story_html || draftHtml(withUrls)
  const coverId = edits.cover || draft.cover
  const eventData = {
    title: edits.title || ai?.suggested_title || draft.title,
    summary: edits.summary ?? null,
    description: html,
    start_date: edits.start || draft.start,
    end_date: edits.end || draft.end,
    location_name: edits.place ?? draft.place ?? ai?.location_name ?? null,
    latitude: draft.centroid?.lat ?? null,
    longitude: draft.centroid?.lng ?? null,
    cover_image_url: uploaded[coverId] || null,
    has_multiple_locations: draft.stops.length > 1,
    privacy_level: edits.privacy_level || 'followers',
    category: edits.category || ai?.suggested_category || null,
    custom_group_id: edits.custom_group_id ?? null,
  }
  const captions = (ai?.photo_captions || []).map((c) => ({ image_url: c.image_url, caption: c.caption }))
  return { eventData, captions, tags: edits.tags || [] }
}
