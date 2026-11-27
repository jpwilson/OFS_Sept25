// The film's clock (owner: film), round two. Everything is written in S: svh of scroll since
// the film pinned. p (0..1 across the stage) * SPAN = S.
//
// Each chapter is written in its own local time, where 0 is the moment its wash starts to
// flood, and `len` is how long it lasts before the next wash floods. Change a window here
// and you know which beat moved; everything after it shifts on its own.
// A range is [a, b]; a run is { a, step, dur } (item i starts at a + i * step).

/** Scenes in order. Each one is a poster in the DOM and a window on this clock. */
export const ORDER = ['hero', 'coast', 'tetons', 'world', 'wedding', 'kitchen', 'race', 'year', 'ours', 'app', 'end']

/** Chapters as numbered on the page (the counter reads 01 / 07). */
export const CHAPTERS = ['coast', 'tetons', 'world', 'wedding', 'kitchen', 'race', 'year']

// ---- HERO: five audiences, one hold each (absolute time; the film starts here) ---------------

export const STEPS = ['private', 'close', 'followers', 'custom', 'public']

export const HERO = {
  /** Each audience rests across its hold (46svh), then the next arrives across `move`. */
  hold: { private: [0, 46], close: [84, 130], followers: [168, 214], custom: [256, 302], public: [340, 386] },
  move: { close: [46, 84], followers: [130, 168], custom: [214, 256], public: [302, 340] },
  /** Where a click on the switch glides to: a little into each hold. */
  rest: { private: 0, close: 96, followers: 180, custom: 268, public: 352 },
  /** On a phone the sub line steps aside as the walk begins, and the word moves up into its place. */
  subOut: [10, 40],
  copyOut: [390, 424],
  crowdOut: [392, 436],
  len: 436,
}

// ---- chapters, in local time -----------------------------------------------------------------

const LOCAL = {
  coast: {
    len: 256,
    hold: 228,
    flood: [0, 36],
    copy: [22, 58],
    van: [30, 62],
    lighthouse: [40, 62],
    waymarker: [50, 68],
    /** The route draws across this window; pin k pops when the line reaches it. */
    route: [64, 154],
    pin: { a: 66, step: 16, dur: 14 },
    icecream: [88, 106],
    binoculars: [124, 142],
    flask: [154, 170],
    journey: [160, 180],
    aud: [174, 186],
    readers: { a: 182, step: 6, dur: 16 },
    readouts: [56, 92],
  },
  tetons: {
    len: 374,
    hold: 348,
    flood: [0, 36],
    copy: [22, 58],
    range: [20, 60],
    suv: [38, 70],
    cabin: [52, 74],
    chips: { a: 62, step: 2.4, dur: 12 },
    route: [68, 88],
    /** Seven days: day d plays across [a + d * step, a + (d + 1) * step). */
    days: { a: 90, step: 30 },
    moose: [158, 182],
    canoe: [222, 246],
    journey: [290, 310],
    joe: [298, 316],
    ruth: [304, 322],
    aud: [310, 322],
    readouts: [58, 94],
  },
  world: {
    len: 158,
    hold: 132,
    flood: [0, 36],
    copy: [22, 54],
    map: [18, 58],
    home: [32, 48],
    pins: { a: 44, step: 8, dur: 14 },
    cards: { a: 62, step: 13, dur: 18 },
    readouts: [64, 94],
  },
  wedding: {
    len: 272,
    hold: 246,
    flood: [0, 36],
    copy: [22, 58],
    arch: [26, 52],
    cake: [42, 62],
    wall: { a: 56, step: 8, dur: 15 },
    bouquet: [68, 86],
    video: [108, 124],
    ring: [120, 178],
    lightbox: [128, 148],
    family: [142, 162],
    guests: { a: 150, step: 9, dur: 17 },
    confetti: [156, 176],
    flutes: [172, 190],
    reactions: [182, 198],
    comments: { a: 188, step: 10, dur: 16 },
    aud: [208, 220],
    readouts: [50, 90],
  },
  kitchen: {
    len: 376,
    hold: 350,
    flood: [0, 36],
    copy: [22, 62],
    kitchen: [34, 60],
    /** Six prints, one every `step`, each taking `dur` to land. */
    prints: { a: 74, step: 8, dur: 16 },
    swatches: [84, 102],
    /** The ways in: three chips, then the fourth. */
    ways: { a: 126, step: 9, dur: 12 },
    voice: [154, 168],
    /** The waveform and timer run across this window. */
    talk: [162, 204],
    mic: [170, 188],
    page: [198, 214],
    title: [208, 222],
    /** Three sections: heading, a line, a print docking, and one kitchen stage wiping up. */
    sections: { a: 220, step: 24, dur: 24 },
    roller: [236, 256],
    pots: [260, 278],
    chips: [288, 298],
    sticker: [292, 306],
    ruth: [300, 318],
    kate: [306, 324],
    aud: [312, 324],
    readouts: [66, 106],
  },
  race: {
    len: 212,
    hold: 186,
    flood: [0, 36],
    copy: [22, 58],
    arch: [26, 52],
    barrier: [38, 58],
    squad: { a: 50, step: 7, dur: 16 },
    prints: { a: 68, step: 7, dur: 14 },
    shoe: [84, 100],
    video: [88, 102],
    ring: [98, 144],
    /** The audience chip lands big, then the Run club rises under it. */
    chip: [108, 124],
    club: { a: 118, step: 9, dur: 18 },
    device: [134, 152],
    props: [140, 158],
    readouts: [50, 86],
  },
  year: {
    len: 412,
    hold: 386,
    flood: [0, 36],
    copy: [22, 58],
    tabs: { a: 30, step: 2.4, dur: 14 },
    /** The height chart draws, then the first marks and that year's photos land. */
    chart: [44, 62],
    first: [58, 80],
    /** Four times the kids grow: stage i becomes i + 1 across [a + i * step, a + i * step + dur], then rests. */
    grow: { a: 106, step: 58, dur: 30 },
    device: [310, 328],
    /** The view toggle flicks to Calendar, Map, Timeline, then back to the feed. */
    views: [328, 336, 344, 352],
    viewDur: 6,
    readouts: [46, 82],
  },
  ours: {
    len: 192,
    hold: 160,
    flood: [0, 36],
    copy: [22, 56],
    assemble: [26, 102],
    tags: { a: 98, step: 5, dur: 12 },
    console: [116, 132],
    /** The portrait shrinks into a white-bordered print. */
    shrink: [186, 222],
  },
  app: {
    len: 140,
    hold: 114,
    flood: [0, 40],
    feed: [10, 54],
    copy: [42, 70],
    fan: { a: 48, step: 6, dur: 16 },
    readers: { a: 54, step: 8, dur: 18 },
  },
  end: {
    len: 114,
    hold: 114,
    flood: [0, 40],
    plate: [0, 44],
    copy: [30, 52],
  },
}

// ---- local -> absolute -------------------------------------------------------------------------

const KEEP = new Set(['len', 'step', 'dur', 'stepDur', 'viewDur'])
function shift(v, d, key) {
  if (typeof v === 'number') return KEEP.has(key) ? v : v + d
  if (Array.isArray(v)) return v.map((x) => x + d)
  const out = {}
  for (const k of Object.keys(v)) out[k] = shift(v[k], d, k)
  return out
}

const built = {}
export const START = { hero: 0 }
{
  let t = HERO.len
  for (const k of ORDER.slice(1)) {
    START[k] = t
    built[k] = shift(LOCAL[k], t)
    t += LOCAL[k].len
  }
  START.done = t
}

/** Scroll distance of the whole film, in svh. The wrapper is SPAN + 100 tall. */
export const SPAN = START.done
export const STAGE_SVH = SPAN + 100

export const COAST = built.coast
export const TETONS = built.tetons
export const WORLD = built.world
export const WEDDING = built.wedding
export const KITCHEN = built.kitchen
export const RACE = built.race
export const YEAR = built.year
export const OURS = built.ours
export const APP = built.app
export const END = built.end

/** Where each scene's wash floods in (the circle grows from the subject's feet). */
export const FLOOD = Object.fromEntries(ORDER.slice(1).map((k) => [k, built[k].flood]))

/** When a scene is on stage at all (visibility), with room for the next flood over it. */
export const LIVE = Object.fromEntries(
  ORDER.map((k, i) => {
    const a = k === 'hero' ? -10 : START[k]
    const next = ORDER[i + 1]
    const b = next ? built[next].flood[1] + 4 : SPAN + 10
    return [k, [a, b]]
  }),
)

/** Where each scene rests: nothing in flight, the copy readable. The rail goes here. */
export const HOLD = Object.fromEntries(ORDER.map((k) => [k, k === 'hero' ? 0 : k === 'end' ? SPAN : built[k].hold]))

/** Hash anchors land where a chapter has just opened, so scrolling on plays it. */
export const ANCHOR = {
  trips: START.coast + 46,
  tetons: START.tetons + 46,
  wedding: START.wedding + 46,
  home: START.kitchen + 46,
  race: START.race + 46,
  year: START.year + 46,
  finale: START.ours + 46,
  app: HOLD.app,
}
