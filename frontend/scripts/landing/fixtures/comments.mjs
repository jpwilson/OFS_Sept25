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
  101: [
    c(101, 'ruth', 'That orange! I remember helping you choose it. I take no responsibility.', '2026-03-15T19:02:00Z', { id: 5101, reactions: { laugh: 3 } }),
    c(101, 'maya', 'You said it was "warm". It was warm like a traffic cone.', '2026-03-15T19:20:00Z', { parent: 5101, depth: 1, reactions: { laugh: 2 } }),
    c(101, 'priya', 'The tiles are perfect. Coming round for pancakes, no arguments.', '2026-03-16T08:11:00Z', { reactions: { heart: 2 } }),
    c(101, 'joe', 'Leo with the green nose is my new favourite photo.', '2026-03-16T12:40:00Z', { reactions: { love: 2 }, mine: 'love' }),
  ],
  102: [
    c(102, 'deb', 'Told you about mile twenty. Proud of you. Same time next year?', '2026-04-27T20:40:00Z', { id: 5201, reactions: { clap: 3 } }),
    c(102, 'tom', 'Absolutely not.', '2026-04-27T20:52:00Z', { id: 5202, parent: 5201, depth: 1, reactions: { laugh: 4 } }),
    c(102, 'sam', 'He means yes. Entries open in October.', '2026-04-27T21:03:00Z', { parent: 5202, depth: 2, reactions: { hundred: 2 } }),
    c(102, 'priya', 'The star sign is the best sign I have ever seen at a race.', '2026-04-28T07:15:00Z', { reactions: { heart: 3 } }),
  ],
  103: [
    c(103, 'ruth', 'I have read this three times. Biscuit in the sea! Your grandfather would never have believed it.', '2026-08-17T20:14:00Z', { id: 5301, reactions: { heart: 4 } }),
    c(103, 'maya', 'He has not stopped smelling of it either.', '2026-08-17T20:31:00Z', { parent: 5301, depth: 1, reactions: { laugh: 2 } }),
    c(103, 'kate', 'Zennor Head photo is going straight on my fridge. We should all do this next summer.', '2026-08-18T09:02:00Z', { reactions: { love: 2 } }),
    c(103, 'marcus', 'Ivy sent me the tin-mining report. It is genuinely better than anything I wrote at school.', '2026-08-18T18:47:00Z', { reactions: { laugh: 3 } }),
  ],
  104: [
    c(104, 'joe', 'Best birthday I have been to all year. The crown is on my mantelpiece.', '2026-10-18T10:30:00Z', { id: 5401, reactions: { heart: 3 } }),
    c(104, 'ruth', 'That cake! Nine already. Where did it go?', '2026-10-18T11:05:00Z', { reactions: { hug: 2 } }),
    c(104, 'maya', 'Mostly into swimming galas and cardboard boxes.', '2026-10-18T11:20:00Z', { parent: 5401, depth: 1 }),
  ],
  105: [
    c(105, 'marcus', 'I stand by every slide.', '2026-12-13T21:30:00Z', { id: 5501, reactions: { laugh: 4 } }),
    c(105, 'joe', 'The moustache was a phase. Thank you all. Best day.', '2026-12-13T22:10:00Z', { parent: 5501, depth: 1, reactions: { heart: 5 } }),
    c(105, 'kate', 'Finn has asked if Grandpa Joe can teach him to dance.', '2026-12-14T09:00:00Z', { reactions: { love: 2 } }),
  ],
  106: [
    c(106, 'maya', 'Bring the sun back with you please, Dad.', '2026-03-24T13:00:00Z', { id: 5601 }),
    c(106, 'joe', 'Packed in the suitcase.', '2026-03-24T14:15:00Z', { parent: 5601, depth: 1, reactions: { laugh: 2 } }),
    c(106, 'ruth', 'Seeds please!', '2026-03-24T18:00:00Z'),
  ],
  107: [
    c(107, 'tom', 'Snow in June. Well done both of you.', '2026-06-21T20:10:00Z', { id: 5701 }),
    c(107, 'finn', 'She talked the whole way.', '2026-06-21T20:31:00Z', { parent: 5701, depth: 1, reactions: { laugh: 4 } }),
    c(107, 'maya', 'Ivy wants to come next time.', '2026-06-22T08:00:00Z'),
  ],
  108: [
    c(108, 'ivy', 'Where is my keyring', '2026-05-20T16:00:00Z', { id: 5801, reactions: { laugh: 3 } }),
    c(108, 'marcus', 'In my bag. Christmas. Patience.', '2026-05-20T16:40:00Z', { parent: 5801, depth: 1 }),
    c(108, 'sam', 'Send me the dumpling stall address.', '2026-05-21T09:00:00Z'),
  ],
  109: [
    c(109, 'maya', 'Postcards arrived today. Leo has put his on the fridge upside down.', '2026-09-19T17:00:00Z', { id: 5901, reactions: { heart: 2 } }),
    c(109, 'ruth', 'It is a picture of a puffin. Either way up is fine.', '2026-09-19T18:00:00Z', { parent: 5901, depth: 1, reactions: { laugh: 2 } }),
    c(109, 'joe', 'Lovely. Say hello to Margaret.', '2026-09-20T09:00:00Z'),
  ],
};

const LIKERS = {
  101: ['ruth', 'joe', 'priya', 'kate', 'marcus', 'tom', 'deb'],
  102: ['maya', 'sam', 'deb', 'priya', 'ruth'],
  103: ['ruth', 'kate', 'joe', 'marcus', 'priya', 'sam', 'tom', 'finn', 'deb'],
  104: ['joe', 'ruth', 'kate', 'marcus', 'tom'],
  105: ['joe', 'maya', 'ruth', 'kate', 'marcus', 'finn'],
  106: ['maya', 'ruth', 'tom', 'marcus'],
  107: ['maya', 'tom', 'ruth', 'finn'],
  108: ['maya', 'ivy', 'leo', 'sam'],
  109: ['maya', 'joe', 'kate'],
};
export function likesFor(eventId, viewer = 'maya') {
  const keys = LIKERS[eventId] || [];
  const list = keys.map((k, i) => ({ id: 7000 + eventId * 10 + i, user_id: USERS[k].id, username: USERS[k].username, full_name: USERS[k].full_name, avatar_url: USERS[k].avatar_url, created_at: '2026-08-18T10:00:00Z' }));
  return { like_count: list.length, is_liked: keys.includes(viewer), recent_likes: list.slice(0, 3), all: list };
}

// Per-photo reactions, keyed by the photo's art id.
export const PHOTO_REACTIONS = {
  'photo-coast-beach': { heart: 4, laugh: 3, love: 2 },
  'photo-coast-harbour': { laugh: 5 },
  'photo-coast-mine': { wow: 3, heart: 1 },
  cover: { love: 4, wow: 2 },
  'photo-race-kids': { heart: 6, hug: 2 },
  'photo-race-mile20': { sad: 2, clap: 5 },
  'photo-race-hug': { heart: 5, love: 3 },
  video: { clap: 6, fire: 2 },
  'photo-kitchen-paint': { laugh: 4, heart: 2 },
};

// Tags: [userKey | 'biscuit']
export const TAGS = {
  101: ['tom', 'ivy', 'leo'],
  102: ['sam', 'ivy', 'leo', 'ruth'],
  103: ['tom', 'ivy', 'leo', 'biscuit'],
  104: ['ivy', 'joe', 'leo'],
  105: ['joe', 'ruth', 'marcus'],
  106: [], 107: ['finn'], 108: [], 109: [],
};
export function tagsFor(eventId, taggedById) {
  return (TAGS[eventId] || []).map((k, i) => {
    const base = { id: 8000 + eventId * 10 + i, event_id: eventId, tagged_by_id: taggedById, status: 'accepted', created_at: '2026-08-17T19:30:00Z' };
    if (k === 'biscuit') return { ...base, tag_profile_id: BISCUIT.id, tag_profile_name: BISCUIT.name, tag_profile_photo_url: BISCUIT.photo_url, tag_profile_relationship: 'pet', tag_profile_created_by_username: 'maya' };
    const u = USERS[k];
    return { ...base, tagged_user_id: u.id, tagged_user_username: u.username, tagged_user_display_name: u.full_name, tagged_user_avatar_url: u.avatar_url };
  });
}
