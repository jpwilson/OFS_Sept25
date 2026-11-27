// What the family page says about people (owner: FAMILY). Plain functions, American English,
// confident and warm (docs/landing/ROUND4.md section 1). A relationship word is always the
// word as stored; only its case changes inside a sentence.

/** "Tom's", "James's". */
export const possessive = (first) => `${first}${/s$/i.test(first) ? "'s" : "'s"}`

/** The word as it reads mid-sentence: "mother-in-law" (stored words are kept, lowercased). */
export const inSentence = (word) => String(word || '').trim().toLowerCase()

/** "your husband", or "" when there is no word. */
export const yourWord = (word) => (inSentence(word) ? `your ${inSentence(word)}` : '')

/** The accessible name of a face: "Tom Hartley, your husband, waiting to confirm". */
export function nameFor(structure, id) {
  const p = structure.people.get(id)
  if (!p) return ''
  if (id === structure.me) return `${p.name}, you`
  const parts = [p.name]
  if (yourWord(p.word)) parts.push(yourWord(p.word))
  if (p.kind === 'tag') parts.push('tag profile, no account')
  if (p.status === 'asked') parts.push('waiting to confirm')
  return parts.join(', ')
}

/** "10 people · 3 generations" (the header's count line). */
export function countLine(structure) {
  const n = structure.count
  const g = structure.generations
  return `${n} ${n === 1 ? 'person' : 'people'} · ${g} ${g === 1 ? 'generation' : 'generations'}`
}
