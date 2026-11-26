// parseStory and buildJourney under Node, for the book scripts and tests (dev only).
// Installs the tiny DOM as DOMParser and swaps utils/sanitizeHtml.js (DOMPurify needs a real
// browser DOM) for a pass-through. The sample stories are our own fixtures, and
// check-parser.mjs proves that the blocks match parseStory in Chromium with DOMPurify on.
import { register } from 'node:module'
import { DOMParser } from './minidom.mjs'

register(new URL('./node-hooks.mjs', import.meta.url))
if (typeof globalThis.DOMParser === 'undefined') globalThis.DOMParser = DOMParser

const { parseStory } = await import('../../../../src/daylight/lib/storyBlocks.js')
const { buildJourney } = await import('../../../../src/daylight/lib/journey.js')
export { parseStory, buildJourney }
