// Comments, likes, per-photo reactions and tags for the sample stories.
// "now" in the capture browser is fixed (see capture-ui.mjs), so dates read naturally.
import { USERS, BISCUIT } from './cast.mjs';

let cid = 5000;
const c = (event_id, who, content, created_at, opts = {}) => {
  const u = USERS[who];
  const reaction_counts = opts.reactions || {};
  return {
    id: opts.id ?? ++cid, event_id, author_id: u.id, author_username: u.username, author_full_name: u.full_name,
    author_display_name: u.full_name, author_avatar_url: u.avatar_url, content, created_at,
    parent_id: opts.parent ?? null, depth: opts.depth ?? 0,
    reaction_count: Object.values(reaction_counts).reduce((a, b) => a + b, 0), reaction_counts, user_reaction: opts.mine ?? null,
  };
};

export const COMMENTS = {
  103: [
    c(103, 'ruth', 'I have read this three times. Biscuit in the ocean! Your grandfather would never have believed it.', '2026-08-17T20:14:00Z', { id: 5301, reactions: { heart: 4 } }),
    c(103, 'maya', 'He has not stopped smelling of it either.', '2026-08-17T20:31:00Z', { parent: 5301, depth: 1, reactions: { laugh: 2 } }),
    c(103, 'kate', 'The Cadillac photo is going straight on my fridge. We should all do this next summer.', '2026-08-18T09:02:00Z', { reactions: { love: 2 } }),
    c(103, 'joe', 'Popovers with jam. You have ruined every other breakfast for me.', '2026-08-18T18:47:00Z', { reactions: { laugh: 3 } }),
  ],
  110: [
    c(110, 'ruth', 'I followed along on the map, day by day, with my coffee. The moose! I feel like I was there.', '2026-06-22T21:02:00Z', { id: 5101, reactions: { heart: 5 } }),
    c(110, 'tom', 'You would have loved the chapel, Mom. Next time you come with us.', '2026-06-22T21:20:00Z', { id: 5102, parent: 5101, depth: 1, reactions: { love: 2 } }),
    c(110, 'ruth', 'I will hold you to that. I am not jumping in String Lake.', '2026-06-22T21:41:00Z', { parent: 5102, depth: 2, reactions: { laugh: 4 } }),
    c(110, 'marcus', 'Photo 6, the reflection. That is a print-and-frame photo. Who took it?', '2026-06-23T08:15:00Z', { id: 5103, reactions: { wow: 3 } }),
    c(110, 'maya', 'Ivy did. On my phone. She is unbearable about it now.', '2026-06-23T08:40:00Z', { parent: 5103, depth: 1, reactions: { laugh: 3 } }),
    c(110, 'joe', 'Leo, that fish was enormous. I believe you.', '2026-06-23T12:00:00Z', { reactions: { hug: 2 } }),
  ],
  111: [
    c(111, 'joe', 'Minus four to eighty-two. I would have taken my coat off in the parking lot too.', '2026-03-29T19:00:00Z', { id: 5501, reactions: { laugh: 3 } }),
    c(111, 'maya', 'Leo took his shoes off in the airport. We did not stop him.', '2026-03-29T19:20:00Z', { parent: 5501, depth: 1, reactions: { laugh: 2 } }),
    c(111, 'priya', 'That sunrise. Adding it to the list.', '2026-03-30T08:00:00Z', { reactions: { love: 2 } }),
  ],
  112: [
    c(112, 'kate', 'I have watched the speech video eleven times. I did NOT drive into that mailbox.', '2026-05-18T22:00:00Z', { id: 5601, reactions: { laugh: 6 } }),
    c(112, 'tom', 'The mailbox remembers.', '2026-05-18T22:08:00Z', { id: 5602, parent: 5601, depth: 1, reactions: { laugh: 5 } }),
    c(112, 'marcus', 'For the record, I was told about the mailbox on our second date.', '2026-05-18T22:30:00Z', { parent: 5602, depth: 2, reactions: { laugh: 4 } }),
    c(112, 'ruth', 'The arch held up. That is all I wanted. What a day. Thank you, Maya, for writing it all down.', '2026-05-19T09:10:00Z', { reactions: { heart: 5 } }),
    c(112, 'joe', 'Ivy is the best dance partner I have ever had. Do not tell your grandmother.', '2026-05-19T11:30:00Z', { reactions: { hug: 3 } }),
  ],
  101: [
    c(101, 'ruth', 'That orange! I remember helping you choose it. I take no responsibility.', '2026-03-15T19:02:00Z', { id: 5711, reactions: { laugh: 3 } }),
    c(101, 'maya', 'You said it was "warm". It was warm like a traffic cone.', '2026-03-15T19:20:00Z', { parent: 5711, depth: 1, reactions: { laugh: 2 } }),
    c(101, 'priya', 'The tile is perfect. Coming over for pancakes, no arguments.', '2026-03-16T08:11:00Z', { reactions: { heart: 2 } }),
    c(101, 'joe', 'Leo with the green nose is my new favorite photo.', '2026-03-16T12:40:00Z', { reactions: { love: 2 } }),
  ],
  102: [
    c(102, 'deb', 'Told you about mile twenty. Proud of you. Same time next year?', '2026-10-12T20:40:00Z', { id: 5201, reactions: { clap: 3 } }),
    c(102, 'tom', 'Absolutely not.', '2026-10-12T20:52:00Z', { id: 5202, parent: 5201, depth: 1, reactions: { laugh: 4 } }),
    c(102, 'sam', 'He means yes. Registration opens in November.', '2026-10-12T21:03:00Z', { parent: 5202, depth: 2, reactions: { hundred: 2 } }),
    c(102, 'priya', 'The star sign is the best sign I have ever seen at a race.', '2026-10-13T07:15:00Z', { reactions: { heart: 3 } }),
  ],
  104: [
    c(104, 'joe', 'Best birthday I have been to all year. The crown is on my mantel.', '2026-11-15T10:30:00Z', { id: 5401, reactions: { heart: 3 } }),
    c(104, 'ruth', 'That cake! Nine already. Where did it go?', '2026-11-15T11:05:00Z', { reactions: { hug: 2 } }),
    c(104, 'maya', 'Mostly into swim meets and cardboard boxes.', '2026-11-15T11:20:00Z', { parent: 5401, depth: 1 }),
  ],
  105: [
    c(105, 'marcus', 'I stand by every slide.', '2026-12-13T21:30:00Z', { id: 5501, reactions: { laugh: 4 } }),
    c(105, 'joe', 'The mustache was a phase. Thank you all. Best day.', '2026-12-13T22:10:00Z', { parent: 5501, depth: 1, reactions: { heart: 5 } }),
    c(105, 'kate', 'Finn has asked if Grandpa Joe can teach him to dance.', '2026-12-14T09:00:00Z', { reactions: { love: 2 } }),
  ],
  106: [
    c(106, 'maya', 'Did you find the street, Dad?', '2026-04-21T13:00:00Z', { id: 5801 }),
    c(106, 'joe', 'Found the street, found the church, found a very good pub on the corner.', '2026-04-21T14:15:00Z', { parent: 5801, depth: 1, reactions: { laugh: 3 } }),
    c(106, 'ivy', 'How itchy is the sweater', '2026-04-21T18:00:00Z', { reactions: { laugh: 2 } }),
  ],
  107: [
    c(107, 'maya', 'Four hundred photos of pasta. Worth it.', '2026-06-01T20:10:00Z', { id: 5901 }),
    c(107, 'kate', 'He photographed every lemon in Italy.', '2026-06-01T20:31:00Z', { parent: 5901, depth: 1, reactions: { laugh: 4 } }),
    c(107, 'ruth', 'Beautiful. Welcome home, both of you.', '2026-06-02T08:00:00Z', { reactions: { heart: 3 } }),
  ],
  109: [
    c(109, 'maya', 'Postcards arrived today. Leo has put his on the fridge upside down.', '2026-07-24T17:00:00Z', { id: 6001, reactions: { heart: 2 } }),
    c(109, 'ruth', 'It is a picture of a whale. Either way up is fine.', '2026-07-24T18:00:00Z', { parent: 6001, depth: 1, reactions: { laugh: 2 } }),
    c(109, 'joe', 'Lovely. Say hello to Margaret.', '2026-07-25T09:00:00Z'),
  ],
};

const LIKERS = {
  103: ['ruth', 'kate', 'joe', 'marcus', 'priya', 'sam', 'tom', 'finn', 'deb'],
  110: ['ruth', 'joe', 'kate', 'marcus', 'maya', 'finn', 'priya', 'sam', 'deb'],
  111: ['joe', 'ruth', 'priya', 'tom', 'kate'],
  112: ['ruth', 'joe', 'kate', 'marcus', 'tom', 'finn', 'priya', 'sam', 'deb'],
  101: ['ruth', 'joe', 'priya', 'kate', 'marcus', 'tom', 'deb'],
  102: ['maya', 'sam', 'deb', 'priya', 'ruth'],
  104: ['joe', 'ruth', 'kate', 'marcus', 'tom'],
  105: ['joe', 'maya', 'ruth', 'kate', 'marcus', 'finn'],
  106: ['maya', 'ruth', 'tom', 'marcus'],
  107: ['maya', 'tom', 'ruth', 'finn', 'joe'],
  109: ['maya', 'joe', 'kate'],
};
export function likesFor(eventId, viewer = 'maya') {
  const keys = LIKERS[eventId] || [];
  const list = keys.map((k, i) => ({ id: 7000 + eventId * 10 + i, user_id: USERS[k].id, username: USERS[k].username, full_name: USERS[k].full_name, avatar_url: USERS[k].avatar_url, created_at: '2026-08-18T10:00:00Z' }));
  return { like_count: list.length, is_liked: keys.includes(viewer), recent_likes: list.slice(0, 3), all: list };
}

// Per-photo reactions, keyed by the photo's art id ('cover' is each story's cover).
export const PHOTO_REACTIONS = {
  'photo-coast-beach': { heart: 4, laugh: 3, love: 2 },
  'photo-coast-harbour': { laugh: 5 },
  'photo-coast-summit': { wow: 3, heart: 1 },
  cover: { love: 4, wow: 2 },
  'photo-race-kids': { heart: 6, hug: 2 },
  'photo-race-mile20': { sad: 2, clap: 5 },
  'photo-race-hug': { heart: 5, love: 3 },
  video: { clap: 6, fire: 2 },
  'photo-kitchen-paint': { laugh: 4, heart: 2 },
  'photo-tetons-06': { wow: 5, love: 3 },
  'photo-tetons-19': { wow: 6, heart: 2 },
  'photo-tetons-24': { laugh: 4, clap: 3 },
  'photo-tetons-27': { laugh: 5, fire: 1 },
  'photo-wedding-vows': { heart: 7, love: 4 },
  'photo-wedding-dance': { love: 6, hug: 3 },
  'photo-wedding-speech': { laugh: 6 },
};

// Tags: [userKey | 'biscuit']
export const TAGS = {
  103: ['tom', 'ivy', 'leo', 'biscuit'],
  110: ['tom', 'maya', 'ivy', 'leo'],
  111: ['tom', 'ivy', 'leo'],
  112: ['kate', 'marcus', 'ivy', 'finn', 'joe'],
  101: ['tom', 'ivy', 'leo'],
  102: ['sam', 'ivy', 'leo', 'ruth'],
  104: ['ivy', 'joe', 'leo'],
  105: ['joe', 'ruth', 'marcus'],
  106: [], 107: ['kate'], 109: [],
};
export function tagsFor(eventId, taggedById) {
  return (TAGS[eventId] || []).map((k, i) => {
    const base = { id: 8000 + eventId * 10 + i, event_id: eventId, tagged_by_id: taggedById, status: 'accepted', created_at: '2026-08-17T19:30:00Z' };
    if (k === 'biscuit') return { ...base, tag_profile_id: BISCUIT.id, tag_profile_name: BISCUIT.name, tag_profile_photo_url: BISCUIT.photo_url, tag_profile_relationship: 'pet', tag_profile_created_by_username: 'maya' };
    const u = USERS[k];
    return { ...base, tagged_user_id: u.id, tagged_user_username: u.username, tagged_user_display_name: u.full_name, tagged_user_avatar_url: u.avatar_url };
  });
}
