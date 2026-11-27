// Dev only: ?links=preview (owner: FAMILY). docs/app/FAMILY.md section 6.
// Feeds arrange the sample truth graph's links among the signed-in person's relatives, to show
// what a Stage-2 endpoint (GET /relationships/family, section 8) would let the tree draw.
// Imported lazily, and only when ONLY_ENABLED (development and sample builds), so production
// never ships it or the fixtures.
import { HARTLEYS, LARGE, truthLinks } from '../fixtures.js'

/** Links for `user` from whichever sample family they belong to; [] when they are not in one. */
export function previewLinks(user, { relationships = [], tags = [] } = {}) {
  const large = relationships.some((r) => r.other_user_id >= 100) || tags.some((t) => t.id >= 200)
  const truth = large ? LARGE : HARTLEYS
  const viewer = Object.keys(truth.people).find((k) => truth.people[k].user === user?.id)
  return viewer ? truthLinks(truth, viewer) : []
}
