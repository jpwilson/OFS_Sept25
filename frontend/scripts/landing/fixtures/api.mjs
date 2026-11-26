// Answers every /api/v1 request the app makes, from the sample-family fixtures.
// Shapes follow backend/app/schemas and backend/app/api, plus the extra fields the
// frontend reads. Returning undefined means "no fixture": the capture run logs it and fails.
import { USERS, ME, FOLLOWER_KEYS, CLOSE_FAMILY, FOLLOWING_KEYS, RUN_CLUB, BISCUIT } from './cast.mjs';
import { STORIES, COAST_STOPS } from './stories.mjs';
import { COMMENTS, likesFor, PHOTO_REACTIONS, tagsFor } from './comments.mjs';
import { img, VIDEO_RACE } from './media.mjs';

const T = '2026-08-17T19:30:00Z';

// The signed-in person: Maya by default; reader scenes sign in as someone in her audience.
export function meResponse(theme = 'light', viewer = 'maya') {
  const u = USERS[viewer];
  const own = STORIES.filter((s) => s.author === viewer).length;
  return {
    ...u, banner_url: null, theme_preference: theme,
    subscription_tier: 'premium', subscription_status: 'active', subscription_started_at: '2025-11-02T09:00:00Z', subscription_ends_at: null,
    trial_end_date: null, trial_days_remaining: 0, is_within_first_5_days: false, can_access_content: true,
    event_count: own, follower_count: viewer === 'maya' ? FOLLOWER_KEYS.length : 6, following_count: viewer === 'maya' ? FOLLOWING_KEYS.length : 7,
    is_superuser: false, is_demo_account: false,
  };
}

// ------------------------------------------------------------------ events
function mediaFor(s) {
  return s.images.map(([id, caption], i) => {
    const isVideo = id === 'video';
    const url = isVideo ? VIDEO_RACE : id === 'cover' ? img(...s.cover) : img(id);
    const stop = s.stops?.find((st) => st.photo === id || (id === 'cover' && st.photo.startsWith('cover-')));
    return {
      id: s.id * 100 + i, event_id: s.id, image_url: url, caption, latitude: stop?.lat ?? null, longitude: stop?.lng ?? null,
      timestamp: stop?.ts ?? null, order_index: i, alt_text: caption, width: 1448, height: 1086, file_size: null,
      media_type: isVideo ? 'video' : 'image', duration_seconds: isVideo ? 6 : null,
      video_thumbnail_url: isVideo ? img('photo-race-video') : null, processing_status: 'ready',
      original_size: null, compressed_size: null, created_at: s.created_at, updated_at: s.created_at,
      __key: id,
    };
  });
}

let viewerKey = 'maya';
function eventFull(s) {
  const a = USERS[s.author];
  const likes = likesFor(s.id, viewerKey);
  return {
    id: s.id, slug: s.slug, title: s.title, short_title: s.short_title, summary: s.summary, description: s.body,
    start_date: s.start_date, end_date: s.end_date, location_name: s.location_name, latitude: s.latitude, longitude: s.longitude,
    cover_image_url: img(...s.cover), has_multiple_locations: !!s.stops, privacy_level: s.privacy_level,
    category: s.category, category_2: s.category_2, custom_group_id: s.custom_group_id ?? null,
    author_id: a.id, author_username: a.username, author_full_name: a.full_name, author_avatar_url: a.avatar_url,
    view_count: 40 + s.id % 17, like_count: likes.like_count, comment_count: (COMMENTS[s.id] || []).length,
    is_published: true, share_enabled: false, share_expires_at: null, created_at: s.created_at, updated_at: s.created_at,
    content_blocks: [], locations: locationsFor(s), event_images: mediaFor(s).map(({ __key, ...m }) => m),
  };
}
const eventListItem = (s) => eventFull(s);

function locationsFor(s) {
  if (!s.stops) return [];
  // the first stop is the event's own location (EventDetail adds it as the primary pin)
  return s.stops.slice(1).map((st, i) => ({
    id: s.id * 10 + i, event_id: s.id, location_name: st.name, latitude: st.lat, longitude: st.lng, location_type: 'inline_marker',
    timestamp: st.ts, order_index: i, section_id: null, section_title: null, associated_image_url: img(st.photo), additional_data: null,
    created_at: s.created_at, updated_at: s.created_at,
  }));
}

const findStory = (ident) => STORIES.find((s) => String(s.id) === String(ident) || s.slug === ident);

function mediaStats(ids) {
  const all = STORIES.flatMap(mediaFor);
  return ids.map((id) => {
    const m = all.find((x) => x.id === Number(id));
    const rc = m ? PHOTO_REACTIONS[m.__key] || null : null;
    const n = rc ? Object.values(rc).reduce((a, b) => a + b, 0) : 0;
    return { media_id: Number(id), like_count: n, comment_count: 0, is_liked: false, user_reaction: null, reaction_counts: rc };
  });
}

// ------------------------------------------------------------------ people
const followerRow = (k) => ({ id: USERS[k].id, username: USERS[k].username, full_name: USERS[k].full_name, avatar_url: USERS[k].avatar_url, is_close_family: CLOSE_FAMILY.has(k), status: 'accepted' });
const followingRow = (k) => ({ id: USERS[k].id, user_id: USERS[k].id, username: USERS[k].username, full_name: USERS[k].full_name, display_name: USERS[k].full_name, avatar_url: USERS[k].avatar_url, notify_new_events: true });
const userByName = (n) => Object.values(USERS).find((u) => u.username === n);
const keyOf = (u) => Object.keys(USERS).find((k) => USERS[k] === u);

function groupFull() {
  return {
    id: RUN_CLUB.id, owner_id: ME.id, name: RUN_CLUB.name, description: RUN_CLUB.description, created_at: '2026-01-04T10:00:00Z', updated_at: '2026-04-01T10:00:00Z',
    member_count: RUN_CLUB.member_keys.length,
    members: RUN_CLUB.member_keys.map((k) => ({ id: USERS[k].id, group_id: RUN_CLUB.id, user_id: USERS[k].id, added_at: '2026-01-04T10:00:00Z', username: USERS[k].username, full_name: USERS[k].full_name, avatar_url: USERS[k].avatar_url })),
  };
}

// Maya's confirmed relationships, for the family tree.
const REL = [
  ['tom', 'husband', 'wife'], ['ivy', 'daughter', 'mother'], ['leo', 'son', 'mother'], ['joe', 'father', 'daughter'],
  ['ruth', 'mother-in-law', 'daughter-in-law'], ['marcus', 'brother', 'sister'], ['kate', 'sister-in-law', 'sister-in-law'], ['finn', 'nephew', 'aunt'],
];
const relRow = ([k, mine, theirs], i) => ({
  id: 900 + i, other_user_id: USERS[k].id, other_user_username: USERS[k].username, other_user_display_name: USERS[k].full_name, other_user_full_name: USERS[k].full_name,
  other_user_avatar_url: USERS[k].avatar_url, my_relationship_to_them: mine, their_relationship_to_me: theirs, status: 'accepted', proposed_by_me: true,
  created_at: '2026-01-05T10:00:00Z', accepted_at: '2026-01-05T12:00:00Z',
});
const biscuitFull = () => ({ ...BISCUIT, birth_date: null, is_merged: false, merged_user_id: null, relationships: [{ id: 950, user_id: ME.id, username: ME.username, display_name: ME.full_name, avatar_url: ME.avatar_url, relationship_type: 'pet owner', created_at: BISCUIT.created_at }] });

// ------------------------------------------------------------------ AI + import
export const KITCHEN_UPLOADS = ['photo-kitchen-done', 'photo-kitchen-before', 'photo-kitchen-sledge', 'photo-kitchen-camping', 'photo-kitchen-tiling', 'photo-kitchen-paint'];
export const VOICE_NOTE = "So this is the kitchen. We ripped the whole thing out in February, the old orange pine one, Tom did the first cupboard with a hammer and it basically fell off on its own. Then six weeks on a camping stove in the living room, pizza on the floor on Fridays. I did the tiles, the kids painted the doors green, Leo got paint on his nose. And the first morning it was finished we made pancakes and ate them standing up.";

function aiKitchen(state) {
  const urls = state.uploaded?.length ? state.uploaded : KITCHEN_UPLOADS.map((id) => img(id));
  const at = (i) => urls[i] || urls[0];
  const caps = [
    'The finished kitchen, and the first pancakes.', 'Before: the orange pine kitchen on its last night.', 'Tom takes the first swing.',
    'Pizza on the living-room floor, camping-stove weeks.', 'Laying the patterned floor tiles.', 'Sage green cupboard doors, and one green nose.',
  ];
  const html = [
    '<h1>Before</h1>', '<p>For six years we said we would do something about the orange pine kitchen. This February, we finally did.</p>', `<img src="${at(1)}">`,
    '<h1>The rip-out</h1>', '<p>Tom took the first swing at the cupboards, and the first door gave up before the hammer even landed. By the end of the weekend the room was bare plaster and one surprised pipe.</p>', `<img src="${at(2)}">`,
    '<h1>Living on a camping stove</h1>', '<h2>Pizza Fridays</h2>', '<p>For six weeks we cooked on a camping stove in the living room. Fridays were pizza on the floor, which the children now want to keep.</p>', `<img src="${at(3)}">`,
    '<h1>Tiles and paint</h1>', '<p>Maya laid the patterned floor tiles herself. Ivy and Leo painted the cupboard doors sage green, and Leo painted his nose to match.</p>', `<img src="${at(4)}">`, `<img src="${at(5)}">`,
    '<h1>The first pancakes</h1>', '<p>On the first morning in the finished kitchen we made pancakes and ate them standing round the island.</p>', `<img src="${at(0)}">`,
  ].join('');
  return {
    suggested_title: 'Six weeks without a kitchen', story_html: html, suggested_category: 'Project', location_name: 'Bristol, England',
    original_text: VOICE_NOTE, photo_captions: caps.map((caption, i) => ({ image_url: at(i), caption })),
  };
}

// Smart Import: files are dropped in this order (see scenes.mjs) and clustered as the server would.
export const IMPORT_ORDER = [
  'photo-coast-harbour', 'photo-coast-cliff', 'photo-coast-van', 'photo-coast-mine', 'photo-coast-beach', 'photo-coast-theatre',
  'photo-race-start', 'photo-race-mile20', 'photo-race-kids', 'photo-race-finish', 'photo-race-video', 'photo-race-hug', 'photo-race-chips',
  'photo-kitchen-tiling', 'photo-kitchen-paint', 'photo-kitchen-done', 'photo-kitchen-camping',
  'photo-year-birthday', 'photo-year-rocket', 'photo-year-gala',
  'photo-kitchen-before', 'photo-kitchen-sledge',
  'photo-year-school', 'photo-year-halloween', 'photo-year-joe70',
];
const ix = (...ids) => ids.map((id) => IMPORT_ORDER.indexOf(id));
const album = (ids, o) => ({
  photo_ids: ix(...ids), photo_count: ids.length, chapters: o.chapters.map(([date, cids]) => ({ date, photo_ids: ix(...cids) })),
  start_ts: o.start, end_ts: o.end, days: o.chapters.length, centroid: o.centroid, geo_frac: o.centroid ? 1.0 : 0, confidence: o.confidence,
  is_trip: o.trip, title_hint: o.hint, cover_photo_id: ix(o.cover)[0],
});
const CLUSTER = {
  albums: [
    album(['photo-coast-harbour', 'photo-coast-cliff', 'photo-coast-van', 'photo-coast-mine', 'photo-coast-beach', 'photo-coast-theatre'], {
      start: '2026-08-08T16:20:00', end: '2026-08-14T20:10:00', centroid: { latitude: 50.1653, longitude: -5.672 }, confidence: 'high', trip: true, hint: '6 days in {place}', cover: 'photo-coast-cliff',
      chapters: [['2026-08-08', ['photo-coast-harbour']], ['2026-08-09', ['photo-coast-cliff']], ['2026-08-10', ['photo-coast-van']], ['2026-08-11', ['photo-coast-mine']], ['2026-08-13', ['photo-coast-beach']], ['2026-08-14', ['photo-coast-theatre']]],
    }),
    album(['photo-race-start', 'photo-race-mile20', 'photo-race-kids', 'photo-race-finish', 'photo-race-video', 'photo-race-hug', 'photo-race-chips'], {
      start: '2026-04-26T08:31:00', end: '2026-04-26T15:02:00', centroid: { latitude: 51.4769, longitude: -0.0005 }, confidence: 'high', trip: true, hint: 'Day trip to {place}', cover: 'photo-race-finish',
      chapters: [['2026-04-26', ['photo-race-start', 'photo-race-mile20', 'photo-race-kids', 'photo-race-finish', 'photo-race-video', 'photo-race-hug', 'photo-race-chips']]],
    }),
    album(['photo-kitchen-tiling', 'photo-kitchen-paint', 'photo-kitchen-done', 'photo-kitchen-camping'], {
      start: '2026-03-07T10:12:00', end: '2026-03-08T09:40:00', centroid: { latitude: 51.4645, longitude: -2.5826 }, confidence: 'medium', trip: false, hint: 'Weekend in {place}', cover: 'photo-kitchen-done',
      chapters: [['2026-03-07', ['photo-kitchen-tiling', 'photo-kitchen-paint', 'photo-kitchen-camping']], ['2026-03-08', ['photo-kitchen-done']]],
    }),
    album(['photo-year-birthday', 'photo-year-rocket', 'photo-year-gala'], {
      start: '2026-10-17T14:05:00', end: '2026-10-17T17:30:00', centroid: { latitude: 51.4645, longitude: -2.5826 }, confidence: 'medium', trip: false, hint: 'Saturday afternoon in {place}', cover: 'photo-year-birthday',
      chapters: [['2026-10-17', ['photo-year-birthday', 'photo-year-rocket', 'photo-year-gala']]],
    }),
    album(['photo-kitchen-before', 'photo-kitchen-sledge'], {
      start: '2026-02-01T09:15:00', end: '2026-02-01T11:02:00', centroid: null, confidence: 'low', trip: false, hint: 'Sunday morning', cover: 'photo-kitchen-before',
      chapters: [['2026-02-01', ['photo-kitchen-before', 'photo-kitchen-sledge']]],
    }),
  ],
  unsorted_photo_ids: ix('photo-year-school', 'photo-year-halloween', 'photo-year-joe70'),
};

function geocode(lat, lng) {
  const places = [
    [50.1653, -5.672, { name: 'St Ives, Cornwall, England, United Kingdom', address: { town: 'St Ives', county: 'Cornwall', country: 'United Kingdom' } }],
    [51.4769, -0.0005, { name: 'Greenwich, London, England, United Kingdom', address: { suburb: 'Greenwich', city: 'London', country: 'United Kingdom' } }],
    [51.4645, -2.5826, { name: 'Bristol, England', address: { city: 'Bristol', country: 'United Kingdom' } }],
  ];
  let best = places[0], d = Infinity;
  for (const p of places) { const dd = (p[0] - lat) ** 2 + (p[1] - lng) ** 2; if (dd < d) { d = dd; best = p; } }
  // SmartImport names the coast album after the town; prefer the town over the suburb for London.
  const a = { ...best[2].address };
  if (a.suburb && a.city) delete a.city;
  return { name: best[2].name, latitude: lat, longitude: lng, type: 'city', place_id: 1000 + Math.round(lat * 10), address: a };
}

// ------------------------------------------------------------------ router
export async function answer(req, u, state) {
  viewerKey = state.viewer || 'maya';
  const m = req.method();
  const p = u.pathname.replace(/^\/api\/v1/, '').replace(/\/$/, '') || '/';
  const q = u.searchParams;
  let r;
  const is = (re) => (r = p.match(re));

  // --- auth / me
  if (m === 'GET' && p === '/users/me') return meResponse(state.theme, state.viewer);
  if (m === 'GET' && p === '/users/me/notification-counts') return { total: 0, follow_requests: 0, tag_requests: 0, profile_claims: 0 };
  if (m === 'GET' && p === '/users/me/followers') return FOLLOWER_KEYS.map(followerRow);
  if (m === 'GET' && p === '/users/me/following') return FOLLOWING_KEYS.map(followingRow);
  if (m === 'GET' && p === '/users/me/muted') return [];
  if (m === 'GET' && p === '/users/me/follow-requests') return [];
  if (m === 'GET' && p === '/users/me/follow-requests/sent') return [];
  if (m === 'GET' && p === '/users/me/follow-requests/count') return { count: 0 };
  if (m === 'GET' && p === '/users/me/notification-preferences') return { notify_follow_requests: true, notify_new_comments: true, notify_new_events: true };
  if (m === 'GET' && p === '/me/tag-requests') return [];
  if (m === 'GET' && p === '/me/tag-requests/count') return { count: 0 };
  if (m === 'GET' && /^\/me\/(tag-profile-claims|tag-profile-relationship-requests)(\/sent)?$/.test(p)) return [];
  if (m === 'GET' && /^\/me\/(tag-profile-claims|tag-profile-relationship-requests)\/count$/.test(p)) return { count: 0 };

  // --- events
  if (m === 'GET' && p === '/events') return STORIES.map(eventListItem);
  if (m === 'GET' && p === '/events/drafts') return [];
  if (m === 'GET' && p === '/events/trash') return [];
  if (m === 'GET' && p === '/events/me/last-location') return { location_name: 'Bristol, England', latitude: 51.4645, longitude: -2.5826 };
  if (m === 'GET' && is(/^\/events\/([^/]+)$/)) { const s = findStory(r[1]); return s ? eventFull(s) : { __http: 404, body: { detail: 'Event not found' } }; }
  if (m === 'GET' && is(/^\/events\/(\d+)\/comments$/)) return COMMENTS[r[1]] || [];
  if (m === 'GET' && is(/^\/events\/(\d+)\/likes$/)) { const { all, ...l } = likesFor(Number(r[1]), viewerKey); return l; }
  if (m === 'GET' && is(/^\/events\/(\d+)\/likes\/all$/)) return likesFor(Number(r[1])).all;
  if (m === 'GET' && is(/^\/events\/(\d+)\/tags$/)) { const s = findStory(r[1]); return tagsFor(Number(r[1]), USERS[s?.author || 'maya'].id); }
  if (m === 'GET' && is(/^\/events\/(\d+)\/locations$/)) { const s = findStory(r[1]); return s ? locationsFor(s) : []; }
  if (m === 'GET' && is(/^\/events\/(\d+)\/share$/)) return { __http: 404, body: { detail: 'No share link' } };
  if (m === 'POST' && is(/^\/events\/(\d+)\/share$/)) {
    let days = 3; try { days = JSON.parse(req.postData() || '{}').expires_in_days || 3; } catch {}
    return { share_token: 'k7Qp2sVx9mLc', share_url: '/share/k7Qp2sVx9mLc', expires_at: new Date(Date.UTC(2027, 0, 12 + days, 10)).toISOString(), view_count: 0, shared_on: '2027-01-12T10:00:00Z' };
  }
  if (m === 'GET' && p === '/media/batch/stats') return mediaStats((q.get('ids') || '').split(',').filter(Boolean));
  if (m === 'GET' && p === '/media/batch/likes') return mediaStats((q.get('ids') || '').split(',').filter(Boolean)).map(({ media_id, like_count }) => ({ media_id, like_count, is_liked: false }));
  if (m === 'GET' && is(/^\/media\/(\d+)\/likes$/)) { const [s] = mediaStats([r[1]]); return { like_count: s.like_count, is_liked: false, user_reaction: null, reaction_counts: s.reaction_counts || {}, recent_likes: [] }; }
  if (m === 'GET' && is(/^\/media\/(\d+)\/comments$/)) return [];
  if (m === 'GET' && is(/^\/upload\/event-images\/(\d+)$/)) { const s = findStory(r[1]); return s ? eventFull(s).event_images : []; }
  if (m === 'GET' && p === '/share-links') return { share_links: [] };

  // --- people
  if (m === 'GET' && is(/^\/users\/([^/]+)$/) && !['me', 'search'].includes(r[1])) {
    const usr = userByName(r[1]); if (!usr) return { __http: 404, body: { detail: 'User not found' } };
    const k = keyOf(usr);
    const own = STORIES.filter((s) => s.author === k).length;
    return { id: usr.id, username: usr.username, full_name: usr.full_name, display_name: usr.full_name, bio: usr.bio, avatar_url: usr.avatar_url, banner_url: null,
      event_count: own, follower_count: k === 'maya' ? FOLLOWER_KEYS.length : 6, following_count: k === 'maya' ? FOLLOWING_KEYS.length : 7,
      created_at: usr.created_at, is_active_member: true, subscription_tier: 'premium' };
  }
  if (m === 'GET' && is(/^\/users\/([^/]+)\/is-following(-me)?$/)) return { is_following: true, status: 'accepted' };
  if (m === 'GET' && is(/^\/users\/([^/]+)\/followers$/)) return FOLLOWER_KEYS.map((k) => ({ ...followerRow(k), is_following: true, follows_you: true }));
  if (m === 'GET' && is(/^\/users\/([^/]+)\/following$/)) return FOLLOWING_KEYS.map((k) => ({ ...followerRow(k), is_following: true, follows_you: true }));
  if (m === 'GET' && p === '/users/search/users') return [];
  if (m === 'GET' && p === '/custom-groups') return [groupFull()];
  if (m === 'GET' && is(/^\/custom-groups\/(\d+)$/)) return groupFull();
  if (m === 'GET' && p === '/invitations') return { invitations: [], total: 0 };
  if (m === 'POST' && p === '/invitations/link') return { token: 'sample', invite_url: 'https://www.ourfamilysocials.com/join/sample', message: 'ok' };
  if (m === 'GET' && p === '/relationships') return REL.map(relRow);
  if (m === 'GET' && p === '/relationships/types') return { types: ['wife', 'husband', 'daughter', 'son', 'mother', 'father', 'sister', 'brother', 'friend', 'pet'] };
  if (m === 'GET' && is(/^\/relationships\/with\/(\d+)$/)) { const i = REL.findIndex(([k]) => USERS[k].id === Number(r[1])); return i >= 0 ? relRow(REL[i], i) : { __http: 404, body: { detail: 'none' } }; }
  if (m === 'GET' && p === '/tag-profiles/mine') return [biscuitFull()];
  if (m === 'GET' && is(/^\/tag-profiles\/(\d+)$/)) return biscuitFull();
  if (m === 'GET' && is(/^\/tag-profiles\/(\d+)\/events$/)) return [STORIES[2]].map(eventListItem);
  if (m === 'GET' && is(/^\/tag-profiles\/(\d+)\/relationships$/)) return biscuitFull().relationships;
  if (m === 'GET' && p === '/search/taggable') return [];

  // --- create / AI / import
  if (m === 'POST' && p === '/upload') {
    state.uploaded = state.uploaded || [];
    const ids = state.uploadIds || KITCHEN_UPLOADS;
    const url = img(ids[state.uploaded.length % ids.length]);
    state.uploaded.push(url);
    return { filename: url.split('/').pop(), url, urls: { thumbnail: url, medium: url, full: url }, metadata: {} };
  }
  if (m === 'GET' && p === '/geocoding/reverse') return geocode(Number(q.get('latitude')), Number(q.get('longitude')));
  if (m === 'GET' && p === '/geocoding/search') return [];
  if (m === 'POST' && p === '/admin/ai/transcribe') return { text: VOICE_NOTE };
  if (m === 'POST' && p === '/admin/ai/generate-story') { if (state.holdGenerate) await state.holdGenerate; return aiKitchen(state); }
  if (m === 'POST' && p === '/admin/ai/generate-questions') return { questions: ['What did the kitchen look like before?', 'Who did which job?', 'What was the first thing you cooked?'], context_summary: 'A kitchen renovation over several weeks.' };
  if (m === 'POST' && p === '/admin/ai/cluster-photos') return CLUSTER;
  if (m === 'GET' && p === '/stripe/subscription-status') return { status: 'active', tier: 'premium' };

  return undefined;
}
