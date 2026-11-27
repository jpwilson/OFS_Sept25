// Who is on the stage and where they stand at each scene's HOLD (owner: film), round two.
// Three slot sets: d (landscape: desktop and iPad landscape), m (phone) and t (tablet portrait,
// 700px wide or more). A slot with no t uses its m; t: null takes it off the tablet. CSS picks the
// set with max-aspect-ratio: 9/10 and min-width: 700px.
// These numbers are written to the DOM as CSS variables at render, so CSS alone draws every
// scene as a finished poster. The engine only ever adds offsets that end at zero.
//
// Units: u, the stage unit. 100u = min(100svh, 62.5vw) on desktop; on a phone
// 100u = min(100svh, 216vw); on a tablet in portrait 85u = min(100svh, 146vw).
//   x     u from the centre line
//   lift  u above the floor line (people further back stand a little higher)
//   s     scale; 1 = the cut-out's height in H below, in ADULT HEIGHTS, times the scene's A
//   y     for things in the air: u above the floor line, measured to their centre
//   w     for things in the air: width in u
//   r     degrees
// A scene's A is one adult's height in u; change it and the whole scene rescales.

/**
 * Image height of each cut-out in adult heights (Tom = 1). The art is normalised to one
 * pixel height whatever the person's size, and raised arms count as "head", so these are
 * set by eye from the detail sheets (landing-art/sheets/detail-*.jpg).
 */
export const H = {
  'g-family-hero': 1.04,
  'g-family-hike': 1.25,
  'g-family-tetons': 1.05,
  'g-family-wedding': 1.03,
  'g-wedding-couple': 1.04,
  'g-kids-beach': 0.78,
  'g-family-beach': 1.03,
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
  'p-ruth-hanky': 0.92,
  'p-joe-wave': 1.03,
  'p-joe-crown': 1.04,
  'p-joe-phone': 1.0,
  'p-joe-suitcase': 1.03,
  'p-joe-toast': 1.06,
  'p-kate-wave': 0.97,
  'p-kate-pack': 0.98,
  'p-marcus-wave': 1.04,
  'p-marcus-camera': 1.02,
  'p-finn-nod': 0.95,
  'p-finn-suit': 0.95,
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
  'o-wedding-arch': 1.5,
  'o-wedding-cake': 0.66,
  'o-teton-range': 0.8,
  'o-suv-roofbox': 0.92,
  'o-canoe': 0.34,
  'o-moose': 1.12,
  'o-cabin': 1.3,
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
  'prop-hiking-boots': 0.2,
  'prop-lantern': 0.26,
  'prop-flutes': 0.26,
}

/** Per scene: one adult's height (u), the floor line (% of the stage height), and how far the horizon sits above it (u). */
export const STAGE = {
  hero: { d: { A: 50.5, floor: 86, hz: 13.4 }, m: { A: 27.5, floor: 70, hz: 9 }, t: { A: 31.5, floor: 71, hz: 10 } },
  coast: { d: { A: 46.4, floor: 82, hz: 17.5 }, m: { A: 29.5, floor: 68, hz: 12 } },
  tetons: { d: { A: 50, floor: 82, hz: 17.5 }, m: { A: 29, floor: 67.5, hz: 12 } },
  world: { d: { A: 46.4, floor: 82, hz: 17.5 }, m: { A: 31, floor: 72.4, hz: 12 } },
  wedding: { d: { A: 54, floor: 86 }, m: { A: 40, floor: 75 }, t: { A: 38, floor: 76 } },
  kitchen: { d: { A: 58, floor: 86 }, m: { A: 43, floor: 75 } },
  race: { d: { A: 56, floor: 86 }, m: { A: 41, floor: 75 } },
  year: { d: { A: 69, floor: 86 }, m: { A: 34, floor: 77 }, t: { A: 56, floor: 82 } },
  ours: { d: { A: 52, floor: 85, hz: 13.4 }, m: { A: 28.5, floor: 73, hz: 9 }, t: { A: 27, floor: 75, hz: 9 } },
  app: { d: { A: 52, floor: 86, hz: 10 }, m: { A: 36, floor: 78, hz: 8 } },
  end: { d: { A: 44, floor: 86 }, m: { A: 36, floor: 78 } },
}

/**
 * Short portrait screens (film/fit.js): the chapters whose art is kept clear of their copy and
 * docks. fit.js measures the art itself; skip names a part that is not art (a frame around the
 * whole scene), for every layout or per layout ({ m, t }). A scene with no entry is left as
 * designed.
 */
export const FIT = {
  coast: {},
  tetons: {},
  world: {},
  wedding: {},
  kitchen: {},
  race: {},
  // on a short tablet the categories and the photographs hang from the copy (year.module.css), not the floor
  year: { skip: { m: [], t: [...Array.from({ length: 8 }, (_, i) => `year:tab${i}`), ...Array.from({ length: 10 }, (_, i) => `year:photo${i >> 1}-${i & 1}`)] } },
  ours: { skip: ['ours:group', 'ours:print'] },
  app: {},
}

// ---------------------------------------------------------------------------------------
// HERO: the household, and the people each audience lets in.
//   f: where a person stands on the poster, which is the Followers step (and Close Family and Public)
//   c: where they stand on Custom Group: the Run club steps forward, everyone else steps back
//   g: the switch settings a person stands for
// ---------------------------------------------------------------------------------------
export const HERO = {
  family: { art: 'g-family-hero', d: { x: 0, s: 1 }, m: { x: 0, s: 1 }, z: 60, sh: 0.9 },
  /** How close the camera is at each step: the household alone is large, then it eases back as the group grows. */
  camera: {
    d: { private: 1.12, close: 1, followers: 1, custom: 1, public: 0.96 },
    // on a phone the sub line shares the first screen, so the household starts a little smaller
    m: { private: 0.84, close: 1, followers: 1, custom: 1, public: 0.97 },
  },
  crowd: {
    ruth: {
      art: 'p-ruth-wave',
      g: 'close followers public',
      f: { d: { x: -24.5, lift: 0.8, s: 0.96 }, m: { x: -12, lift: 1.6, s: 0.95 } },
      c: { d: { x: -21, lift: 6.4, s: 0.78 }, m: { x: -9, lift: 12.6, s: 0.8 } },
    },
    joe: {
      art: 'p-joe-wave',
      g: 'close followers public',
      f: { d: { x: -36.5, lift: 0, s: 0.97 }, m: { x: -17.4, lift: 4.4, s: 0.93 } },
      c: { d: { x: -44, lift: 7.4, s: 0.76 }, m: { x: -18, lift: 13.4, s: 0.8 } },
    },
    kate: {
      art: 'p-kate-wave',
      g: 'close followers public',
      flip: true,
      f: { d: { x: 24, lift: 0.8, s: 0.96 }, m: { x: 12, lift: 1.6, s: 0.95 } },
      c: { d: { x: 48.5, lift: 7.4, s: 0.78 }, m: { x: 5.4, lift: 13.6, s: 0.78 } },
    },
    marcus: {
      art: 'p-marcus-wave',
      g: 'close followers public',
      flip: true,
      f: { d: { x: 36, lift: 0, s: 0.95 }, m: { x: 17.4, lift: 4.4, s: 0.92 } },
      c: { d: { x: 59, lift: 8.4, s: 0.74 }, m: { x: 18, lift: 13.6, s: 0.78 } },
    },
    finn: {
      art: 'p-finn-nod',
      g: 'followers public',
      f: { d: { x: -30.5, lift: 5.6, s: 0.92 }, m: { x: -7.6, lift: 11, s: 0.86 } },
      c: { d: { x: -55.5, lift: 8.4, s: 0.76 }, m: { x: -3, lift: 15, s: 0.76 } },
    },
    sam: {
      art: 'p-sam-wave',
      g: 'custom followers public',
      flip: true,
      f: { d: { x: -48.5, lift: 3.6, s: 0.92 }, m: { x: -16.4, lift: 11.6, s: 0.86 } },
      c: { d: { x: -32, lift: -1.2, s: 1.02 }, m: { x: -14.5, lift: 1.6, s: 0.98 } },
    },
    priya: {
      art: 'p-priya-wave',
      g: 'custom followers public',
      f: { d: { x: 30, lift: 5.4, s: 0.92 }, m: { x: 7.6, lift: 11, s: 0.86 } },
      c: { d: { x: 25, lift: -1.2, s: 1.02 }, m: { x: 11.6, lift: 1.4, s: 0.97 } },
    },
    deb: {
      art: 'p-deb-wave',
      g: 'custom followers public',
      flip: true,
      f: { d: { x: 47.5, lift: 3.4, s: 0.88 }, m: { x: 16.4, lift: 11.6, s: 0.84 } },
      c: { d: { x: 37.5, lift: -1.6, s: 0.96 }, m: { x: 17, lift: 2.4, s: 0.95 } },
    },
  },
  /** The order people rise in, at each step that adds people. */
  order: { close: ['ruth', 'kate', 'joe', 'marcus'], followers: ['finn', 'priya', 'sam', 'deb'] },
  /** Flat silhouettes for Public: CSS masks of cut-outs that are already on the page. */
  strangers: [
    { art: 'p-marcus-wave', d: { x: -61, lift: 4.4, s: 0.9 }, m: { x: -21, lift: 13.6, s: 0.8 } },
    { art: 'p-kate-wave', d: { x: 60, lift: 4.4, s: 0.9 }, m: { x: 21.2, lift: 13.6, s: 0.8 } },
    { art: 'p-sam-wave', d: { x: 70.5, lift: 9.6, s: 0.8 }, m: null },
    { art: 'p-priya-wave', d: { x: -71, lift: 9.6, s: 0.8 }, m: null },
  ],
  /**
   * Private: the family's own albums, as real feed cards around them. Each capture is the
   * card's photograph with the card's soft shadow under it; only the photograph is shown.
   * Measured from the eight captures: the photograph ends at row 589 to 594 of 746 to 748.
   */
  cardPhoto: 0.786,
  albums: [
    { id: 'ui-card-coast', d: { x: -41.5, y: 36.5, w: 24, r: -6 }, m: { x: -16.4, y: 15.6, w: 12.6, r: -6 }, t: { x: -20.5, y: 23, w: 14.5, r: -6 } },
    { id: 'ui-card-wedding', d: { x: 41, y: 29.5, w: 24, r: 5 }, m: { x: 16.4, y: 13.6, w: 12.6, r: 5 }, t: { x: 20.5, y: 21, w: 14.5, r: 5 } },
    { id: 'ui-card-kitchen', d: { x: -61, y: 17.5, w: 21, r: 5 }, m: null, t: { x: -21, y: 7.5, w: 13, r: 5 } },
    { id: 'ui-card-year', d: { x: 61, y: 9.5, w: 20, r: -4 }, m: null, t: { x: 21, y: 5.5, w: 13, r: -4 } },
  ],
  anyone: [
    { d: { x: -64, y: 45, w: 22 }, m: { x: -12.6, y: 34.6, w: 20 } },
    { d: { x: 65, y: 45, w: 22 }, m: null },
  ],
}

// On an upright tablet the hero is the phone's composition, a size up: every slot is the phone's, scaled.
const UP = 1.15
const up = (p) => {
  if (!p) return p
  const o = { ...p, x: p.x * UP }
  if (p.lift != null) o.lift = p.lift * UP
  if (p.y != null) o.y = p.y * UP
  if (p.w != null) o.w = p.w * UP
  return o
}
for (const p of Object.values(HERO.crowd)) {
  p.f.t = up(p.f.m)
  p.c.t = up(p.c.m)
}
HERO.strangers.forEach((p) => (p.t = up(p.m)))
HERO.anyone.forEach((p) => (p.t = up(p.m)))
HERO.camera.t = { private: 1, close: 1, followers: 1, custom: 1, public: 0.97 }

// ---------------------------------------------------------------------------------------
// 01 COAST: the route along the Maine coast
// ---------------------------------------------------------------------------------------
const COAST_X = [-68, -53, -38, 37, 52, 67]
const COAST_XM = [-19.5, -12, -4.5, 4.5, 12, 19.5]
export const COAST = {
  family: { art: 'g-family-hike', d: { x: 0, s: 1 }, m: { x: -3, s: 1 }, z: 5, sh: 0.86 },
  van: { art: 'o-campervan', d: { x: -48, lift: 12.4, s: 0.58 }, m: { x: -14.5, lift: 9.6, s: 0.4 }, z: 1, sh: 0.92 },
  lighthouse: { art: 'o-lighthouse', d: { x: 56.5, lift: 12.6, s: 0.56 }, m: { x: 15.5, lift: 10, s: 0.4 }, z: 1, sh: 0 },
  waymarker: { art: 'o-waymarker', d: { x: -27, lift: 5, s: 0.5 }, m: null, z: 2, sh: 0.5 },
  flask: { art: 'prop-flask', d: { x: 29.4, lift: 3.4, s: 0.8 }, m: null, z: 4, sh: 0.9 },
  icecream: { art: 'prop-ice-cream', air: true, d: { x: -25.5, y: 31, w: 4.6, r: -12 }, m: { x: -19.4, y: 33, w: 3.4, r: -12 }, z: 6 },
  binoculars: { art: 'prop-binoculars', air: true, d: { x: 31.5, y: 45.5, w: 8.4, r: 10 }, m: null, z: 6 },
  /** The route's stops: the start flag and five numbered pins; each has a print above it. */
  pins: {
    d: COAST_X.map((x) => ({ x, y: -1.5, w: 4.4 })),
    m: COAST_XM.map((x) => ({ x, y: -7.7, w: 3.3 })),
  },
  /** On a phone each print pops large, then settles as a thumbnail over its pin. */
  prints: {
    d: COAST_X.map((x, i) => ({ x, y: 11.6, w: 13.2, r: [-3, 2, -2, 3, -2, 2][i] })),
    m: COAST_XM.map((x, i) => ({ x, y: -3.3, w: 17, s: 0.4, r: [-4, 3, -3, 4, -3, 3][i] })),
  },
  /** The route line, in stage units: x from the centre, y below the floor line. */
  route: {
    d: 'M-80 2 C-76 1.7 -72 1.5 -68 1.5 S-58 1.5 -53 1.5 S-43 1.5 -38 1.5 C-28 1.5 -20 4.4 0 4.6 C20 4.4 28 1.5 37 1.5 S47 1.5 52 1.5 S62 1.5 67 1.5 S76 1.7 80 2',
    m: 'M-24 7.9 C-22 7.7 -21 7.7 -19.5 7.7 L19.5 7.7 C21 7.7 22 7.7 24 7.9',
  },
  journey: { d: { x: 57, y: 55.6, w: 36 }, m: { x: 13.8, y: 30.6, w: 16.4 }, z: 7 },
}

// ---------------------------------------------------------------------------------------
// 02 TETONS: seven days, thirteen stops
// ---------------------------------------------------------------------------------------
/** The thirteen stops along the floor: six left of the family (days 1 to 3), seven right (days 4 to 7). */
const TETON_X = [-76, -66, -56, -46, -36, -26, 16, 26, 36, 46, 56, 66, 76]
const TETON_XM = [-21, -17.5, -14, -10.5, -7, -3.5, 0, 3.5, 7, 10.5, 14, 17.5, 21]
/** Which day each stop belongs to (0 = day 1). */
export const TETON_DAY = [0, 1, 1, 2, 2, 2, 3, 4, 4, 5, 5, 6, 6]
const dayCentre = (xs, d) => {
  const mine = xs.filter((_, i) => TETON_DAY[i] === d)
  const c = mine.reduce((a, b) => a + b, 0) / mine.length
  const edge = Math.abs(xs[0]) - (xs === TETON_X ? 7.6 : 3.4) // keep the outermost thumbnails on the stage
  return Math.max(-edge, Math.min(edge, c))
}
export const TETONS = {
  family: { art: 'g-family-tetons', d: { x: -1.5, s: 1 }, m: { x: -6, s: 1 }, z: 5, sh: 0.86 },
  /** The range is sized by width (u), whatever shape the cut-out comes in. */
  range: { art: 'o-teton-range', d: { x: 26, lift: 15.4, wide: 132 }, m: { x: 2, lift: 10.4, wide: 62 }, z: 1, sh: 0 },
  suv: { art: 'o-suv-roofbox', d: { x: -49, lift: 10, s: 0.56 }, m: { x: -15, lift: 8.8, s: 0.46 }, z: 1, sh: 0.92 },
  cabin: { art: 'o-cabin', d: { x: 63, lift: 12.4, s: 0.44 }, m: { x: 17, lift: 9.6, s: 0.4 }, z: 1, sh: 0 },
  moose: { art: 'o-moose', d: { x: 39.5, lift: 11, s: 0.4 }, m: null, z: 1, sh: 0.8 },
  canoe: { art: 'o-canoe', d: { x: -27.5, lift: 6.4, s: 0.62 }, m: null, z: 2, sh: 0.9 },
  boots: { art: 'prop-hiking-boots', d: { x: -17.5, lift: 2.4, s: 0.8 }, m: null, z: 6, sh: 0.9 },
  lantern: { art: 'prop-lantern', d: { x: 49, lift: 8.4, s: 0.62 }, m: null, z: 2, sh: 0.8 },
  joe: { art: 'p-joe-phone', d: { x: 27, lift: 6.4, s: 0.78 }, m: null, z: 3, rise: true },
  ruth: { art: 'p-ruth-tablet', d: { x: 17, lift: 5.4, s: 0.8 }, m: { x: 13.4, lift: 2, s: 0.78 }, z: 4, rise: true },
  pins: {
    d: TETON_X.map((x) => ({ x, y: -1.5, w: 3.5 })),
    m: TETON_XM.map((x) => ({ x, y: -7.7, w: 2.5 })),
  },
  /** Two prints a day, laid out large and drawn as thumbnails over their day's stops; each pops to full size in turn. */
  prints: {
    d: [0, 1, 2, 3, 4, 5, 6].flatMap((d) => {
      const c = dayCentre(TETON_X, d)
      return [
        { x: c - 3.4, y: 7.6, w: 21, s: 0.4, r: -4 },
        { x: c + 3.4, y: 8.4, w: 21, s: 0.4, r: 3 },
      ]
    }),
    m: [0, 1, 2, 3, 4, 5, 6].flatMap((d) => {
      const c = dayCentre(TETON_XM, d)
      return [
        { x: c - 1, y: -3.5, w: 17, s: 0.26, r: -5 },
        { x: c + 1, y: -3, w: 17, s: 0.26, r: 4 },
      ]
    }),
  },
  /** Where a day's two prints pop to (u from the centre and above the floor), and how far apart they sit. */
  pop: { d: { x: [-57, -57, -50, 42, 46, 51, 57], y: 21, gap: 11 }, m: { x: [0, 0, 0, 0, 0, 0, 0], y: 12, gap: 8.8 } },
  route: {
    d: 'M-80 2 C-78 1.6 -77 1.5 -76 1.5 L-26 1.5 C-18 1.5 -14 4.4 -5 4.6 C6 4.4 10 1.5 16 1.5 L76 1.5 C77 1.5 78 1.6 80 2',
    m: 'M-24 7.9 C-22 7.7 -21.5 7.7 -21 7.7 L21 7.7 C21.5 7.7 22 7.7 24 7.9',
  },
  journey: { d: { x: 58, y: 48.6, w: 34 }, m: { x: 15.4, y: 28.6, w: 14 }, z: 7 },
}

// ---------------------------------------------------------------------------------------
// 03 THE WORLD: a flat map from Hawaii to Italy
// ---------------------------------------------------------------------------------------
/** The map shows longitudes -170 to 40 and latitudes 75 to 10. x0: its left edge; w: its width; top: its top edge. */
export const WORLD_VIEW = { lon0: -170, lon1: 40, lat0: 75, lat1: 10 }
const WORLD_BOX = { d: { x0: -28, w: 110, top: 67 }, m: { x0: -23, w: 46, top: 40 } }
const at = (k, lon, lat) => {
  const b = WORLD_BOX[k]
  const per = b.w / (WORLD_VIEW.lon1 - WORLD_VIEW.lon0)
  return { x: b.x0 + (lon - WORLD_VIEW.lon0) * per, y: b.top - (WORLD_VIEW.lat0 - lat) * per }
}
const both = (lon, lat) => ({ d: at('d', lon, lat), m: at('m', lon, lat) })
export const WORLD = {
  box: WORLD_BOX,
  // the family on the beach in Maui (never the Tetons hikers again); the stand-in until that cut-out lands
  family: { art: 'g-family-beach', standIn: 'g-kids-beach', d: { x: 7, s: 0.72 }, m: { x: -6.5, s: 0.5 }, z: 5, sh: 0.86 },
  /** The timeline view, in a phone. */
  timeline: { d: { x: -60, y: 19.5, w: 16.5 }, m: { x: 16.6, y: 7.4, w: 7.2 }, z: 6 },
  home: both(-87.5, 42.2),
  /**
   * The family's own trips: a pin and a small print each. name: on a phone, which side of its pin
   * the place's name sits (under it by default), clear of the postcards' name tags below the map.
   */
  trips: {
    tetons: { pin: both(-110.7, 43.7), print: { d: { dx: -7.5, dy: -9.5, w: 10, r: -4 }, m: { dx: -3, dy: -7, w: 6.4, r: -4 } }, name: 'left' },
    // its print sits a little higher than the others, so its caption clears Grandpa Joe's name tag below it
    coast: { pin: both(-68.5, 44.3), print: { d: { dx: 8.5, dy: -5.4, w: 10, r: 4 }, m: { dx: 3.4, dy: -7, w: 6.4, r: 4 } }, name: 'right' },
    maui: { pin: both(-156.7, 20.9), print: { d: { dx: 2, dy: -8.6, w: 10, r: 3 }, m: { dx: 1.4, dy: -6.4, w: 6.4, r: 3 } } },
  },
  /** The relatives' own stories: a pin, and a postcard with its author beside it. */
  cards: {
    ruth: { pin: both(-134.4, 58.3), d: { x: 13, y: 61.4, w: 14, r: -3 }, m: { x: -14, y: 21.8, w: 10.4, r: -3 }, who: { h: 15, hm: 10.5 } },
    joe: { pin: both(-9, 53.3), d: { x: 40.5, y: 29.6, w: 14, r: 3 }, m: { x: 0.2, y: 21.2, w: 10.4, r: 2 }, who: { h: 16.4, hm: 11.4 } },
    kate: { pin: both(14.6, 40.6), d: { x: 67, y: 27.6, w: 14, r: -2 }, m: { x: 14, y: 22, w: 10.4, r: 3 }, who: { h: 15.6, hm: 10.8 } },
  },
}

// ---------------------------------------------------------------------------------------
// 04 WEDDING
// ---------------------------------------------------------------------------------------
/** A grid of slots: cols across from x0, rows down from y0 (centres), each w wide. */
function grid(n, cols, x0, y0, w, gx, rowH, tilt = [-2, 1.5, -1, 2, -1.5, 1]) {
  return Array.from({ length: n }, (_, i) => ({ x: x0 + (i % cols) * (w + gx), y: y0 - Math.floor(i / cols) * rowH, w, r: tilt[i % tilt.length] }))
}
export const WEDDING = {
  couple: { art: 'g-wedding-couple', d: { x: -1.5, s: 1 }, m: { x: -9.6, s: 0.95 }, z: 5, sh: 0.8 },
  arch: { art: 'o-wedding-arch', d: { x: -1.5, lift: 4, s: 0.73 }, m: { x: -10.6, lift: 3, s: 0.67 }, z: 1, sh: 0 },
  cake: { art: 'o-wedding-cake', d: { x: -68.5, lift: -0.4, s: 1 }, m: null, z: 7, sh: 0.9 },
  family: { art: 'g-family-wedding', d: { x: -45, lift: 2, s: 0.84 }, m: null, z: 3, rise: true },
  joe: { art: 'p-joe-toast', d: { x: -22.5, lift: 4.4, s: 0.82 }, m: null, z: 3, rise: true },
  ruth: { art: 'p-ruth-hanky', d: { x: 17, lift: 1.4, s: 0.9 }, m: { x: -19.4, lift: -1.4, s: 0.68 }, z: 6, rise: true },
  finn: { art: 'p-finn-suit', d: { x: 27.5, lift: 4.6, s: 0.84 }, m: null, z: 3, rise: true },
  flutes: { art: 'prop-flutes', d: { x: -14.5, lift: -0.6, s: 0.9 }, m: null, z: 7, sh: 0.8 },
  bouquet: { art: 'prop-bouquet', air: true, d: { x: 15.5, y: 66, w: 9, r: 12 }, m: null, z: 6 },
  confetti: { art: 'prop-confetti', air: true, d: { x: 22.5, y: 52.4, w: 6.4, r: -20 }, m: null, z: 6 },
  wall: { d: grid(6, 3, 38.2, 59.4, 14, 1.3, 14.6), m: grid(6, 2, 8.6, 40.6, 8.4, 0.8, 8.2) },
  video: { d: { x: 42.1, y: 26.4, w: 21.8 }, m: { x: 8.6, y: 14.8, w: 8.4 }, z: 6 },
  lightbox: { d: { x: 65.4, y: 26.2, w: 21.2 }, m: { x: 17.8, y: 14.4, w: 8.4 }, z: 6 },
  reactions: { d: { x: 54, y: 36.4, w: 44.6 }, m: { x: 13.2, y: 8.6, w: 18 }, z: 9 },
  comments: [
    // on a phone its top edge is placed, so the lines it wraps to grow downwards, away from the reactions
    { d: { x: 42.6, y: 8.6, w: 23.6, r: -1.5 }, m: { x: 11.4, y: 6.5, w: 21.6, r: -1.5, ay: 0 }, z: 8 },
    { d: { x: 64.6, y: 8, w: 23.6, r: 1.5 }, m: null, z: 8 },
  ],
}

// ---------------------------------------------------------------------------------------
// 05 KITCHEN
// ---------------------------------------------------------------------------------------
export const KITCHEN = {
  maya: { art: 'p-maya-talk', d: { x: -2.6, s: 1 }, m: { x: -1.6, s: 1 }, z: 5, sh: 0.8 },
  kitchen: { d: { x: -38.5, lift: 2.6, s: 0.74 }, m: { x: -13.4, lift: 9.6, s: 0.5 }, z: 1 },
  ruth: { art: 'p-ruth-dish', d: { x: 16.5, s: 0.92 }, m: { x: -17.6, lift: -1.4, s: 0.66 }, z: 6, rise: true },
  kate: { art: 'p-kate-wave', d: { x: 28.5, lift: 2, s: 0.86 }, m: null, z: 6, rise: true, flip: true },
  swatches: { art: 'prop-swatches', d: { x: -70.5, lift: 0.2, s: 0.8 }, m: null, z: 7, sh: 0.9 },
  pots: { art: 'prop-paint-pots', d: { x: -58.5, lift: -0.6, s: 0.8 }, m: null, z: 7, sh: 0.9 },
  roller: { art: 'prop-roller', air: true, d: { x: -73, y: 27, w: 9.4, r: -14 }, m: null, z: 3 },
  mic: { art: 'prop-mic', air: true, d: { x: 31, y: 49.6, w: 6.2, r: 16 }, m: null, z: 8 },
  /** The ways in: three rows and a fourth, stacked over the voice note. */
  ways: { d: { x: 10.6, y: 69.6, w: 47 }, m: { x: -13.4, y: 35.2, w: 16.4 }, t: { x: -18, y: 33.6, w: 16.4 }, z: 8 },
  voice: { d: { x: 17, y: 55.4, w: 27 }, m: { x: 10.8, y: 38, w: 22.4 }, t: { x: 12, y: 34.6, w: 23 }, z: 8 },
  page: { d: { x: 55.8, y: 35.4, w: 40.4 }, m: { x: 12.6, y: 17.4, w: 19.6 }, z: 5 },
  sticker: { d: { x: 55.5, y: 69.4, w: 18, r: -5 }, m: { x: 12.6, y: 4.2, w: 19, r: -4 }, z: 9 },
  /** Where the six prints fan before they dock into the page. */
  fan: {
    d: { x: 19, y: 22, w: 18, dx: 5.6, dy: 1.1, r: [-13, -8, -3, 3, 8, 13] },
    m: { x: 9, y: 13, w: 12.5, dx: 2.9, dy: 0.7, r: [-13, -8, -3, 3, 8, 13] },
  },
}

// ---------------------------------------------------------------------------------------
// 06 MARATHON: staged around who can open it
// ---------------------------------------------------------------------------------------
export const RACE = {
  tom: { art: 'p-tom-medal', d: { x: -3.5, s: 1 }, m: { x: -11, s: 1 }, z: 5, sh: 0.8 },
  arch: { art: 'o-finish-arch', d: { x: -1.5, lift: 8.6, s: 0.52 }, m: { x: -10, lift: 13, s: 0.42 }, z: 1, sh: 0 },
  barrier: { art: 'o-barrier', d: { x: -47.5, lift: 0.4, s: 0.74 }, m: null, z: 5, sh: 0.9 },
  maya: { art: 'p-maya-cheer', d: { x: -61.5, lift: 2.4, s: 0.7 }, m: null, z: 3, rise: true },
  ivy: { art: 'p-ivy-cheer', d: { x: -47.5, lift: 2.4, s: 0.74 }, m: { x: -20, lift: -1.2, s: 0.7 }, z: 3, rise: true },
  leo: { art: 'p-leo-cheer', d: { x: -35, lift: 6.4, s: 0.76 }, m: null, z: 3, rise: true },
  shoe: { art: 'prop-shoe', d: { x: -17, lift: -0.4, s: 1 }, m: null, z: 7, sh: 0.95 },
  cowbell: { art: 'prop-cowbell', d: { x: -72.5, lift: 0.4, s: 0.9 }, m: null, z: 7, sh: 0.9 },
  medal: { art: 'prop-medal', air: true, d: { x: 10.5, y: 66.4, w: 8, r: 10 }, m: null, z: 6 },
  banana: { art: 'prop-banana', air: true, d: { x: 13.5, y: 41, w: 7.2, r: -24 }, m: null, z: 6 },
  /** The audience, as a card: the group's name and its three members. */
  chip: { d: { x: 51.5, y: 62.8, w: 45 }, m: { x: 11.4, y: 34.8, w: 22.4 }, z: 9 },
  /** The Run club rise under it. */
  club: {
    sam: { art: 'p-sam-medal', d: { x: 33, lift: 0.6, s: 0.66 }, m: { x: 3.8, lift: 1.2, s: 0.58 }, z: 6, rise: true },
    priya: { art: 'p-priya-wave', d: { x: 48, lift: 0, s: 0.71 }, m: { x: 11.4, lift: 0.6, s: 0.62 }, z: 7, rise: true },
    deb: { art: 'p-deb-wave', d: { x: 63, lift: 0.6, s: 0.66 }, m: { x: 18.8, lift: 1.2, s: 0.56 }, z: 6, rise: true, flip: true },
  },
  /** Under the card: the clip, the real lightbox, and two prints. */
  video: { d: { x: 37.2, y: 46.4, w: 18.4 }, m: { x: 5.8, y: -3.6, w: 10 }, z: 8 },
  lightbox: { d: { x: 55.6, y: 47, w: 15.6 }, m: { x: 17, y: -3.6, w: 10 }, z: 8 },
  prints: [
    { d: { x: 69.5, y: 47.4, w: 10, r: 3 }, m: null },
    { d: { x: 19, y: 52, w: 11.6, r: -4 }, m: null },
  ],
}

// ---------------------------------------------------------------------------------------
// 07 THROUGH THE YEARS: the same two kids at five ages
// ---------------------------------------------------------------------------------------
/** Each child's height at each stage, in adult heights. The pair cut-out is as tall as the taller child. */
const IVY = [0.7, 0.76, 0.86, 0.89, 0.9]
const LEO = [0.6, 0.67, 0.76, 0.82, 0.96]
export const YEARS = {
  ivy: IVY,
  leo: LEO,
  /** The pair's height at each stage (adult heights). */
  tall: IVY.map((h, i) => Math.max(h, LEO[i])),
  /** The matched pair cut-outs, and what stands in for a stage whose art has not landed. */
  art: ['g-years-1', 'g-years-2', 'g-years-3', 'g-years-4', 'g-years-5'],
  standIn: 'g-kids-beach',
  /** Where the pair stands; every stage shares this spot and floor line. */
  pair: { d: { x: 4, s: 1 }, m: { x: 0, s: 1 }, t: { x: 9.6, s: 1 }, z: 5, sh: 0.8 },
  /**
   * That year's two photographs: Ivy's, then Leo's. On a wide screen each stands on its
   * child's side; on a phone they sit at the bottom corners; on a tablet in portrait both
   * stack on the left, under the copy.
   */
  photos: [
    { d: { x: -43.5, y: 27, w: 36, r: -3 }, m: { x: -15.2, y: 6.4, w: 14.6, r: -4 }, t: { x: -19.2, y: 26, w: 15, r: -3 } },
    { d: { x: 53, y: 27, w: 37, r: 3 }, m: { x: 15.2, y: 6.4, w: 14.6, r: 4 }, t: { x: -18.6, y: 8.6, w: 15, r: 3 } },
  ],
  /** The phone with the four views: wide screens only (a phone and an upright tablet keep the hold to the kids and their chart). */
  device: { d: { x: -70, y: 17.5, w: 12.5 }, m: null, z: 8 },
  toggle: { d: { x: -70, y: 33.6, w: 12.5 }, m: null, z: 9 },
}

// ---------------------------------------------------------------------------------------
// FINALE: the portrait, the app
// ---------------------------------------------------------------------------------------
export const OURS = {
  family: { art: 'g-family-hero', d: { x: -1.5, s: 1 }, m: { x: -0.6, s: 1 }, z: 6, sh: 0.9 },
  crowd: {
    ruth: { art: 'p-ruth-dish', g: 'close followers public', d: { x: -28.5, lift: 3.4, s: 0.88 }, m: { x: -18.4, lift: 1.4, s: 0.9 }, z: 4 },
    marcus: { art: 'p-marcus-camera', g: 'close followers public', d: { x: -39.5, lift: 8.6, s: 0.76 }, m: { x: -11.4, lift: 8.4, s: 0.8 }, z: 3 },
    kate: { art: 'p-kate-pack', g: 'close followers public', d: { x: -51, lift: 4.4, s: 0.86 }, m: null, z: 4 },
    finn: { art: 'p-finn-suit', g: 'followers public', d: { x: -65, lift: 9.4, s: 0.8 }, m: null, z: 3 },
    sam: { art: 'p-sam-medal', g: 'custom followers public', d: { x: 41, lift: 1.4, s: 0.86 }, m: { x: 18.4, lift: 1.4, s: 0.84 }, z: 5 },
    joe: { art: 'p-joe-crown', g: 'close followers public', d: { x: 50.5, lift: 6.4, s: 0.8 }, m: { x: 10.4, lift: 8.4, s: 0.8 }, z: 3 },
    priya: { art: 'p-priya-wave', g: 'custom followers public', d: { x: 59.5, lift: 1.6, s: 0.92 }, m: null, z: 5 },
    deb: { art: 'p-deb-wave', g: 'custom followers public', d: { x: 69, lift: 6.4, s: 0.8 }, m: null, z: 3, flip: true },
  },
  van: { art: 'o-campervan', d: { x: -60, lift: 13, s: 0.44 }, m: null, z: 1, sh: 0.9 },
  arch: { art: 'o-wedding-arch', d: { x: 1, lift: 9, s: 0.62 }, m: null, z: 1, sh: 0 },
  cabin: { art: 'o-cabin', d: { x: 67.5, lift: 13, s: 0.42 }, m: null, z: 1, sh: 0 },
  pots: { art: 'prop-paint-pots', d: { x: -19, lift: -1, s: 0.7 }, m: null, z: 7, sh: 0.9 },
  balloons: { art: 'prop-balloons', air: true, d: { x: -13.5, y: 60.5, w: 8.6, r: -6 }, m: null, z: 5 },
  bucket: { art: 'prop-bucket-spade', d: { x: 23.5, lift: -1.2, s: 0.62 }, m: null, z: 7, sh: 0.9 },
  /** One tag per story: where the tag sits, and what its leader points at. */
  tags: {
    kitchen: { d: { x: -50, y: -4.6, w: 34 }, to: { x: -24, y: 2 }, m: { x: 0, y: 43, w: 43 }, t: { x: 0, y: 41.4, w: 43 } },
    marathon: { d: { x: 30, y: 62.4, w: 39 }, to: { x: 40.6, y: 50.4 }, m: { x: 0, y: 40.5, w: 43 }, t: { x: 0, y: 39, w: 43 } },
    coast: { d: { x: 49.5, y: -4.6, w: 34 }, to: { x: 27.6, y: 3 }, m: { x: 0, y: 38, w: 43 }, t: { x: 0, y: 36.6, w: 43 } },
    ivy: { d: { x: 62.5, y: 56.4, w: 28 }, to: { x: 51.2, y: 50.6 }, m: { x: 0, y: 35.5, w: 43 }, t: { x: 0, y: 34.2, w: 43 } },
    wedding: { d: { x: 3, y: 69.4, w: 38 }, to: { x: 3, y: 62 }, m: { x: 0, y: 33, w: 43 }, t: { x: 0, y: 31.8, w: 43 } },
  },
}

export const APP = {
  ruth: { art: 'p-ruth-tablet', d: { x: -62, s: 1 }, m: { x: -17.4, lift: -1, s: 0.8 }, z: 6, rise: true },
  joe: { art: 'p-joe-phone', d: { x: -47, lift: 1.6, s: 0.98 }, m: null, z: 5, rise: true },
  sam: { art: 'p-sam-wave', d: { x: 68, lift: 0.6, s: 0.96 }, m: { x: 18, lift: -1, s: 0.78 }, z: 6, rise: true },
  /** The feed, large and tilted; the other captures fan out from behind it. */
  feed: { d: { x: 11, y: 42.4, w: 60, r: -2.5 }, m: { x: 0.6, y: 26.4, w: 27, r: -2.5 }, z: 5 },
  /**
   * tag: where the feed in front would cover a capture's tag on its near corner, 'end' pins it to
   * the far corner and 'out' slides it further out past the near one.
   */
  fan: [
    { d: { x: 44.5, y: 65, w: 26, r: 7 }, m: { x: 12.6, y: 44.6, w: 15, r: 8 } },
    { d: { x: 52, y: 44.6, w: 25, r: 11 }, m: { x: 15, y: 31, w: 14, r: 12, tag: 'end' } },
    { d: { x: -27, y: 33, w: 23, r: -8 }, m: { x: -12.6, y: 45, w: 14, r: -8 } },
    { d: { x: 46.5, y: 21.4, w: 27, r: 5, tag: 'end' }, m: { x: -14.4, y: 30, w: 14, r: -10, tag: 'out' } },
  ],
}

// ---------------------------------------------------------------------------------------
// CSS variables for one slot
// ---------------------------------------------------------------------------------------
const n = (v) => Math.round(v * 1000) / 1000

/** The slot set for a layout key: 'd', 'm' or 't' (t falls back to m). */
export const pick = (o, k) => (k === 't' ? (o.t !== undefined ? o.t : o.m) : o[k])

/** Variables for something standing on the floor. h: its height in adult heights. */
export function floorVars(a, h, art) {
  const flip = !!a.flip
  const ax = flip ? 1 - art.ax : art.ax
  const out = { '--ar': n(art.w / art.h), '--ax': n(ax), '--feet': n(art.feet) }
  if (a.z != null) out['--z'] = a.z
  if (a.sh != null) out['--sw'] = `${n(a.sh * 100)}%`
  if (a.d) Object.assign(out, { '--xd': n(a.d.x), '--ld': n(a.d.lift || 0), '--hd': n(h * a.d.s), '--rd': `${a.d.r || 0}deg` })
  if (a.m) Object.assign(out, { '--xm': n(a.m.x), '--lm': n(a.m.lift || 0), '--hm': n(h * a.m.s), '--rm': `${a.m.r || 0}deg` })
  if (a.t) Object.assign(out, { '--xt': n(a.t.x), '--lt': n(a.t.lift || 0), '--ht': n(h * a.t.s), '--rt': `${a.t.r || 0}deg` })
  return out
}

/** Variables for something in the air (a prop, a print, a card). */
export function airVars(a) {
  const out = {}
  if (a.z != null) out['--z'] = a.z
  if (a.d) Object.assign(out, { '--xd': n(a.d.x), '--yd': n(a.d.y), '--wd': n(a.d.w), '--rd': `${a.d.r || 0}deg` })
  if (a.m) Object.assign(out, { '--xm': n(a.m.x), '--ym': n(a.m.y), '--wm': n(a.m.w), '--rm': `${a.m.r || 0}deg` })
  // s: drawn smaller than it is laid out (a print that pops large is laid out large, so it stays sharp)
  if (a.d && a.d.s != null) out['--sd'] = n(a.d.s)
  if (a.m && a.m.s != null) out['--sm'] = n(a.m.s)
  // ay: which point of the slot y places (0: its top edge), for a card whose text sets its height
  if (a.m && a.m.ay != null) out['--aym'] = `${n(a.m.ay * 100)}%`
  if (a.t && a.t.ay != null) out['--ayt'] = `${n(a.t.ay * 100)}%`
  if (a.t) Object.assign(out, { '--xt': n(a.t.x), '--yt': n(a.t.y), '--wt': n(a.t.w), '--rt': `${a.t.r || 0}deg`, '--st': n(a.t.s != null ? a.t.s : 1) })
  // vars: any other variables the slot's contents share
  if (a.vars) Object.assign(out, a.vars)
  return out
}

/** Scene-level variables. */
export function stageVars(key) {
  const s = STAGE[key]
  const out = { '--Ad': s.d.A, '--fd': `${s.d.floor}%`, '--Am': s.m.A, '--fm': `${s.m.floor}%` }
  if (s.d.hz) out['--hzd'] = s.d.hz
  if (s.m.hz) out['--hzm'] = s.m.hz
  if (s.t) Object.assign(out, { '--At': s.t.A, '--ft': `${s.t.floor}%` })
  if (s.t && s.t.hz) out['--hzt'] = s.t.hz
  return out
}
