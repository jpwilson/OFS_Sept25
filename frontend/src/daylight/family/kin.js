// Relationship words (owner: FAMILY). docs/app/FAMILY.md section 2, "Words".
// Pure ESM: no DOM, no JSX, explicit extensions, so `node --test` runs it.
//
//   readWord(raw) -> {raw, word, known, kind, row, greats, group, tray, pet, parentRank, needs}
//   TYPES                    the 35 words GET /relationships/types returns, in its order
//   COMMON                   the eight offered first when you add someone
//   TYPE_GROUPS              all 35, grouped, for the Add sheet
//   reverseOf(word) -> {words, suggest}   what they would call you
//   LIST_GROUPS              the list view's groups, in order
//   TRAYS                    tray keys and captions
//
// A word is normalised (lowercase, spaces collapsed, "(pending approval)" dropped, "in law",
// "great grand", "half sister" hyphenated, "step mother" joined, synonyms mapped) and then
// matched EXACTLY. Never by substring: "godmother" is not a mother, "stepson" is not a son.
// The label printed under a face is always the word as stored, never this normalised form.

/** The relationship types the backend accepts (backend/app/schemas/user_relationship.py). */
export const TYPES = [
  'wife', 'husband',
  'daughter', 'son', 'child',
  'mother', 'father', 'parent',
  'sister', 'brother', 'sibling',
  'grandmother', 'grandfather', 'grandparent',
  'granddaughter', 'grandson', 'grandchild',
  'aunt', 'uncle',
  'niece', 'nephew',
  'cousin',
  'mother-in-law', 'father-in-law',
  'daughter-in-law', 'son-in-law',
  'sister-in-law', 'brother-in-law',
  'stepmother', 'stepfather',
  'stepdaughter', 'stepson',
  'friend',
  'pet', 'pet owner',
]

/** Offered first in the Add sheet. */
export const COMMON = ['wife', 'husband', 'daughter', 'son', 'mother', 'father', 'sister', 'brother']

/** All 35, grouped in family words (the Add sheet's "More words"). */
export const TYPE_GROUPS = [
  { label: 'Partner', words: ['wife', 'husband'] },
  { label: 'Children', words: ['daughter', 'son', 'child'] },
  { label: 'Parents', words: ['mother', 'father', 'parent'] },
  { label: 'Siblings', words: ['sister', 'brother', 'sibling'] },
  { label: 'Grandparents', words: ['grandmother', 'grandfather', 'grandparent'] },
  { label: 'Grandchildren', words: ['granddaughter', 'grandson', 'grandchild'] },
  { label: 'Aunts and uncles', words: ['aunt', 'uncle'] },
  { label: 'Nieces and nephews', words: ['niece', 'nephew'] },
  { label: 'Cousins', words: ['cousin'] },
  { label: 'In-laws', words: ['mother-in-law', 'father-in-law', 'daughter-in-law', 'son-in-law', 'sister-in-law', 'brother-in-law'] },
  { label: 'Step family', words: ['stepmother', 'stepfather', 'stepdaughter', 'stepson'] },
  { label: 'Friends and pets', words: ['friend', 'pet', 'pet owner'] },
]

// kind: how the arrangement treats the word. row: generation relative to the person the word
// is about ("A is B's mother": A sits one row above B). tray: where an unplaced one waits.
const K = (kind, row, group, extra = {}) => ({ kind, row, group, ...extra })
const TABLE = {
  wife: K('partner', 0, 'partner'),
  husband: K('partner', 0, 'partner'),
  partner: K('partner', 0, 'partner'),

  father: K('parent', -1, 'parents', { parentRank: 0 }),
  mother: K('parent', -1, 'parents', { parentRank: 1 }),
  parent: K('parent', -1, 'parents', { parentRank: 2 }),
  'pet owner': K('parent', -1, 'parents', { parentRank: 2, petOwner: true }),
  stepfather: K('stepParent', -1, 'parents', { needs: 'mother', tray: 'step-parents', parentRank: 0 }),
  stepmother: K('stepParent', -1, 'parents', { needs: 'father', tray: 'step-parents', parentRank: 1 }),
  stepparent: K('stepParent', -1, 'parents', { tray: 'step-parents', parentRank: 2 }),

  sister: K('sibling', 0, 'siblings'),
  brother: K('sibling', 0, 'siblings'),
  sibling: K('sibling', 0, 'siblings'),
  'half-sister': K('halfStep', 0, 'siblings', { tray: 'half-and-step' }),
  'half-brother': K('halfStep', 0, 'siblings', { tray: 'half-and-step' }),
  'half-sibling': K('halfStep', 0, 'siblings', { tray: 'half-and-step' }),
  stepsister: K('halfStep', 0, 'siblings', { tray: 'half-and-step' }),
  stepbrother: K('halfStep', 0, 'siblings', { tray: 'half-and-step' }),
  stepsibling: K('halfStep', 0, 'siblings', { tray: 'half-and-step' }),

  daughter: K('child', 1, 'children'),
  son: K('child', 1, 'children'),
  child: K('child', 1, 'children'),
  pet: K('child', 1, 'pets', { pet: true }),
  stepdaughter: K('stepChild', 1, 'children', { tray: 'stepchildren' }),
  stepson: K('stepChild', 1, 'children', { tray: 'stepchildren' }),
  stepchild: K('stepChild', 1, 'children', { tray: 'stepchildren' }),

  'father-in-law': K('parentInLaw', -1, 'inlaws', { tray: 'parents-in-law', parentRank: 0 }),
  'mother-in-law': K('parentInLaw', -1, 'inlaws', { tray: 'parents-in-law', parentRank: 1 }),
  'parent-in-law': K('parentInLaw', -1, 'inlaws', { tray: 'parents-in-law', parentRank: 2 }),
  'sister-in-law': K('siblingInLaw', 0, 'inlaws', { tray: 'in-laws' }),
  'brother-in-law': K('siblingInLaw', 0, 'inlaws', { tray: 'in-laws' }),
  'sibling-in-law': K('siblingInLaw', 0, 'inlaws', { tray: 'in-laws' }),
  'daughter-in-law': K('childInLaw', 1, 'inlaws', { tray: 'children-in-law' }),
  'son-in-law': K('childInLaw', 1, 'inlaws', { tray: 'children-in-law' }),
  'child-in-law': K('childInLaw', 1, 'inlaws', { tray: 'children-in-law' }),

  grandfather: K('grandparent', -2, 'grandparents', { tray: 'grandparents', greatable: -1, parentRank: 0 }),
  grandmother: K('grandparent', -2, 'grandparents', { tray: 'grandparents', greatable: -1, parentRank: 1 }),
  grandparent: K('grandparent', -2, 'grandparents', { tray: 'grandparents', greatable: -1, parentRank: 2 }),
  granddaughter: K('grandchild', 2, 'grandchildren', { tray: 'grandchildren', greatable: 1 }),
  grandson: K('grandchild', 2, 'grandchildren', { tray: 'grandchildren', greatable: 1 }),
  grandchild: K('grandchild', 2, 'grandchildren', { tray: 'grandchildren', greatable: 1 }),

  aunt: K('auntUncle', -1, 'aunts', { tray: 'aunts-and-uncles', greatable: -1 }),
  uncle: K('auntUncle', -1, 'aunts', { tray: 'aunts-and-uncles', greatable: -1 }),
  niece: K('nieceNephew', 1, 'nieces', { tray: 'nieces-and-nephews', greatable: 1 }),
  nephew: K('nieceNephew', 1, 'nieces', { tray: 'nieces-and-nephews', greatable: 1 }),
  cousin: K('cousin', 0, 'cousins', { tray: 'cousins' }),

  friend: K('friend', null, 'friends'),
  'best friend': K('friend', null, 'friends'),
  'close friend': K('friend', null, 'friends'),
  'good friend': K('friend', null, 'friends'),
  'old friend': K('friend', null, 'friends'),
  'family friend': K('friend', null, 'friends'),
  'childhood friend': K('friend', null, 'friends'),
}

// Exact synonyms only (FAMILY.md: mom and mum, dad, grandma, nana, granny, grandpa, granddad,
// spouse, partner, fiancé(e), dog, cat).
const SYNONYMS = {
  mom: 'mother', mum: 'mother',
  dad: 'father',
  grandma: 'grandmother', nana: 'grandmother', granny: 'grandmother',
  grandpa: 'grandfather', granddad: 'grandfather', grandad: 'grandfather',
  spouse: 'partner', fiance: 'partner', 'fiancé': 'partner', fiancee: 'partner', 'fiancée': 'partner',
  dog: 'pet', cat: 'pet',
  stepmom: 'stepmother', stepmum: 'stepmother', stepdad: 'stepfather',
}

/** Lowercase, collapse, hyphenate and join; the greats counted apart. */
export function normalise(raw) {
  let w = String(raw ?? '')
    .toLowerCase()
    .replace(/\(pending approval\)/g, ' ')
    .replace(/[\s ]+/g, ' ')
    .trim()
  if (!w) return { word: '', greats: 0 }
  w = w
    .replace(/\s*-\s*/g, '-')
    .replace(/[ -]in[ -]law$/, '-in-law')
    .replace(/\bgreat[ -]+/g, 'great-')
    .replace(/^half[ -]+/, 'half-')
    .replace(/^step[ -]+(?=[a-z])/, 'step')
  let greats = 0
  while (w.startsWith('great-')) {
    greats += 1
    w = w.slice(6)
  }
  if (SYNONYMS[w]) w = SYNONYMS[w]
  return { word: w, greats }
}

/**
 * Everything the tree needs to know about one stored word.
 * Unknown, empty and "other" words come back as kind 'other' (the shelf, word as written).
 */
export function readWord(raw) {
  const { word, greats } = normalise(raw)
  const base = TABLE[word]
  const known = !!base && (greats === 0 || base.greatable != null)
  if (!known) {
    return { raw: raw ?? '', word, known: false, kind: 'other', row: null, greats: 0, group: 'more', tray: null, pet: false, petOwner: false, parentRank: 2, needs: null }
  }
  const row = base.row == null ? null : base.row + greats * (base.greatable || 0)
  return {
    raw: raw ?? '',
    word,
    known: true,
    kind: base.kind,
    row,
    greats,
    group: base.group,
    tray: base.tray || null,
    pet: !!base.pet,
    petOwner: !!base.petOwner,
    parentRank: base.parentRank ?? 2,
    needs: base.needs || null,
  }
}

/** Kinds that are drawn with lines whenever the rules allow (no link needed). */
export const ALWAYS_DRAWN = new Set(['partner', 'parent', 'sibling', 'child'])

/**
 * Tray captions in family words, by key. A tray in a farther row adds "Great-" once per row
 * (Great-grandparents), as the rows say.
 */
export const TRAYS = {
  'step-parents': 'Step-parents',
  'half-and-step': 'Half and step family',
  stepchildren: 'Stepchildren',
  'parents-in-law': 'Parents-in-law',
  grandparents: 'Grandparents',
  'aunts-and-uncles': 'Aunts and uncles',
  cousins: 'Cousins',
  'in-laws': 'In-laws',
  'children-in-law': 'In-laws',
  'nieces-and-nephews': 'Nieces and nephews',
  grandchildren: 'Grandchildren',
}

/** The caption for a tray in a row (great-prefixed beyond its home row). */
export function trayCaption(key, row) {
  const base = TRAYS[key] || 'Family'
  const home = { grandparents: -2, grandchildren: 2, 'aunts-and-uncles': -1, 'nieces-and-nephews': 1 }[key]
  if (home == null || row === home) return base
  const n = Math.abs(row - home)
  const great = `Great-${'great-'.repeat(n - 1)}`
  if (key === 'aunts-and-uncles') return `${great}aunts and uncles`
  if (key === 'nieces-and-nephews') return `${great}nieces and nephews`
  return `${great}${base.toLowerCase()}`
}

/** The list view's groups, in order (FAMILY.md section 4). */
export const LIST_GROUPS = [
  { key: 'asking', label: 'Asking to join' },
  { key: 'partner', label: 'Partner' },
  { key: 'children', label: 'Children' },
  { key: 'parents', label: 'Parents' },
  { key: 'siblings', label: 'Siblings' },
  { key: 'grandchildren', label: 'Grandchildren' },
  { key: 'grandparents', label: 'Grandparents' },
  { key: 'inlaws', label: 'In-laws' },
  { key: 'aunts', label: 'Aunts and uncles' },
  { key: 'nieces', label: 'Nieces and nephews' },
  { key: 'cousins', label: 'Cousins' },
  { key: 'pets', label: 'Pets' },
  { key: 'friends', label: 'Friends' },
  { key: 'more', label: 'More' },
  { key: 'waiting', label: 'Waiting to confirm' },
]

// What the other person would call you, for each word you might choose for them. `suggest`
// is chosen only when one word fits everyone (no guessing anyone's gender).
const REVERSE = {
  partner: { words: ['wife', 'husband'] },
  parent: { words: ['daughter', 'son', 'child'], suggest: 'child' },
  child: { words: ['mother', 'father', 'parent'], suggest: 'parent' },
  sibling: { words: ['sister', 'brother', 'sibling'], suggest: 'sibling' },
  grandparent: { words: ['granddaughter', 'grandson', 'grandchild'], suggest: 'grandchild' },
  grandchild: { words: ['grandmother', 'grandfather', 'grandparent'], suggest: 'grandparent' },
  auntUncle: { words: ['niece', 'nephew'] },
  nieceNephew: { words: ['aunt', 'uncle'] },
  cousin: { words: ['cousin'], suggest: 'cousin' },
  parentInLaw: { words: ['daughter-in-law', 'son-in-law'] },
  childInLaw: { words: ['mother-in-law', 'father-in-law'] },
  siblingInLaw: { words: ['sister-in-law', 'brother-in-law'] },
  stepParent: { words: ['stepdaughter', 'stepson'] },
  stepChild: { words: ['stepmother', 'stepfather'] },
  friend: { words: ['friend'], suggest: 'friend' },
}

/** {words, suggest}: the words they might use for you, and the one to preselect (or null). */
export function reverseOf(word) {
  const w = normalise(word).word
  if (w === 'pet') return { words: ['pet owner'], suggest: 'pet owner' }
  if (w === 'pet owner') return { words: ['pet'], suggest: 'pet' }
  const info = readWord(word)
  const r = REVERSE[info.kind]
  if (!r) return { words: [], suggest: null }
  return { words: r.words, suggest: r.suggest || null }
}

/** "Mother-in-law" from "mother-in-law"; words as stored keep their own spelling otherwise. */
export function capitalise(word) {
  const w = String(word || '')
  return w ? w[0].toUpperCase() + w.slice(1) : w
}
