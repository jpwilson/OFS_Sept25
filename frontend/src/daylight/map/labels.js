// What the map calls a stop (owner: MAP). Tiny and dependency-light, so the story page's
// chunk (which carries JourneyMap.jsx and the sketch, not the live map) can use it.
import { shortPlace } from '../lib/format.js'

/** A stop's short name: "Jenny Lake" from "Jenny Lake, Wyoming". '' for a photo point. */
export const stopName = (stop) => (stop?.name ? shortPlace(stop.name, 1) : '')
