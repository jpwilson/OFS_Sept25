// Day colours for routes, discs and chips (owner: MAP). Washes in turn: azure fizz lime
// zest violet tide sun. A module of its own so route.js and RouteSketch.jsx can both use it.
import { DAY_WASHES, WASH } from '../styles/tokens.js'

export function dayColor(i) {
  return WASH[DAY_WASHES[((i % DAY_WASHES.length) + DAY_WASHES.length) % DAY_WASHES.length]].base
}
