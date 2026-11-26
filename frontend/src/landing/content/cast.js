// The sample family (owner: F0). All invented. Counts are derived here, never typed.
// art: the manifest id prefix for this person's cut-outs (ids are p-<name>-<pose>, e.g. p-maya-wave).

/** @typedef {{ id: string, name: string, short: string, age: number|null, role: string, group: 'household'|'grandparent'|'relative'|'friend', relation: string, art: string }} Person */

/** @type {Person[]} */
export const CAST = [
  { id: 'maya', name: 'Maya', short: 'Maya', age: 38, role: 'the mum, and the author', group: 'household', relation: 'Mum', art: 'p-maya' },
  { id: 'tom', name: 'Tom', short: 'Tom', age: 40, role: 'dad', group: 'household', relation: 'Dad', art: 'p-tom' },
  { id: 'ivy', name: 'Ivy', short: 'Ivy', age: 9, role: 'daughter', group: 'household', relation: 'Daughter', art: 'p-ivy' },
  { id: 'leo', name: 'Leo', short: 'Leo', age: 5, role: 'son', group: 'household', relation: 'Son', art: 'p-leo' },
  { id: 'biscuit', name: 'Biscuit', short: 'Biscuit', age: null, role: 'the terrier', group: 'household', relation: 'Dog', art: 'p-biscuit' },
  { id: 'ruth', name: 'Nana Ruth', short: 'Ruth', age: 68, role: "Tom's mother", group: 'grandparent', relation: 'Grandmother', art: 'p-ruth' },
  { id: 'joe', name: 'Grandpa Joe', short: 'Joe', age: 71, role: "Maya's father", group: 'grandparent', relation: 'Grandfather', art: 'p-joe' },
  { id: 'kate', name: 'Aunt Kate', short: 'Kate', age: 43, role: "Tom's sister", group: 'relative', relation: 'Aunt', art: 'p-kate' },
  { id: 'marcus', name: 'Uncle Marcus', short: 'Marcus', age: 35, role: "Maya's brother", group: 'relative', relation: 'Uncle', art: 'p-marcus' },
  { id: 'finn', name: 'Finn', short: 'Finn', age: 14, role: "Kate's son", group: 'relative', relation: 'Cousin', art: 'p-finn' },
  { id: 'priya', name: 'Priya', short: 'Priya', age: 37, role: 'friend', group: 'friend', relation: 'Friend', art: 'p-priya' },
  { id: 'sam', name: 'Sam', short: 'Sam', age: 41, role: 'friend', group: 'friend', relation: 'Friend', art: 'p-sam' },
  { id: 'deb', name: 'Deb', short: 'Deb', age: 56, role: 'friend', group: 'friend', relation: 'Friend', art: 'p-deb' },
]

const byId = Object.fromEntries(CAST.map((p) => [p.id, p]))

/** One person by id. Throws on an unknown id. */
export function person(id) {
  const p = byId[id]
  if (!p) throw new Error(`cast: unknown person "${id}"`)
  return p
}

export const AUTHOR = 'maya'
export const HOUSEHOLD = CAST.filter((p) => p.group === 'household').map((p) => p.id)

/** Maya's followers: the eight people outside the household. */
export const FOLLOWERS = CAST.filter((p) => p.group !== 'household').map((p) => p.id)

/** The Close Family tick, set per follower. */
export const CLOSE_FAMILY = ['ruth', 'joe', 'kate', 'marcus']

/** Maya's Custom Group. */
export const RUN_CLUB = { name: 'Run club', members: ['sam', 'priya', 'deb'] }

/**
 * Who can open a story of each audience, besides Maya herself, in the sample.
 * Public also opens for anyone with the link; 'anyone' marks that.
 */
export const AUDIENCE_OPENERS = {
  Private: [],
  'Custom Group': RUN_CLUB.members,
  'Close Family': CLOSE_FAMILY,
  Followers: FOLLOWERS,
  Public: [...FOLLOWERS, 'anyone'],
}

/** Derived counts, as strings ready to print. */
export const COUNTS = {
  cast: String(CAST.length),
  household: String(HOUSEHOLD.length),
  followers: String(FOLLOWERS.length),
  closeFamily: String(CLOSE_FAMILY.length),
  runClub: String(RUN_CLUB.members.length),
}

/** The five sample stories, in the order of the year. */
export const STORIES = [
  { id: 'kitchen', title: 'Six weeks without a kitchen', month: 'February', category: 'Projects', audience: 'Followers' },
  { id: 'marathon', title: "Dad's first marathon", month: 'April', category: 'Milestones', audience: 'Custom Group', group: RUN_CLUB.name },
  { id: 'coast', title: 'A week on the coast path', month: 'August', category: 'Vacations', audience: 'Followers' },
  { id: 'ivy', title: 'Ivy turns nine', month: 'October', category: 'Birthdays', audience: 'Close Family' },
  { id: 'joe', title: 'Grandpa Joe at seventy', month: 'December', category: 'Family Gatherings', audience: 'Followers' },
]
