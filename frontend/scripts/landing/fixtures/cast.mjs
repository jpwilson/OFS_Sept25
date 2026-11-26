// The sample family from docs/landing/SPEC.md. All invented.
import { avatar } from './media.mjs';

const mk = (id, username, full_name, key, bio, extra = {}) => ({
  id, username, full_name, display_name: full_name, avatar_url: avatar(key), bio,
  email: `${username}@example.test`, is_active: true, created_at: '2025-11-02T09:00:00Z', ...extra,
});

export const USERS = {
  maya: mk(1, 'maya', 'Maya Hartley', 'maya', 'Mum of two, reluctant runner, keeper of the family stories.'),
  tom: mk(2, 'tom', 'Tom Hartley', 'tom', 'Dad. Ran one marathon and will mention it.'),
  ivy: mk(3, 'ivy', 'Ivy Hartley', 'ivy', 'Nine. Swimmer. Rocket engineer.'),
  leo: mk(4, 'leo', 'Leo Hartley', 'leo', 'Five and a half. Dinosaurs.'),
  ruth: mk(5, 'ruth', 'Ruth Hartley', 'ruth', 'Nana to Ivy, Leo and Finn. Ferries, gardens, crosswords.'),
  joe: mk(6, 'joe', 'Joe Bello', 'joe', 'Grandpa Joe. Seventy and still the best dancer at the party.'),
  kate: mk(7, 'kate', 'Kate Brennan', 'kate', 'Hills, tea, and Finn.'),
  marcus: mk(8, 'marcus', 'Marcus Bello', 'marcus', 'Uncle Marcus. Usually behind a camera.'),
  finn: mk(9, 'finn', 'Finn Brennan', 'finn', ''),
  priya: mk(10, 'priya', 'Priya Nair', 'priya', 'Run club. Slow on hills, fast on cake.'),
  sam: mk(11, 'sam', 'Sam Lin', 'sam', 'Run club. Pacer, cheerleader, chip enthusiast.'),
  deb: mk(12, 'deb', 'Deb Walsh', 'deb', 'Run club captain. Fifty-odd marathons and counting.'),
};

export const ME = USERS.maya;

// Maya's followers: the eight non-household people. Close Family: Ruth, Joe, Kate, Marcus.
export const FOLLOWER_KEYS = ['ruth', 'joe', 'kate', 'marcus', 'finn', 'priya', 'sam', 'deb'];
export const CLOSE_FAMILY = new Set(['ruth', 'joe', 'kate', 'marcus']);
// Maya follows her family and friends (household included).
export const FOLLOWING_KEYS = ['tom', 'ruth', 'joe', 'kate', 'marcus', 'finn', 'priya', 'sam', 'deb'];

export const RUN_CLUB = { id: 31, name: 'Run club', description: 'Saturday long runs and the people who drag me round them.', member_keys: ['sam', 'priya', 'deb'] };

// Tag profile for someone without an account.
export const BISCUIT = {
  id: 41, name: 'Biscuit', photo_url: avatar('biscuit'), relationship_to_creator: 'pet',
  created_by_id: 1, created_by_username: 'maya', created_by_display_name: 'Maya Hartley',
  is_claimed: false, claimed_by_user_id: null, bio: 'Terrier. Eats socks. Fears the sea.',
  created_at: '2026-01-10T10:00:00Z',
};
