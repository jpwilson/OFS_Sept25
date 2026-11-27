// Daylight tokens as JS values (owner: F0), for places CSS variables cannot reach: the
// MapLibre style, SVG sketches, canvas, docs/app/tokens.json and the iOS port.
// Keep in step with tokens.css (same names without the --a- prefix).
// Plain data: no JSX, no browser globals, explicit extensions (Node scripts import this).

export const COLOR = {
  ink: '#101B3B',
  paper: '#F4F7FB',
  paperDeep: '#E3E9F2',
  white: '#FFFFFF',
  line: 'rgba(16,27,59,0.14)',
  lineStrong: 'rgba(16,27,59,0.28)',
  mute: 'rgba(16,27,59,0.66)',
}

/** Each wash: base, deep (pressed, floors), tint (quiet backgrounds). Text on all of them is ink. */
export const WASH = {
  tide: { base: '#19CFC7', deep: '#0FB8B1', tint: '#D1F5F3' },
  azure: { base: '#3AA8FF', deep: '#1F93F0', tint: '#D8EDFF' },
  fizz: { base: '#FF62C4', deep: '#F247AF', tint: '#FFDDF2' },
  zest: { base: '#FF8A1F', deep: '#F27405', tint: '#FFE5CC' },
  lime: { base: '#C6F135', deep: '#AEDB1C', tint: '#F1FBD0' },
  sun: { base: '#FFD43B', deep: '#F2C21C', tint: '#FFF4CC' },
  violet: { base: '#A98BFF', deep: '#8F6CF5', tint: '#ECE5FF' },
}
export const WASH_NAMES = Object.keys(WASH)

/** Each destination owns one wash (PLAN-DAYLIGHT 1). */
export const DEST_WASH = { stories: 'tide', map: 'azure', new: 'fizz', family: 'lime', you: 'zest' }

/** Day colours for routes and day chips, in turn. */
export const DAY_WASHES = ['azure', 'fizz', 'lime', 'zest', 'violet', 'tide', 'sun']

/** Category dots. Keys are the app's stored category values. */
export const CATEGORY_WASH = {
  Birthday: 'fizz', Anniversary: 'violet', Vacation: 'azure', 'Family Gathering': 'zest',
  Holiday: 'sun', Project: 'lime', 'Daily Life': 'tide', Milestone: 'violet',
}

export const FONT = {
  ui: "'OFSL Bricolage', 'OFSL Bricolage Fallback', system-ui, -apple-system, 'Segoe UI', sans-serif",
  story: "'OFSL Literata', 'OFSL Literata Fallback', Georgia, 'Times New Roman', serif",
  mono: "'OFSL DM Mono', 'OFSL DM Mono Fallback', ui-monospace, 'SF Mono', Menlo, monospace",
}

export const RADIUS = { button: 14, card: 20, readout: 12, sticker: 6, sheet: 24, pill: 999 }
export const SHADOW = { sm: '3px 3px 0 #101B3B', md: '4px 4px 0 #101B3B', lg: '6px 6px 0 #101B3B' }
export const LAYOUT = { bar: 64, barPhone: 52, tab: 64, target: 44, gutterPhone: 16, desktopFrom: 900, max: 1240 }
export const MOTION = { dur: 200, ease: 'cubic-bezier(0.16, 1, 0.3, 1)', pop: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }

/** Deterministic wash for a person or anything with a stable key. */
export function washFor(key) {
  const s = String(key || '')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return WASH_NAMES[h % WASH_NAMES.length]
}
