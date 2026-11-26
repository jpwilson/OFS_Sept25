// Who is on the stage and where they stand at each scene's HOLD (owner: film).
// Two layouts: d (landscape) and m (portrait; CSS picks it with max-aspect-ratio: 9/10).
// These numbers are written to the DOM as CSS variables at render, so CSS alone draws every
// scene as a finished poster. The engine only ever adds offsets that end at zero.
//
// Units: u, the stage unit. 100u = min(100svh, 62.5vw) on desktop and 100svh on a phone.
//   x     u from the centre line
//   lift  u above the floor line (people further back stand a little higher)
//   s     scale; 1 = the cut-out's height in H below, in ADULT HEIGHTS, times the scene's A
//   y     for things in the air: u above the floor line, measured to their centre
//   w     for things in the air: width in u
//   r     degrees
// A scene's A is one adult's height in u; change it and the whole scene rescales.

/**
 * Image height of each cut-out in adult heights (Tom = 1). The art is normalised to one
 * pixel height whatever the person's size, and raised arms count as "head", so these were
 * set by eye from the detail sheets (landing-art/sheets/detail-*.jpg).
 */
export const H = {
  'g-family-hero': 1.04,
  'g-family-hike': 1.25,
  'g-kids-beach': 0.78,
  'g-kids-rocket': 0.84,
  'g-kids-biscuit': 0.56,
  'p-biscuit': 0.32,
  'p-maya-phone': 0.97,
  'p-maya-talk': 0.97,
  'p-maya-tada': 0.97,
  'p-maya-cheer': 1.06,
  'p-tom-medal': 1.04,
  'p-ivy-cake': 0.78,
  'p-ivy-cheer': 0.95,
  'p-ivy-trophy': 0.78,
  'p-leo-horn': 0.68,
  'p-leo-cheer': 0.68,
  'p-leo-school': 0.63,
  'p-ruth-wave': 0.92,
  'p-ruth-dish': 0.92,
  'p-ruth-gift': 0.92,
  'p-ruth-tablet': 0.92,
  'p-ruth-sunhat': 0.96,
  'p-joe-wave': 1.03,
  'p-joe-crown': 1.04,
  'p-joe-phone': 1.0,
  'p-joe-suitcase': 1.03,
  'p-kate-wave': 0.97,
  'p-kate-pack': 0.98,
  'p-marcus-wave': 1.04,
  'p-marcus-camera': 1.02,
  'p-finn-nod': 0.95,
  'p-priya-wave': 0.94,
  'p-sam-wave': 1.02,
  'p-sam-medal': 1.07,
  'p-deb-wave': 1.03,
  'r-kitchen': 1.0,
  'o-finish-arch': 1.36,
  'o-barrier': 0.6,
  'o-campervan': 1.0,
  'o-lighthouse': 1.1,
  'o-waymarker': 0.86,
  'prop-swatches': 0.26,
  'prop-paint-pots': 0.26,
  'prop-present': 0.26,
  'prop-school-bag': 0.3,
  'prop-bucket-spade': 0.26,
  'prop-pumpkin': 0.26,
  'prop-suitcase': 0.3,
  'prop-trophy': 0.3,
  'prop-flask': 0.24,
  'prop-shoe': 0.14,
  'prop-cowbell': 0.2,
}

/** Per scene: one adult's height (u) and the floor line (% of the stage height). */
export const STAGE = {
  hero: { d: { A: 51, floor: 86, hz: 13.4 }, m: { A: 30, floor: 71 } },
  tell: { d: { A: 58, floor: 86 }, m: { A: 43, floor: 75 } },
  read: { d: { A: 56, floor: 86 }, m: { A: 43, floor: 75 } },
  map: { d: { A: 46.4, floor: 82, hz: 17.5 }, m: { A: 31, floor: 72.4, hz: 12 } },
  world: { d: { A: 46.4, floor: 82, hz: 17.5 }, m: { A: 31, floor: 72.4, hz: 12 } },
  year: { d: { A: 70, floor: 86 }, m: { A: 43, floor: 75 } },
  ours: { d: { A: 52, floor: 85, hz: 13.4 }, m: { A: 27, floor: 71, hz: 9 } },
  app: { d: { A: 48, floor: 86 }, m: { A: 34, floor: 76 } },
  end: { d: { A: 44, floor: 86 }, m: { A: 36, floor: 78 } },
}

// ---------------------------------------------------------------------------------------
// HERO: the family, the eight people who follow Maya, and three strangers for Public.
// `g` lists the switch settings a person stands for (the switch's input values).
// ---------------------------------------------------------------------------------------
export const HERO = {
  family: { art: 'g-family-hero', d: { x: -1.5, s: 1 }, m: null, z: 6, sh: 0.9 },
  // on a phone Maya stands alone, mirrored so the phone she holds is beside the card
  maya: { art: 'p-maya-phone', d: null, m: { x: 0.5, s: 1.08 }, z: 6, sh: 0.8, flip: true },
  biscuit: { art: 'p-biscuit', d: null, m: { x: -5.6, lift: -1.2, s: 0.9 }, z: 7, sh: 0.9 },
  // g: the settings a person stands for on desktop; gm: on a phone, where two people may share a slot.
  // Two depths: a back row at about 0.75, lifted, and a front row beside the household.
  crowd: {
    ruth: { art: 'p-ruth-wave', g: 'close followers public', d: { x: -28.2, lift: 5.6, s: 0.86 }, m: { x: -10.4, lift: 0.4, s: 0.98 }, z: 4 },
    joe: { art: 'p-joe-wave', g: 'close followers public', d: { x: -41, lift: 9.6, s: 0.75 }, m: { x: -18, lift: 2.4, s: 0.86 }, z: 3 },
    sam: { art: 'p-sam-wave', g: 'custom followers public', d: { x: -52.5, lift: 9.6, s: 0.74 }, m: { x: -4.6, lift: 4.2, s: 0.8 }, z: 2, flip: true },
    finn: { art: 'p-finn-nod', g: 'followers public', d: { x: -64, lift: 9.6, s: 0.78 }, m: null, z: 3 },
    kate: { art: 'p-kate-wave', g: 'close followers public', d: { x: 41, lift: 1.4, s: 0.92 }, m: { x: 11.4, lift: 1, s: 0.68 }, z: 5, flip: true },
    marcus: { art: 'p-marcus-wave', g: 'close followers public', d: { x: 50, lift: 6, s: 0.8 }, m: { x: 18.6, lift: 2.8, s: 0.64 }, z: 3, flip: true },
    priya: { art: 'p-priya-wave', g: 'custom followers public', gm: 'custom', d: { x: 59, lift: 1.6, s: 0.92 }, m: { x: 11.6, lift: 1, s: 0.7 }, z: 5 },
    deb: { art: 'p-deb-wave', g: 'custom followers public', gm: 'custom', d: { x: 68.5, lift: 6, s: 0.8 }, m: { x: 18.6, lift: 2.8, s: 0.62 }, z: 3, flip: true },
  },
  /** Flat silhouettes for Public: CSS masks of cut-outs that are already on the page. */
  strangers: [
    { art: 'p-marcus-wave', d: { x: -76.5, lift: 9.6, s: 0.72 }, m: { x: -22.6, lift: 4.6, s: 0.74 }, z: 1 },
    { art: 'p-kate-wave', d: { x: 79.5, lift: 1.4, s: 0.9 }, m: { x: 4.8, lift: 5.4, s: 0.7 }, z: 4 },
    { art: 'p-sam-wave', d: { x: -22, lift: 9.6, s: 0.72 }, m: null, z: 1 },
  ],
  /** The real feed card. On a phone a short leader joins it to Maya's raised phone. */
  card: { d: { x: 63, y: 64.8, w: 22.5, r: 3.5 }, m: { x: 15.2, y: 26, w: 13.6, r: 3 } },
  phone: { d: { x: 0, y: 0 }, m: { x: 4.9, y: 25.4 } },
}

// ---------------------------------------------------------------------------------------
// 01 TELL
// ---------------------------------------------------------------------------------------
export const TELL = {
  maya: { art: 'p-maya-talk', d: { x: -2.6, s: 1 }, m: { x: -3.4, s: 1 }, z: 5, sh: 0.8 },
  kitchen: { d: { x: -38.5, lift: 2.6, s: 0.74 }, m: { x: -13.8, lift: 15.5, s: 0.5 }, z: 1 },
  ruth: { art: 'p-ruth-dish', d: { x: 16.5, s: 0.92 }, m: { x: -17.6, lift: -1.4, s: 0.66 }, z: 6, rise: true },
  kate: { art: 'p-kate-wave', d: { x: 28.5, lift: 2, s: 0.86 }, m: null, z: 6, rise: true, flip: true },
  swatches: { art: 'prop-swatches', d: { x: -70.5, lift: 0.2, s: 0.8 }, m: null, z: 7, sh: 0.9 },
  pots: { art: 'prop-paint-pots', d: { x: -58.5, lift: -0.6, s: 0.8 }, m: null, z: 7, sh: 0.9 },
  roller: { art: 'prop-roller', air: true, d: { x: -73, y: 27, w: 9.4, r: -14 }, m: null, z: 3 },
  mic: { art: 'prop-mic', air: true, d: { x: 26.4, y: 53.4, w: 6.6, r: 16 }, m: null, z: 8 },
  voice: { d: { x: 13, y: 60.6, w: 24 }, m: { x: 10.8, y: 38, w: 22.4 }, z: 8 },
  page: { d: { x: 55.4, y: 35.4, w: 41.5 }, m: { x: 12.6, y: 17.4, w: 19.6 }, z: 5 },
  sticker: { d: { x: 38.6, y: 68.6, w: 18, r: -6 }, m: { x: 12.6, y: 31.4, w: 19, r: -4 }, z: 9 },
  /** Where the six prints fan before they dock into the page. */
  fan: {
    d: { x: 19, y: 24, w: 18, dx: 5.6, dy: 1.1, r: [-13, -8, -3, 3, 8, 13] },
    m: { x: 9, y: 13, w: 12.5, dx: 2.9, dy: 0.7, r: [-13, -8, -3, 3, 8, 13] },
  },
}

// ---------------------------------------------------------------------------------------
// 02 READ
// ---------------------------------------------------------------------------------------
/** A grid of slots: cols across from x0, rows down from y0 (centres), each w wide. */
function grid(n, cols, x0, y0, w, gx, rowH, tilt = [-2, 1.5, -1, 2, -1.5, 1]) {
  return Array.from({ length: n }, (_, i) => ({ x: x0 + (i % cols) * (w + gx), y: y0 - Math.floor(i / cols) * rowH, w, r: tilt[i % tilt.length] }))
}
const wallD = grid(6, 3, 38.2, 59.4, 14, 1.3, 14.6)
const wallM = grid(6, 2, 8.2, 40.6, 8.6, 0.9, 8.4)

export const READ = {
  tom: { art: 'p-tom-medal', d: { x: -1.5, s: 1 }, m: { x: -9, s: 1 }, z: 5, sh: 0.8 },
  arch: { art: 'o-finish-arch', d: { x: 4.5, lift: 8.6, s: 0.52 }, m: { x: -8, lift: 13, s: 0.42 }, z: 1, sh: 0 },
  barrier: { art: 'o-barrier', d: { x: -47.5, lift: 0.4, s: 0.74 }, m: null, z: 5, sh: 0.9 },
  maya: { art: 'p-maya-cheer', d: { x: -61.5, lift: 2.4, s: 0.76 }, m: null, z: 3, rise: true },
  ivy: { art: 'p-ivy-cheer', d: { x: -47.5, lift: 2.4, s: 0.8 }, m: { x: -18.4, lift: -1.2, s: 0.74 }, z: 3, rise: true },
  leo: { art: 'p-leo-cheer', d: { x: -35, lift: 6.4, s: 0.8 }, m: null, z: 3, rise: true },
  sam: { art: 'p-sam-medal', d: { x: 15.5, lift: 1, s: 0.88 }, m: { x: 1.6, lift: 2.4, s: 0.78 }, z: 4, rise: true },
  shoe: { art: 'prop-shoe', d: { x: -15.5, lift: -0.4, s: 1 }, m: null, z: 7, sh: 0.95 },
  cowbell: { art: 'prop-cowbell', d: { x: -72.5, lift: 0.4, s: 0.9 }, m: null, z: 7, sh: 0.9 },
  medal: { art: 'prop-medal', air: true, d: { x: 16, y: 64.5, w: 9, r: 10 }, m: null, z: 6 },
  banana: { art: 'prop-banana', air: true, d: { x: 27.5, y: 41, w: 8.4, r: -24 }, m: null, z: 6 },
  wall: { d: wallD, m: wallM },
  video: { d: { x: 42.1, y: 26.4, w: 21.8 }, m: { x: 8.2, y: 14.4, w: 8.6 }, z: 6 },
  lightbox: { d: { x: 65.4, y: 26.2, w: 21.2 }, m: { x: 17.7, y: 14, w: 8.6 }, z: 6 },
  reactions: { d: { x: 54, y: 36.4, w: 44.6 }, m: { x: 13, y: 6.6, w: 18 }, z: 9 },
  comments: [
    { d: { x: 42.6, y: 8.6, w: 23.6, r: -1.5 }, m: null, z: 8 },
    { d: { x: 64.6, y: 8, w: 23.6, r: 1.5 }, m: null, z: 8 },
  ],
}

// ---------------------------------------------------------------------------------------
// 03 MAP: the route, then the world
// ---------------------------------------------------------------------------------------
const PIN_Y = -1.5
export const MAP = {
  family: { art: 'g-family-hike', d: { x: 0, s: 1 }, m: { x: -3, s: 1 }, z: 5, sh: 0.86 },
  van: { art: 'o-campervan', d: { x: -48, lift: 12.4, s: 0.58 }, m: { x: -14.5, lift: 9.6, s: 0.4 }, z: 1, sh: 0.92 },
  lighthouse: { art: 'o-lighthouse', d: { x: 56.5, lift: 12.6, s: 0.56 }, m: { x: 15.5, lift: 10, s: 0.4 }, z: 1, sh: 0 },
  waymarker: { art: 'o-waymarker', d: { x: -27, lift: 5, s: 0.5 }, m: null, z: 2, sh: 0.5 },
  flask: { art: 'prop-flask', d: { x: 29.4, lift: 3.4, s: 0.8 }, m: null, z: 4, sh: 0.9 },
  icecream: { art: 'prop-ice-cream', air: true, d: { x: -25.5, y: 31, w: 4.6, r: -12 }, m: { x: -19.4, y: 33, w: 3.4, r: -12 }, z: 6 },
  binoculars: { art: 'prop-binoculars', air: true, d: { x: 31.5, y: 45.5, w: 8.4, r: 10 }, m: null, z: 6 },
  /** The route's stops: the start flag and five numbered pins; each has a print above it. */
  pins: {
    d: [-68, -53, -38, 37, 52, 67].map((x) => ({ x, y: PIN_Y, w: 4.4 })),
    m: [-19.5, -12, -4.5, 4.5, 12, 19.5].map((x) => ({ x, y: -2.2, w: 3.4 })),
  },
  prints: {
    d: [-68, -53, -38, 37, 52, 67].map((x, i) => ({ x, y: 11.6, w: 13.2, r: [-3, 2, -2, 3, -2, 2][i] })),
    m: [null, null, null, null, null, null],
  },
  /** The route line, in stage units: x from the centre, y below the floor line. */
  route: {
    d: 'M-80 2 C-76 1.7 -72 1.5 -68 1.5 S-58 1.5 -53 1.5 S-43 1.5 -38 1.5 C-28 1.5 -20 4.4 0 4.6 C20 4.4 28 1.5 37 1.5 S47 1.5 52 1.5 S62 1.5 67 1.5 S76 1.7 80 2',
    m: 'M-24 2.4 C-22 2.2 -21 2.2 -19.5 2.2 L19.5 2.2 C21 2.2 22 2.2 24 2.4',
  },
  journey: { d: { x: 57, y: 55.6, w: 36 }, m: { x: 13.6, y: 33.6, w: 16.4 }, z: 7 },
}

/** The flat world map: where a longitude and latitude land, in stage units. */
const WORLD_BOX = { d: { x0: -58, w: 128, top: 72 }, m: { x0: -40.4, w: 70, top: 43 } }
const at = (k, lon, lat) => {
  const b = WORLD_BOX[k]
  return { x: b.x0 + ((lon + 180) / 360) * b.w, y: b.top - ((75 - lat) / 360) * b.w }
}
const both = (lon, lat) => ({ d: at('d', lon, lat), m: at('m', lon, lat) })
export const WORLD = {
  box: WORLD_BOX,
  // the route scene at 0.6: the same people and things, eased back about the family's feet
  family: { art: 'g-family-hike', d: { x: 0, s: 0.6 }, m: { x: -1.8, s: 0.6 }, z: 5, sh: 0.86 },
  van: { art: 'o-campervan', d: { x: -28.8, lift: 7.44, s: 0.348 }, m: { x: -8.7, lift: 5.76, s: 0.24 }, z: 1, sh: 0.92 },
  lighthouse: { art: 'o-lighthouse', d: { x: 33.9, lift: 7.56, s: 0.336 }, m: { x: 9.3, lift: 6, s: 0.24 }, z: 1, sh: 0 },
  home: both(-3.5, 53),
  madeira: both(-17, 32.7),
  osaka: both(135.5, 34.7),
  /** One postcard per relative: the print, and who stands beside it. `to` is the pin its leader runs to. */
  cards: {
    joe: { to: 'madeira', d: { x: -25, y: 28, w: 15, r: -3 }, m: { x: -13.5, y: 22.4, w: 10.4, r: -3 }, who: { h: 17, hm: 12 } },
    kate: { to: 'home', d: { x: 27.5, y: 60.6, w: 15, r: 2 }, m: null, who: { h: 16.4, hm: 12 } },
    marcus: { to: 'osaka', d: { x: 63, y: 42, w: 15, r: 3 }, m: { x: 13.4, y: 23.4, w: 10.4, r: 3 }, who: { h: 17.4, hm: 12 } },
    ruth: { to: 'home', d: { x: 38, y: 39.6, w: 15, r: -2 }, m: null, who: { h: 15.6, hm: 12 } },
  },
}

// ---------------------------------------------------------------------------------------
// 04 YEAR
// ---------------------------------------------------------------------------------------
export const YEAR = {
  /** One set of kids per category the scroll steps through; they share the centre of the stage. */
  sets: {
    Birthdays: [
      { key: 'ivy-cake', art: 'p-ivy-cake', d: { x: -8.5, s: 1 }, m: { x: -9.5, s: 1 }, z: 5, sh: 0.8 },
      { key: 'leo-horn', art: 'p-leo-horn', d: { x: 7, s: 1 }, m: { x: 1.5, s: 1 }, z: 5, sh: 0.8 },
    ],
    Vacations: [{ key: 'beach', art: 'g-kids-beach', d: { x: 0, s: 1 }, m: { x: -4, s: 1 }, z: 5, sh: 0.8 }],
    Projects: [{ key: 'rocket', art: 'g-kids-rocket', d: { x: 0, s: 0.94 }, m: { x: -3, s: 0.8 }, z: 5, sh: 0.9 }],
    Milestones: [
      { key: 'ivy-trophy', art: 'p-ivy-trophy', d: { x: -8, s: 1 }, m: { x: -9, s: 1 }, z: 5, sh: 0.8 },
      { key: 'leo-school', art: 'p-leo-school', d: { x: 8, s: 1 }, m: { x: 2, s: 1 }, z: 5, sh: 0.8 },
    ],
  },
  props: {
    Birthdays: [
      { key: 'balloons', art: 'prop-balloons', air: true, d: { x: 18, y: 61, w: 12, r: 6 }, m: { x: 17.5, y: 36.4, w: 7.6, r: 6 }, z: 4 },
      { key: 'hat', art: 'prop-party-hat', h: 0.2, d: { x: -18.5, lift: -0.8, s: 0.9, r: -8 }, m: null, z: 7, sh: 0.9 },
      { key: 'present', art: 'prop-present', d: { x: 17.5, lift: -0.6, s: 0.56 }, m: null, z: 7, sh: 0.95 },
    ],
    Vacations: [{ key: 'bucket', art: 'prop-bucket-spade', d: { x: 30, lift: -0.6, s: 0.56 }, m: null, z: 7, sh: 0.9 }],
    Projects: [],
    Milestones: [
      { key: 'trophy', art: 'prop-trophy', d: { x: -19, lift: -0.6, s: 0.54 }, m: null, z: 7, sh: 0.9 },
      { key: 'bag', art: 'prop-school-bag', d: { x: 19.5, lift: -0.6, s: 0.5 }, m: null, z: 7, sh: 0.95 },
    ],
  },
  joe: { art: 'p-joe-crown', d: { x: 28, lift: 2.4, s: 0.78 }, m: { x: 13.5, lift: 3, s: 0.72 }, z: 3, rise: true },
  ruth: { art: 'p-ruth-gift', d: { x: -28, lift: 2.4, s: 0.74 }, m: { x: -18.6, lift: 3, s: 0.72 }, z: 3, rise: true },
  device: { d: { x: -57.5, y: 21.6, w: 19.4 }, m: null, z: 6 },
  toggle: { d: { x: -55, y: 45, w: 33 }, m: null, z: 7 },
  /** The feed cards deal into one pile; the last is the one on top at rest. */
  cards: [
    { d: { x: 56.6, y: 36.6, w: 29, r: 7 }, m: null },
    { d: { x: 56, y: 37.2, w: 29, r: -6 }, m: null },
    { d: { x: 56.4, y: 37.8, w: 29, r: 3.5 }, m: null },
    { d: { x: 56, y: 38.4, w: 29, r: -1.5 }, m: null },
  ],
}

// ---------------------------------------------------------------------------------------
// FINALE: the portrait, the app
// ---------------------------------------------------------------------------------------
export const OURS = {
  family: { art: 'g-family-hero', d: { x: -1.5, s: 1 }, m: { x: -0.6, s: 1 }, z: 6, sh: 0.9 },
  crowd: {
    ruth: { art: 'p-ruth-dish', g: 'close followers public', d: { x: -28.5, lift: 3.4, s: 0.88 }, m: { x: -18.4, lift: 1.4, s: 0.9 }, z: 4 },
    marcus: { art: 'p-marcus-camera', g: 'close followers public', d: { x: -39.5, lift: 8.6, s: 0.76 }, m: null, z: 3 },
    kate: { art: 'p-kate-pack', g: 'close followers public', d: { x: -51, lift: 4.4, s: 0.86 }, m: null, z: 4 },
    finn: { art: 'p-finn-nod', g: 'followers public', d: { x: -65, lift: 9.4, s: 0.8 }, m: null, z: 3 },
    sam: { art: 'p-sam-medal', g: 'custom followers public', d: { x: 41, lift: 1.4, s: 0.86 }, m: { x: 18.4, lift: 1.4, s: 0.84 }, z: 5 },
    joe: { art: 'p-joe-crown', g: 'close followers public', d: { x: 50.5, lift: 6.4, s: 0.8 }, m: null, z: 3 },
    priya: { art: 'p-priya-wave', g: 'custom followers public', d: { x: 59.5, lift: 1.6, s: 0.92 }, m: null, z: 5 },
    deb: { art: 'p-deb-wave', g: 'custom followers public', d: { x: 69, lift: 6.4, s: 0.8 }, m: null, z: 3, flip: true },
  },
  van: { art: 'o-campervan', d: { x: -60, lift: 13, s: 0.44 }, m: null, z: 1, sh: 0.9 },
  arch: { art: 'o-finish-arch', d: { x: 1, lift: 11.6, s: 0.5 }, m: null, z: 1, sh: 0 },
  lighthouse: { art: 'o-lighthouse', d: { x: 66.5, lift: 13, s: 0.4 }, m: null, z: 1, sh: 0 },
  pots: { art: 'prop-paint-pots', d: { x: -19, lift: -1, s: 0.7 }, m: null, z: 7, sh: 0.9 },
  balloons: { art: 'prop-balloons', air: true, d: { x: -13.5, y: 60.5, w: 8.6, r: -6 }, m: null, z: 5 },
  bucket: { art: 'prop-bucket-spade', d: { x: 23.5, lift: -1.2, s: 0.62 }, m: null, z: 7, sh: 0.9 },
  /** One tag per story: where the tag sits, and what its leader points at. */
  tags: {
    kitchen: { d: { x: -50, y: -4.6, w: 34 }, to: { x: -24, y: 2 }, m: { x: 0, y: 41.4, w: 43 } },
    marathon: { d: { x: 30, y: 62.4, w: 39 }, to: { x: 40.6, y: 50.4 }, m: { x: 0, y: 38.5, w: 43 } },
    coast: { d: { x: 49.5, y: -4.6, w: 32 }, to: { x: 27.6, y: 3 }, m: { x: 0, y: 35.6, w: 43 } },
    ivy: { d: { x: 3, y: 69.4, w: 27 }, to: { x: -11.5, y: 64 }, m: { x: 0, y: 32.7, w: 43 } },
    joe: { d: { x: 62.5, y: 56.4, w: 30 }, to: { x: 51.2, y: 50.6 }, m: { x: 0, y: 29.8, w: 43 } },
  },
}

export const APP = {
  ruth: { art: 'p-ruth-tablet', d: { x: -59, s: 1.02 }, m: { x: -17, lift: -1, s: 0.74 }, z: 5, rise: true },
  joe: { art: 'p-joe-phone', d: { x: -42.5, lift: 1.6, s: 0.98 }, m: null, z: 4, rise: true },
  feed: { d: { x: 19.5, y: 43.2, w: 59 }, m: { x: 5.6, y: 22.4, w: 30 }, z: 5 },
  rail: [
    { d: { x: 66.4, y: 58.4, w: 21 }, m: null },
    { d: { x: 66.4, y: 43.4, w: 21 }, m: null },
    { d: { x: 66.4, y: 27.2, w: 21 }, m: null },
    { d: { x: 66.4, y: 14.6, w: 21 }, m: null },
  ],
}

// ---------------------------------------------------------------------------------------
// CSS variables for one slot
// ---------------------------------------------------------------------------------------
const n = (v) => Math.round(v * 1000) / 1000

/** Variables for something standing on the floor. h: its height in adult heights. */
export function floorVars(a, h, art) {
  const flip = !!a.flip
  const ax = flip ? 1 - art.ax : art.ax
  const out = { '--ar': n(art.w / art.h), '--ax': n(ax), '--feet': n(art.feet) }
  if (a.z != null) out['--z'] = a.z
  if (a.sh != null) out['--sw'] = `${n(a.sh * 100)}%`
  if (a.d) Object.assign(out, { '--xd': n(a.d.x), '--ld': n(a.d.lift || 0), '--hd': n(h * a.d.s), '--rd': `${a.d.r || 0}deg` })
  if (a.m) Object.assign(out, { '--xm': n(a.m.x), '--lm': n(a.m.lift || 0), '--hm': n(h * a.m.s), '--rm': `${a.m.r || 0}deg` })
  return out
}

/** Variables for something in the air (a prop, a print, a card). */
export function airVars(a) {
  const out = {}
  if (a.z != null) out['--z'] = a.z
  if (a.d) Object.assign(out, { '--xd': n(a.d.x), '--yd': n(a.d.y), '--wd': n(a.d.w), '--rd': `${a.d.r || 0}deg` })
  if (a.m) Object.assign(out, { '--xm': n(a.m.x), '--ym': n(a.m.y), '--wm': n(a.m.w), '--rm': `${a.m.r || 0}deg` })
  return out
}

/** Scene-level variables. */
export function stageVars(key) {
  const s = STAGE[key]
  const out = { '--Ad': s.d.A, '--fd': `${s.d.floor}%`, '--Am': s.m.A, '--fm': `${s.m.floor}%` }
  if (s.d.hz) out['--hzd'] = s.d.hz
  if (s.m.hz) out['--hzm'] = s.m.hz
  return out
}
