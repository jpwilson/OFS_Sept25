// Story content for the film (owner: film). The family's stories, captions, coordinates and
// counts. The facts check skips this file, so digits are allowed; nothing here is a product number.

export const SAMPLE_YEAR = '2026'

/** The sample stories the film shows (source: docs/landing/ROUND2.md). */
export const STORY = {
  coast: { id: 'coast', title: 'A week on the Maine coast', month: 'August', category: 'Vacations', audience: 'Followers', place: 'Acadia, Maine' },
  tetons: { id: 'tetons', title: 'Seven days in the Tetons', month: 'June', category: 'Vacations', audience: 'Followers', place: 'Grand Teton, Wyoming' },
  maui: { id: 'maui', title: 'Spring break in Maui', month: 'March', category: 'Vacations', audience: 'Followers', place: "Ka'anapali, Maui" },
  wedding: { id: 'wedding', title: 'Kate and James get married', month: 'May', category: 'Wedding', audience: 'Followers', place: 'Hudson Valley, New York' },
  kitchen: { id: 'kitchen', title: 'Six weeks without a kitchen', month: 'February', category: 'Projects', audience: 'Followers', place: 'Madison, Wisconsin' },
  marathon: { id: 'marathon', title: "Dad's first marathon", month: 'October', category: 'Milestones', audience: 'Custom Group', group: 'Run club', place: 'Chicago, Illinois' },
  ivy: { id: 'ivy', title: 'Ivy turns nine', month: 'November', category: 'Birthdays', audience: 'Close Family', place: 'Madison, Wisconsin' },
  joe: { id: 'joe', title: 'Grandpa Joe at seventy', month: 'December', category: 'Family Gatherings', audience: 'Followers', place: 'Madison, Wisconsin' },
}

const deg = (lat, lon) => `${Math.abs(lat).toFixed(3)}° ${lat >= 0 ? 'N' : 'S'}  ${Math.abs(lon).toFixed(3)}° ${lon >= 0 ? 'E' : 'W'}`

// ---- 01 COAST: "A week on the Maine coast" ------------------------------------------------
export const COAST = {
  /** The start flag and five numbered stops, with real coordinates. */
  stops: [
    { n: 0, name: 'Portland Head Light', art: 'photo-coast-cliff', coord: deg(43.6231, -70.2079) },
    { n: 1, name: 'Camden harbor', art: 'photo-coast-harbour', coord: deg(44.2098, -69.0648) },
    { n: 2, name: 'Bar Harbor', art: 'photo-coast-van', coord: deg(44.3876, -68.2039) },
    { n: 3, name: 'Cadillac Mountain', art: 'photo-coast-summit', coord: deg(44.3527, -68.2251) },
    { n: 4, name: 'Jordan Pond', art: 'photo-coast-pond', coord: deg(44.32, -68.254) },
    { n: 5, name: 'Bass Harbor Head', art: 'photo-coast-beach', coord: deg(44.222, -68.3373) },
  ],
}

// ---- 02 TETONS: "Seven days in the Tetons" ------------------------------------------------
/** The copy that carries this story's sample numbers. */
export const TETONS_COPY = {
  body: 'Seven days, thirteen stops, one map you can follow day by day. Tap a stop and you are back at the lake.',
  tripLabel: 'This trip',
  days: '7',
  daysUnit: 'days',
  tripNote: '13 stops · 30 photos',
}
export const TETONS = {
  /** Thirteen stops, in order. */
  stops: [
    'Jackson Town Square',
    'Mormon Row',
    'Schwabacher Landing',
    'Jenny Lake',
    'Hidden Falls',
    'Inspiration Point',
    'Taggart Lake',
    'Snake River float',
    'Oxbow Bend',
    'Signal Mountain',
    'Colter Bay',
    'String Lake',
    'Teton Village tram',
  ],
  /** Seven days: where the family was, and the two prints the film shows for it. */
  days: [
    { place: 'Jackson', prints: [{ art: 'photo-tetons-01', caption: 'The antler arch.' }, { art: 'photo-tetons-03', caption: 'Milkshakes, day one.' }] },
    { place: 'Mormon Row', prints: [{ art: 'photo-tetons-04', caption: 'Sunrise at the barn.' }, { art: 'photo-tetons-06', caption: 'The beaver pond.' }] },
    { place: 'Jenny Lake', prints: [{ art: 'photo-tetons-08', caption: 'The boat across.' }, { art: 'photo-tetons-10', caption: 'Inspiration Point.' }] },
    { place: 'Taggart Lake', prints: [{ art: 'photo-tetons-12', caption: 'Through the aspens.' }, { art: 'photo-tetons-13', caption: 'Taggart Lake.' }] },
    { place: 'Snake River', prints: [{ art: 'photo-tetons-16', caption: 'The float.' }, { art: 'photo-tetons-19', caption: 'A moose at Oxbow Bend.' }] },
    { place: 'Colter Bay', prints: [{ art: 'photo-tetons-23', caption: 'The red canoe.' }, { art: 'photo-tetons-25', caption: "S'mores at the cabin." }] },
    { place: 'String Lake', prints: [{ art: 'photo-tetons-27', caption: 'Tom goes in.' }, { art: 'photo-tetons-30', caption: 'The last overlook.' }] },
  ],
}

// ---- 03 THE WORLD ---------------------------------------------------------------------------
/** The family's own trips, as pins with a print. count: stories that group at this zoom (Maine and the wedding in New York). */
export const WORLD_TRIPS = [
  { id: 'tetons', photo: 'photo-tetons-30', place: 'The Tetons' },
  { id: 'coast', photo: 'photo-coast-cliff', place: 'Maine', count: '2' },
  { id: 'maui', photo: 'photo-maui-beach', place: 'Maui' },
]
/** The relatives' own stories. */
export const WORLD_CARDS = [
  { who: 'ruth', name: 'Nana Ruth', art: 'p-ruth-sunhat', photo: 'photo-trip-ruth', place: 'Juneau, Alaska' },
  { who: 'joe', name: 'Grandpa Joe', art: 'p-joe-suitcase', photo: 'photo-trip-joe', place: 'Galway, Ireland' },
  { who: 'kate', name: 'Kate and James', art: 'p-kate-pack', photo: 'photo-trip-kate', place: 'Amalfi coast' },
]
/** Stories close enough to home to group into one bubble at this zoom. */
export const WORLD_CLUSTER = '4'

// ---- 04 WEDDING: "Kate and James get married" ---------------------------------------------
export const WEDDING = {
  wall: [
    { art: 'photo-wedding-ready', caption: 'Getting ready.' },
    { art: 'photo-wedding-aisle', caption: 'Ivy, on petals.' },
    { art: 'photo-wedding-vows', caption: 'The vows.' },
    { art: 'photo-wedding-confetti', caption: 'Married.' },
    { art: 'photo-wedding-family', caption: 'All of us.' },
    { art: 'photo-wedding-dance', caption: 'On his shoes.' },
  ],
  video: { art: 'photo-wedding-speech', caption: "Tom's speech", length: '0:58' },
  reactions: [
    { icon: 'heart', count: '9' },
    { icon: 'smile', count: '6' },
    { icon: 'star', count: '4' },
  ],
  comments: [
    { who: 'deb', name: 'Deb', art: 'p-deb-wave', fx: 0.5, fy: 0.115, text: 'That flower girl stole the whole day.' },
    {
      who: 'ruth',
      name: 'Nana Ruth',
      art: 'p-ruth-wave',
      fx: 0.5,
      fy: 0.085,
      text: 'I cried at the vows, and again at the speech.',
      reply: { who: 'kate', name: 'Kate', art: 'p-kate-wave', fx: 0.47, fy: 0.085, text: 'So did I, and I knew what he would say.' },
    },
  ],
}

// ---- 05 KITCHEN: "Six weeks without a kitchen" ---------------------------------------------
export const KITCHEN = {
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

// ---- 06 MARATHON: "Dad's first marathon" ---------------------------------------------------
export const RACE = {
  prints: [
    { art: 'photo-race-finish', caption: 'The line.' },
    { art: 'photo-race-hug', caption: 'One long hug.' },
  ],
  video: { art: 'photo-race-video', caption: 'Last mile', length: '0:42' },
  /** Faces for the audience card, cropped from cut-outs already on the page. */
  faces: {
    sam: { art: 'p-sam-wave', fx: 0.55, fy: 0.075 },
    priya: { art: 'p-priya-wave', fx: 0.5, fy: 0.085 },
    deb: { art: 'p-deb-wave', fx: 0.5, fy: 0.115 },
  },
}

// ---- 07 THROUGH THE YEARS -------------------------------------------------------------------
/**
 * The same two children at five ages (illustrations of the sample family, labelled by age and
 * never by calendar year). Each stage has that year's two photographs; `fallback` is an image
 * that already exists, shown until the stage's own photograph lands in the manifest.
 */
export const YEARS_NOTE = 'At five ages'
export const YEARS = [
  {
    ivy: '8',
    leo: '5',
    photos: [
      { art: 'photo-year-birthday', title: 'Ivy turns nine', category: 'Birthdays' },
      { art: 'photo-year-school', title: 'First day of school', category: 'Milestones' },
    ],
  },
  {
    ivy: '10',
    leo: '7',
    photos: [
      { art: 'photo-years-2a', fallback: 'photo-year-gala', title: "Ivy's science fair", category: 'Milestones' },
      { art: 'photo-years-2b', fallback: 'photo-year-rocket', title: 'Leo rides without training wheels', category: 'Daily Life' },
    ],
  },
  {
    ivy: '13',
    leo: '10',
    photos: [
      { art: 'photo-years-3a', fallback: 'photo-year-halloween', title: "Ivy's first band concert", category: 'Milestones' },
      { art: 'photo-years-3b', fallback: 'photo-year-joe70', title: "Leo's team wins the league", category: 'Milestones' },
    ],
  },
  {
    ivy: '15',
    leo: '12',
    photos: [
      { art: 'photo-years-4a', fallback: 'photo-year-gala', title: "Ivy gets her learner's permit", category: 'Milestones' },
      { art: 'photo-years-4b', fallback: 'photo-year-rocket', title: 'Leo and Grandpa Joe go fishing', category: 'Daily Life' },
    ],
  },
  {
    ivy: '20',
    leo: '17',
    photos: [
      { art: 'photo-years-5a', fallback: 'photo-year-joe70', title: 'Ivy, home from college for Thanksgiving', category: 'Holidays' },
      { art: 'photo-years-5b', fallback: 'photo-year-school', title: 'Leo graduates high school', category: 'Milestones' },
    ],
  },
]
/** "Ivy at 8 · Leo at 5" */
export const ageLabel = (y) => `Ivy at ${y.ivy} · Leo at ${y.leo}`
