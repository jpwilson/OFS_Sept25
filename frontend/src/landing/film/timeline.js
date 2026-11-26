// The film's clock (owner: film). Everything is written in S: svh of scroll since the film
// pinned. p (0..1 across the stage) * SPAN = S. Change a window here and you know which beat
// moved. A range is [a, b].

/** Scroll distance of the whole film, in svh. The wrapper is SPAN + 100 tall. */
export const SPAN = 1836
export const STAGE_SVH = SPAN + 100

/** Scenes in order. Each one is a poster in the DOM and a window on this clock. */
export const ORDER = ['hero', 'tell', 'read', 'map', 'world', 'year', 'ours', 'app', 'end']

/** Where each scene's wash floods in (the circle grows from the subject's feet). */
export const FLOOD = {
  tell: [72, 110],
  read: [440, 476],
  map: [712, 748],
  // world has the same wash as map: it is revealed by a cut once map has eased back
  year: [1092, 1128],
  ours: [1392, 1428],
  app: [1584, 1624],
  end: [1722, 1762],
}

/** When a scene is on stage at all (visibility), with room for the flood over it. */
export const LIVE = {
  hero: [-10, 114],
  tell: [72, 480],
  read: [440, 752],
  map: [712, 950],
  world: [944, 1132],
  year: [1092, 1432],
  ours: [1392, 1628],
  app: [1584, 1766],
  end: [1722, SPAN + 10],
}

/** Where each scene rests: nothing in flight, the copy readable. The rail goes here. Every hold is 50svh or more. */
export const HOLD = {
  hero: 0,
  tell: 414,
  read: 688,
  map: 898,
  world: 1066,
  year: 1366,
  ours: 1550,
  app: 1698,
  end: SPAN,
}

/** Hash anchors (#lp-tell ...) land where the chapter has just opened, so scrolling on plays it. */
export const ANCHOR = {
  tell: 132,
  read: 486,
  map: 758,
  year: 1138,
  finale: 1438,
  app: 1698,
}

/** Month index (0 = January) the counter shows at each scene's start. */
export const MONTH = { hero: 0, tell: 1, read: 3, map: 7, world: 7, year: 9, ours: 11, app: 11, end: 11 }

// ---- beats inside scenes -----------------------------------------------------------------

export const HERO = {
  copyOut: [4, 36],
  crowdBack: [12, 76],
  consoleOut: [20, 58],
  familyOut: [54, 96],
}

export const TELL = {
  copy: [94, 134],
  kitchen: [106, 132],
  /** Six prints, one every `step`, each taking `dur` to land. */
  prints: { a: 146, step: 8, dur: 16 },
  swatches: [156, 174],
  voice: [196, 210],
  /** The waveform and timer run across this window. */
  talk: [204, 250],
  mic: [214, 232],
  page: [244, 260],
  title: [254, 268],
  /** Three sections: heading, a line, a print docking, and one kitchen stage wiping up. */
  sections: { a: 266, step: 27, dur: 26 },
  roller: [284, 304],
  pots: [312, 330],
  chips: [346, 356],
  sticker: [352, 366],
  ruth: [362, 380],
  kate: [370, 388],
  aud: [378, 390],
  readouts: [138, 178],
}

export const READ = {
  copy: [462, 498],
  arch: [466, 492],
  barrier: [480, 500],
  wall: { a: 496, step: 8, dur: 15 },
  medal: [508, 526],
  shoe: [538, 556],
  video: [548, 564],
  ring: [560, 618],
  lightbox: [568, 588],
  squad: { a: 584, step: 9, dur: 17 },
  banana: [590, 608],
  cowbell: [608, 626],
  reactions: [620, 638],
  comments: { a: 628, step: 11, dur: 16 },
  aud: [650, 662],
  readouts: [490, 530],
}

export const MAP = {
  copy: [734, 770],
  van: [742, 774],
  lighthouse: [752, 774],
  waymarker: [762, 780],
  /** The route draws across this window; pin k pops when the line reaches it. */
  route: [774, 850],
  pin: { a: 776, step: 14, dur: 12 },
  icecream: [798, 816],
  binoculars: [822, 840],
  flask: [842, 858],
  journey: [850, 868],
  aud: [860, 872],
  readouts: [768, 804],
  /** Beat B: the whole scene eases back and the route collapses into one pin. */
  back: [922, 948],
}

export const WORLD = {
  cut: 946,
  ghost: [938, 964],
  copy: [950, 982],
  map: [948, 988],
  home: [960, 976],
  cards: { a: 982, step: 13, dur: 18 },
  readouts: [988, 1018],
}

export const YEAR = {
  copy: [1114, 1150],
  tabs: { a: 1122, step: 2.4, dur: 14 },
  /** The four swaps: to Vacations, Projects, Milestones, then back to Birthdays. */
  steps: [1164, 1190, 1216, 1242],
  stepDur: 13,
  device: [1260, 1278],
  /** The view toggle flicks to Calendar, Map, Timeline, then back to the feed. */
  views: [1278, 1288, 1298, 1308],
  viewDur: 6,
  joe: [1314, 1330],
  ruth: [1320, 1336],
  aud: [1328, 1340],
  readouts: [1138, 1174],
}

export const OURS = {
  copy: [1414, 1448],
  assemble: [1418, 1494],
  tags: { a: 1490, step: 5, dur: 12 },
  console: [1508, 1524],
  /** The portrait shrinks into a white-bordered print. */
  shrink: [1578, 1614],
}

export const APP = {
  feed: [1594, 1638],
  copy: [1628, 1656],
  rail: { a: 1636, step: 7, dur: 14 },
}

export const END = {
  plate: [1722, 1766],
  copy: [1752, 1774],
}
