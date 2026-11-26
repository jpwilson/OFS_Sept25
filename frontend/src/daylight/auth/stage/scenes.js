// Each auth screen's wash, ghost word and cast (owner: AUTH). AUTH.md decision 11, the table.
// Art is looked up by manifest id (src/landing/art/manifest.json), never by path.
//   h: height relative to the layout's cast height     side: where it stands beside the card
//   phone: shown on a phone (one idea per screen: one figure or group)
//   prop: an object, not a person (floats a little above the floor when `lift` is set)

export const SCENES = {
  login: {
    wash: 'tide',
    ghost: 'hello',
    cast: [
      { id: 'p-ruth-wave', h: 0.9, side: 'left' },
      { id: 'g-family-hero', h: 1, side: 'left', phone: true },
      { id: 'p-joe-wave', h: 0.93, side: 'right' },
    ],
  },
  signup: {
    wash: 'sun',
    ghost: 'yours',
    cast: [
      { id: 'g-kids-biscuit', h: 0.6, side: 'left' },
      { id: 'p-maya-tada', h: 1, side: 'right', phone: true },
      { id: 'prop-balloons', h: 0.46, side: 'right', prop: true, lift: 0.55 },
    ],
  },
  inbox: {
    wash: 'sun',
    ghost: 'inbox',
    cast: [
      { id: 'p-maya-phone', h: 0.95, side: 'left' },
      { id: 'p-joe-phone', h: 1, side: 'right', phone: true },
    ],
  },
  reset: {
    wash: 'azure',
    ghost: 'back',
    cast: [
      { id: 'p-ruth-tablet', h: 1, side: 'right', phone: true },
      { id: 'p-biscuit', h: 0.42, side: 'right' },
    ],
  },
  opening: {
    wash: 'tide',
    ghost: 'hello',
    cast: [
      { id: 'p-ruth-wave', h: 0.9, side: 'left' },
      { id: 'g-family-hero', h: 1, side: 'left', phone: true },
      { id: 'p-joe-wave', h: 0.93, side: 'right' },
    ],
  },
  firstRun: {
    wash: 'fizz',
    ghost: 'you',
    cast: [
      { id: 'p-ivy-cheer', h: 0.86, side: 'left', phone: true },
      { id: 'p-biscuit', h: 0.42, side: 'right' },
      { id: 'p-leo-cheer', h: 0.72, side: 'right', phone: true },
    ],
  },
  welcome: {
    wash: 'sun',
    ghost: 'welcome',
    cast: [
      { id: 'p-ruth-wave', h: 0.9, side: 'left' },
      { id: 'g-family-hero', h: 1, side: 'left', phone: true },
      { id: 'p-joe-wave', h: 0.93, side: 'right' },
      { id: 'prop-confetti', h: 0.42, side: 'right', prop: true, lift: 0.7 },
    ],
  },
  invite: {
    wash: 'lime',
    ghost: 'join',
    cast: [
      { id: 'prop-present', h: 0.34, side: 'left', prop: true, phone: true },
      { id: 'prop-balloons', h: 0.6, side: 'right', prop: true, lift: 0.3 },
    ],
  },
  demo: { wash: 'violet', ghost: 'demo', cast: [{ id: 'g-kids-rocket', h: 0.9, side: 'right', phone: true }] },
}

/** The screen Google or an email link returns to keeps the wash of the screen it left. */
export function sceneWithWash(name, wash) {
  const s = SCENES[name]
  return wash && wash !== s.wash ? { ...s, wash } : s
}
