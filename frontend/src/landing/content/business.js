// Business figures and sentences (owner: the business, not the design).
//
// Everything in this file is SUPPLIED BY THE BUSINESS. None of it is derived from the code,
// unlike content/facts.js, whose every value points at the line that proves it. Change a
// number or a sentence here and the page changes; no layout file needs touching.
// check-facts.mjs skips this file by name for that reason.
// No invented quotes, names, press logos, ratings, awards or testimonials belong here.

const SRC = 'supplied by the owner, 2026-11-26'

export const BUSINESS = {
  members: { value: '1,000,000', src: SRC },
  membersWords: { value: 'a million', src: SRC },
  membersUnit: { value: 'members', src: SRC },
  milestoneHead: { value: { before: 'We just welcomed our', mark: 'millionth', after: 'member.' }, src: SRC },
  milestoneLine: {
    value: 'Like everyone before them, they chose to keep their life private from the world and share it with the people closest to them.',
    src: SRC,
  },
  joinLine: {
    value: 'Join more than {membersWords} people sharing with family and close friends, privately and ad-free.',
    src: SRC,
  },
}

/** A business value by id; {otherId} inside a string is filled from that entry. */
export function biz(id) {
  const v = BUSINESS[id].value
  return typeof v === 'string' ? v.replace(/\{(\w+)\}/g, (_, k) => BUSINESS[k].value) : v
}
