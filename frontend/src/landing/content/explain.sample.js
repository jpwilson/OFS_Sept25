// Explain package sample content (owner: explain). Made up for the illustration; every
// piece of it appears on the page under a visible SAMPLE label. Product numbers never live
// here: they come from facts.js / explain.facts.js through fact().

/** Difference: the generic social post drawn in CSS. */
export const POST_SAMPLE = {
  photo: 'photo-year-birthday',
  caption: 'Nine. Where did the time go.',
}

/**
 * Smart Import demo. A made-up camera roll, in time order, as the clusterer would see it.
 * Each segment is one run of photos between two breaks (Stage 1 of photo_clustering.py).
 *   zone   'home' | 'away'                (Stage 3)
 *   album  which album it ends up in      (Stages 4 and 5); 'unsorted' for orphans
 *   brk    why the break BEFORE it happened: 'long' (over the max gap) | 'moved' (venue change)
 *   when   short sample date for the axis label
 */
export const IMPORT_SEGMENTS = [
  { key: 'k1', album: 'kitchen', zone: 'home', when: 'SAT 14 FEB', photos: ['photo-kitchen-before', 'photo-kitchen-paint', 'photo-kitchen-tiling', 'photo-kitchen-camping', 'photo-kitchen-done', 'photo-kitchen-sledge', 'photo-kitchen-paint', 'photo-kitchen-tiling', 'photo-kitchen-done'] },
  { key: 'r1', album: 'race', zone: 'home', brk: 'long', when: 'SUN 26 APR', photos: ['photo-race-start', 'photo-race-chips', 'photo-race-mile20', 'photo-race-video', 'photo-race-finish', 'photo-race-start', 'photo-race-mile20', 'photo-race-finish', 'photo-race-chips'] },
  { key: 'r2', album: 'race', zone: 'home', brk: 'moved', when: 'SUN 26 APR', photos: ['photo-race-hug', 'photo-race-kids', 'photo-race-hug'] },
  { key: 'o1', album: 'unsorted', zone: 'home', brk: 'long', when: 'TUE 9 JUN', photos: ['photo-year-school', 'photo-year-school'] },
  { key: 'c1', album: 'coast', zone: 'away', brk: 'long', when: 'SAT 8 AUG', photos: ['photo-coast-harbour', 'photo-coast-van', 'photo-coast-harbour', 'photo-coast-beach'] },
  { key: 'c2', album: 'coast', zone: 'away', brk: 'long', when: 'SUN 9 AUG', photos: ['photo-coast-cliff', 'photo-coast-cliff', 'photo-coast-van', 'photo-coast-beach', 'photo-coast-cliff'] },
  { key: 'c3', album: 'coast', zone: 'away', brk: 'long', when: 'MON 10 AUG', photos: ['photo-coast-mine', 'photo-coast-mine', 'photo-coast-cliff', 'photo-coast-van'] },
  { key: 'c4', album: 'coast', zone: 'away', brk: 'long', when: 'TUE 11 AUG', photos: ['photo-coast-beach', 'photo-coast-beach', 'photo-coast-harbour', 'photo-coast-van', 'photo-coast-beach'] },
  { key: 'c5', album: 'coast', zone: 'away', brk: 'long', when: 'WED 12 AUG', photos: ['photo-coast-theatre', 'photo-coast-theatre', 'photo-coast-cliff'] },
  { key: 'c6', album: 'coast', zone: 'away', brk: 'long', when: 'THU 13 AUG', photos: ['photo-coast-van', 'photo-coast-harbour', 'photo-coast-beach', 'photo-coast-theatre'] },
  { key: 'b1', album: 'birthday', zone: 'home', brk: 'long', when: 'SAT 10 OCT', photos: ['photo-year-halloween', 'cover-birthday', 'photo-year-rocket', 'photo-year-birthday', 'photo-year-gala', 'cover-birthday', 'photo-year-rocket', 'photo-year-birthday'] },
]

/** Photos with no time taken (screenshots, saved downloads). Drawn as plain tiles. */
export const IMPORT_UNDATED = 3

/**
 * The albums the sample roll ends up as. Titles follow the app's title-hint templates
 * (photo_clustering.py:389-403); the place name is a sample.
 */
export const IMPORT_ALBUMS = {
  kitchen: { title: 'Saturday morning', evidence: 'FEB · 1 DAY · 9 PHOTOS · HOME' },
  race: { title: 'Sunday morning', evidence: 'APR · 1 DAY · 12 PHOTOS · HOME' },
  coast: { title: '6 days in St Ives', evidence: 'AUG · 6 DAYS · 25 PHOTOS · AWAY · 6 CHAPTERS' },
  birthday: { title: 'Saturday afternoon', evidence: 'OCT · 1 DAY · 8 PHOTOS · HOME' },
  unsorted: { title: 'Unsorted', evidence: '5 PHOTOS · NO TIME, OR ALONE' },
}

/** Create: the sample result chips are product behaviour; nothing sample is needed there. */
