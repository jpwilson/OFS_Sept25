// The story home page as marketing data (owner: F0), for llms-full.txt and the JSON-LD that
// scripts/prerender.mjs writes for "/" in the story variant. It keeps marketing.js's home
// title, description and path, and takes the h1, lede and text blocks from the landing's
// own content files, so crawlers and AI fetchers read what visitors read.
// In the classic variant nothing calls this and marketing.js's home is untouched.
import { HERO, SEO_BLOCKS as FILM } from './film.js'
import { SEO_BLOCKS as EXPLAIN } from './explain.js'
import { SEO_BLOCKS as PROOF } from './proof.js'
import { SEO_BLOCKS as CLOSE } from './close.js'

const h = (o) => `${o.before} ${o.mark}${o.after}`

/** Plain-text h1: the eyebrow and the display line, as the <h1> reads. */
export const STORY_H1 = `${HERO.eyebrow}. ${h(HERO.display)}`

/**
 * @param {object} home marketing.js's home page object
 * @returns {object} the same page with the story h1, lede and blocks
 */
export function storyHome(home) {
  const blocks = [...FILM, ...EXPLAIN, ...PROOF, ...CLOSE]
  return {
    ...home,
    h1: STORY_H1,
    lede: HERO.sub,
    // Until the packages publish their blocks, keep the existing home text so
    // llms-full.txt never shrinks.
    blocks: blocks.length ? blocks : home.blocks,
  }
}
