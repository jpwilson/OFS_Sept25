// A placeholder "Seven days in the Tetons" (owner: F0), used by build-sample.mjs only
// until the real story arrives: the landing's round-two fixture (story 110, being finished
// in the landing checkout) or STORY's fixtures/teton.mjs. Same author, dates, seven H1
// days, thirteen named stops and thirty photos as docs/app/PLAN-DAYLIGHT-ALT.md section 6,
// with that section's coordinate corrections applied. The words are short stand-ins built
// from the shot list; STORY writes the real text. Photo URLs are resolved by build-sample.
export const TETON_ID = 110
export const TETON_SLUG = 'seven-days-in-the-tetons'

// [n, day, time, lat, lng, caption, stop]  stop: index into STOPS (named, gets a marker) or null (a photo dot)
export const SHOTS = [
  [1, 1, '14:10', 43.4799, -110.7624, 'The four of us under the antler arch.', 0],
  [2, 1, '16:40', 43.4795, -110.7616, 'Leo asleep in the car seat, mountains in the window.', 0],
  [3, 1, '18:30', 43.4802, -110.7609, 'Burgers and milkshakes, Ivy mid-laugh.', 0],
  [4, 2, '05:50', 43.6607, -110.665, 'The barn at sunrise, nobody in shot.', 1],
  [5, 2, '06:15', 43.6612, -110.6646, 'Tom and Ivy on the rail fence.', 1],
  [6, 2, '07:20', 43.7111, -110.6712, 'The peaks in the beaver pond.', 2],
  [7, 2, '07:45', 43.7113, -110.6709, 'Leo pointing at the beaver dam.', 2],
  [8, 3, '09:30', 43.7594, -110.7332, 'On the shuttle boat across Jenny Lake.', 3],
  [9, 3, '10:15', 43.7663, -110.7512, 'Hidden Falls, Maya and Ivy small at the rocks.', 4],
  [10, 3, '11:05', 43.767, -110.7483, 'All four on the ledge, arms up.', 5],
  [11, 3, '14:30', 43.7515, -110.7223, "Leo's boots over the water at the dock.", 3],
  [12, 4, '09:40', 43.699, -110.742, 'Walking through aspens and wildflowers.', 6],
  [13, 4, '10:50', 43.7041, -110.7546, 'Taggart Lake and its reflection.', 6],
  [14, 4, '12:20', 43.7045, -110.7539, 'Picnic on a flat rock, Ivy drawing.', 6],
  [15, 4, '15:10', 43.6601, -110.7153, 'The log chapel and its window.', null],
  [16, 5, '10:00', 43.7598, -110.6234, 'Life jackets on, the raft, a guide at the oars.', 7],
  [17, 5, '10:40', 43.7262, -110.6529, 'A bald eagle on a dead tree.', null],
  [18, 5, '11:15', 43.6925, -110.6823, 'Ivy trailing a hand in the water.', null],
  [19, 5, '17:30', 43.866, -110.5506, 'A bull moose in the shallows.', 8],
  [20, 5, '17:45', 43.8661, -110.5503, 'Watching it, from behind.', 8],
  [21, 6, '09:20', 43.8459, -110.5756, 'The valley, the lake and the whole range.', 9],
  [22, 6, '09:35', 43.846, -110.5754, 'Maya and Tom, selfie.', 9],
  [23, 6, '13:40', 43.901, -110.645, 'The four of us in a red canoe.', 10],
  [24, 6, '15:20', 43.9018, -110.644, 'Leo and a very small fish.', 10],
  [25, 6, '19:30', 43.9035, -110.642, 'Marshmallows by the cabin.', 10],
  [26, 7, '10:10', 43.7871, -110.7291, 'Ivy and Leo wading.', 11],
  [27, 7, '11:00', 43.7878, -110.7298, 'Tom mid-jump off a rock.', 11],
  [28, 7, '14:20', 43.5875, -110.8281, 'The view down from the tram.', 12],
  [29, 7, '15:00', 43.5972, -110.8706, 'Waffles on the mountaintop deck.', 12],
  [30, 7, '18:40', 43.7539, -110.6241, 'The S-bend of the Snake River and the range.', null],
]
export const STOPS = [
  ['Jackson Town Square', 43.4799, -110.7624],
  ['Mormon Row', 43.6608, -110.6653],
  ['Schwabacher Landing', 43.7109, -110.6719],
  ['Jenny Lake', 43.751, -110.7228],
  ['Hidden Falls', 43.7663, -110.7512],
  ['Inspiration Point', 43.767, -110.7483],
  ['Taggart Lake', 43.7069, -110.7541],
  ["Snake River float, Deadman's Bar", 43.7598, -110.6234],
  ['Oxbow Bend', 43.866, -110.549],
  ['Signal Mountain', 43.8459, -110.5756],
  ['Colter Bay', 43.902, -110.6413],
  ['String Lake', 43.787, -110.729],
  ['Teton Village tram', 43.5875, -110.8279],
]
export const DAYS = [
  'Day 1: Madison to Jackson', 'Day 2: Sunrise on Mormon Row', 'Day 3: Jenny Lake and Inspiration Point', 'Day 4: Taggart Lake',
  'Day 5: The Snake River', 'Day 6: Signal Mountain and Colter Bay', 'Day 7: String Lake and the tram',
]
const LINES = [
  'We landed in Jackson in the early afternoon and walked straight to the square, because Ivy had seen the antler arches in a book.',
  'We were up before five for the barn on Mormon Row, and then the beaver pond at Schwabacher Landing while it was still glassy.',
  'The shuttle boat took us across Jenny Lake to Hidden Falls, and then up the rock steps to Inspiration Point.',
  'An easy trail through the aspens to Taggart Lake, a long picnic on a flat rock, and the log chapel on the way back.',
  "A float down the Snake River from Deadman's Bar, an eagle on a dead tree, and a moose at Oxbow Bend in the evening.",
  'Signal Mountain in the morning, then a red canoe at Colter Bay, a very small fish and marshmallows by the cabin.',
  'Wading at String Lake, the tram up from Teton Village for waffles at the top, and one last look at the river on the way out.',
]

export const day = (d) => `2026-06-${String(13 + d).padStart(2, '0')}`

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const pin = (name, lat, lng, ts) =>
  `<span data-location-marker="" data-location-name="${esc(name)}" data-latitude="${lat}" data-longitude="${lng}" data-timestamp="${ts}" data-place-id="" class="location-marker" contenteditable="false">📍 ${esc(name)}</span>`

/** photoUrl(n) -> absolute URL; users: the landing cast's USERS. */
export function tetonEvent({ photoUrl, users }) {
  const tom = users.tom
  const ts = (s) => `${day(s[1])}T${s[2]}:00`
  const seenStop = new Set()
  const html = []
  for (let d = 1; d <= 7; d++) {
    html.push(`<h1>${esc(DAYS[d - 1])}</h1>`, `<p>${esc(LINES[d - 1])}</p>`)
    for (const s of SHOTS.filter((x) => x[1] === d)) {
      if (s[6] != null && !seenStop.has(s[6])) {
        seenStop.add(s[6])
        const [name, lat, lng] = STOPS[s[6]]
        html.push(`<p>Then ${pin(name, lat, lng, ts(s))}.</p>`)
      }
      html.push(`<p><img src="${photoUrl(s[0])}" alt="${esc(s[5])}"></p>`)
    }
  }
  const created = '2026-06-22T20:15:00'
  return {
    id: TETON_ID, slug: TETON_SLUG, title: 'Seven days in the Tetons', short_title: 'The Tetons',
    summary: 'Seven days, thirteen stops, a boat across Jenny Lake and a moose at Oxbow Bend.',
    description: html.join(''),
    start_date: '2026-06-14T14:10:00', end_date: '2026-06-20T18:40:00',
    location_name: 'Grand Teton National Park, Wyoming', latitude: 43.751, longitude: -110.7228,
    cover_image_url: photoUrl(30), has_multiple_locations: true, privacy_level: 'followers',
    category: 'Vacation', category_2: null, custom_group_id: null,
    author_id: tom.id, author_username: tom.username, author_full_name: tom.full_name,
    view_count: 31, like_count: 0, comment_count: 0, is_published: true, share_enabled: false, share_expires_at: null,
    created_at: created, updated_at: created, content_blocks: [],
    locations: STOPS.map(([name, lat, lng], i) => {
      const first = SHOTS.find((s) => s[6] === i)
      return { id: TETON_ID * 10 + i, event_id: TETON_ID, location_name: name, latitude: lat, longitude: lng, location_type: 'inline_marker', timestamp: ts(first), order_index: i, section_id: null, section_title: null, additional_data: null, created_at: created, updated_at: created }
    }),
    event_images: SHOTS.map((s, i) => ({
      id: TETON_ID * 100 + i, event_id: TETON_ID, image_url: photoUrl(s[0]), caption: s[5], latitude: s[3], longitude: s[4], timestamp: ts(s),
      order_index: i, alt_text: s[5], width: 1600, height: 1200, file_size: null, created_at: created, updated_at: created,
    })),
  }
}

const comment = (users, id, who, content, created_at, opts = {}) => {
  const u = users[who]
  const rc = opts.reactions || {}
  return {
    id, event_id: TETON_ID, author_id: u.id, author_username: u.username, author_full_name: u.full_name, author_display_name: u.full_name,
    author_avatar_url: u.avatar_url, content, created_at, parent_id: opts.parent ?? null, depth: opts.depth ?? 0,
    reaction_count: Object.values(rc).reduce((a, b) => a + b, 0), reaction_counts: rc, user_reaction: null,
  }
}
export const TETON_COMMENTS = (users) => [
  comment(users, 11001, 'ruth', 'That moose. I have looked at it ten times.', '2026-06-22T21:02:00Z', { reactions: { love: 3 } }),
  comment(users, 11002, 'tom', 'Leo wants to go back for the waffles.', '2026-06-22T21:20:00Z', { parent: 11001, depth: 1, reactions: { laugh: 2 } }),
  comment(users, 11003, 'joe', 'The canoe photo is going on my fridge.', '2026-06-23T08:40:00Z', { reactions: { heart: 2 } }),
]
export const TETON_TAGGED = ['maya', 'ivy', 'leo']
