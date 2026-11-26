// The production shapes, exactly (owner: F0). PLAN-DAYLIGHT 5.6.
// Every key the backend serialises, from the Pydantic models it validates through:
//   list items   GET /events          backend/app/api/events.py:254-283 -> EventResponse (schemas/event.py:68-88)
//   detail       GET /events/{id}     events.py:112-186 build_event_dict -> EventResponse
//   share        GET /share/{token}   share_links.py:242-275 build_event_dict, no response model
// Pydantic fills every schema field, so a list item carries short_title: null,
// description: '', category_2: null, zero counts and empty locations and event_images;
// a detail's photos always say media_type 'image' (build_event_dict omits it).

export const EVENT_KEYS = [
  'title', 'short_title', 'summary', 'description', 'start_date', 'end_date', 'location_name', 'latitude', 'longitude',
  'cover_image_url', 'has_multiple_locations', 'privacy_level', 'category', 'category_2', 'custom_group_id',
  'id', 'slug', 'author_id', 'author_username', 'author_full_name', 'view_count', 'like_count', 'comment_count',
  'is_published', 'share_enabled', 'share_expires_at', 'created_at', 'updated_at', 'content_blocks', 'locations', 'event_images',
]
export const IMAGE_KEYS = [
  'event_id', 'image_url', 'caption', 'latitude', 'longitude', 'timestamp', 'order_index', 'alt_text', 'width', 'height', 'file_size',
  'media_type', 'duration_seconds', 'video_thumbnail_url', 'processing_status', 'original_size', 'compressed_size', 'id', 'created_at', 'updated_at',
]
export const LOCATION_KEYS = [
  'location_name', 'latitude', 'longitude', 'location_type', 'timestamp', 'order_index', 'section_id', 'section_title',
  'associated_image_url', 'additional_data', 'id', 'event_id', 'created_at', 'updated_at',
]
// build_event_dict (share links): no category_2, no media_type and video fields on photos, no associated_image_url
export const SHARE_EVENT_KEYS = EVENT_KEYS.filter((k) => k !== 'category_2')
export const SHARE_IMAGE_KEYS = ['id', 'event_id', 'image_url', 'caption', 'latitude', 'longitude', 'timestamp', 'order_index', 'alt_text', 'width', 'height', 'file_size', 'created_at', 'updated_at']
export const SHARE_LOCATION_KEYS = ['id', 'event_id', 'location_name', 'latitude', 'longitude', 'location_type', 'timestamp', 'order_index', 'section_id', 'section_title', 'additional_data', 'created_at', 'updated_at']

const pick = (o, keys, defaults = {}) => Object.fromEntries(keys.map((k) => [k, k in defaults ? defaults[k] : o[k] === undefined ? null : o[k]]))

export function toImage(im) {
  return pick(im, IMAGE_KEYS, { media_type: 'image', duration_seconds: null, video_thumbnail_url: null, processing_status: 'ready', original_size: null, compressed_size: null })
}
export function toLocation(l) {
  return pick(l, LOCATION_KEYS, { associated_image_url: null })
}
export function toDetail(e) {
  return {
    ...pick(e, EVENT_KEYS, { category_2: null, content_blocks: [] }),
    privacy_level: e.privacy_level || 'public',
    share_enabled: !!e.share_enabled,
    has_multiple_locations: !!e.has_multiple_locations,
    locations: (e.locations || []).map(toLocation),
    event_images: (e.event_images || []).map(toImage),
  }
}
export function toListItem(e) {
  return {
    ...toDetail(e),
    short_title: null, description: '', category_2: null, like_count: 0, comment_count: 0, locations: [], event_images: [],
  }
}
export function toShare(e) {
  return {
    ...pick(e, SHARE_EVENT_KEYS, { content_blocks: [] }),
    locations: (e.locations || []).map((l) => pick(l, SHARE_LOCATION_KEYS)),
    event_images: (e.event_images || []).map((im) => pick(im, SHARE_IMAGE_KEYS)),
  }
}

/** Keys that are not in the production shape, or production keys that are missing. */
export function diffKeys(obj, keys) {
  const have = Object.keys(obj)
  return { extra: have.filter((k) => !keys.includes(k)), missing: keys.filter((k) => !have.includes(k)) }
}
