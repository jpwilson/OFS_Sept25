// Sample content for the film (owner: film). Everything here is invented for the sample
// family and is shown under a visible sample label. The facts check skips this file, so
// digits are allowed; nothing here is a product number.

/** Slates, top left of each chapter. */
export const SLATE = {
  tell: 'Sample story 01',
  read: 'Sample story 02',
  map: 'Sample story 03',
  year: 'Sample story 04',
}

export const SAMPLE_YEAR = '2026'

// ---- 01 TELL: "Six weeks without a kitchen" ------------------------------------------
export const KITCHEN = {
  place: 'Bristol, England',
  /** The voice note runs to this length (seconds) as the visitor scrolls. */
  voiceSeconds: 134,
  transcript: ['So', 'in', 'February', 'we', 'ripped', 'the', 'whole', 'kitchen', 'out', 'and', 'lived', 'on', 'pizza', 'and', 'a', 'camping', 'stove', 'for', 'six', 'weeks…'],
  /** The six prints, in the order they fan in. */
  prints: [
    { art: 'photo-kitchen-before', caption: 'The orange pine.' },
    { art: 'photo-kitchen-sledge', caption: 'Tom, far too happy.' },
    { art: 'photo-kitchen-camping', caption: 'Week three: pizza.' },
    { art: 'photo-kitchen-tiling', caption: 'The last row.' },
    { art: 'photo-kitchen-paint', caption: 'Sage green, mostly.' },
    { art: 'photo-kitchen-done', caption: 'First pancakes.' },
  ],
  /** Three sections of the assembled page; each takes one print (by index) into its text. */
  sections: [
    { heading: 'Before', text: 'The cabinets were older than we are, and the strip light hummed.', print: 0 },
    { heading: 'Living on a camping stove', text: 'Six weeks of pizza on the living-room floor. Nobody complained.', print: 2 },
    { heading: 'The first pancakes', text: 'Tom flipped one onto the new island. Biscuit got the second.', print: 5 },
  ],
  /** The other three go to the gallery at the foot of the page. */
  gallery: [1, 3, 4],
}

// ---- 02 READ: "Dad's first marathon" ---------------------------------------------------
export const RACE = {
  place: 'Greenwich, London',
  wall: [
    { art: 'photo-race-start', caption: 'The start.' },
    { art: 'photo-race-mile20', caption: 'Mile twenty.' },
    { art: 'photo-race-kids', caption: 'The cheer squad.' },
    { art: 'photo-race-finish', caption: 'The line.' },
    { art: 'photo-race-hug', caption: 'One long hug.' },
    { art: 'photo-race-chips', caption: 'Chips, medals on.' },
  ],
  video: { art: 'photo-race-video', caption: 'Final straight', length: '0:42' },
  reactions: [
    { icon: 'heart', count: '7' },
    { icon: 'smile', count: '4' },
    { icon: 'star', count: '3' },
  ],
  comments: [
    { who: 'sam', name: 'Sam', art: 'p-sam-wave', fx: 0.55, fy: 0.075, text: 'Mile twenty. I felt that one in my own legs.' },
    {
      who: 'deb',
      name: 'Deb',
      art: 'p-deb-wave',
      fx: 0.5,
      fy: 0.115,
      text: 'Told you the hills would pay off.',
      reply: { who: 'tom', name: 'Tom', art: 'p-tom-medal', fx: 0.5, fy: 0.06, text: 'Not how it felt at the time.' },
    },
  ],
}

// ---- 03 MAP: "A week on the coast path" ------------------------------------------------
export const COAST = {
  place: 'St Ives, Cornwall',
  /** The start flag and five numbered stops, with real coordinates on the Cornish coast path. */
  stops: [
    { n: 0, name: 'St Ives harbour', art: 'photo-coast-harbour', coord: '50.215° N  5.480° W' },
    { n: 1, name: 'Zennor Head', art: 'photo-coast-cliff', coord: '50.196° N  5.573° W' },
    { n: 2, name: 'Pendeen', art: 'photo-coast-van', coord: '50.165° N  5.671° W' },
    { n: 3, name: 'Botallack mine', art: 'photo-coast-mine', coord: '50.140° N  5.690° W' },
    { n: 4, name: 'Sennen Cove', art: 'photo-coast-beach', coord: '50.078° N  5.696° W' },
    { n: 5, name: 'Porthcurno', art: 'photo-coast-theatre', coord: '50.043° N  5.651° W' },
  ],
}

// ---- the world: relatives' own stories -------------------------------------------------
export const WORLD_PINS = [
  { who: 'joe', name: 'Grandpa Joe', art: 'p-joe-suitcase', photo: 'photo-trip-joe', place: 'Funchal, Madeira' },
  { who: 'kate', name: 'Aunt Kate', art: 'p-kate-pack', photo: 'photo-trip-kate', place: 'Ben Nevis' },
  { who: 'marcus', name: 'Uncle Marcus', art: 'p-marcus-camera', photo: 'photo-trip-marcus', place: 'Osaka' },
  { who: 'ruth', name: 'Nana Ruth', art: 'p-ruth-sunhat', photo: 'photo-trip-ruth', place: 'The ferry to Mull' },
]
/** Stories close enough to home to group into one bubble at this zoom. */
export const WORLD_CLUSTER = '7'

// ---- 04 YEAR ---------------------------------------------------------------------------
export const YEAR_CARDS = {
  Birthdays: { card: 'ui-card-year', title: 'Ivy turns nine', date: 'October 17' },
  Vacations: { card: 'ui-card-coast', title: 'A week on the coast path', date: 'August 8' },
  Projects: { card: 'ui-card-kitchen', title: 'Six weeks without a kitchen', date: 'February 1' },
  Milestones: { card: 'ui-card-race', title: "Dad's first marathon", date: 'April 26' },
}
