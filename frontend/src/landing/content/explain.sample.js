// Explain package sample content (owner: explain). Made up for the illustration; every
// piece of it appears on the page under a visible SAMPLE label. Product numbers never live
// here: they come from facts.js / explain.facts.js through fact().

/** Difference: the generic social post drawn in CSS. */
export const POST_SAMPLE = {
  photo: 'photo-year-birthday',
  caption: 'Nine. Where did the time go.',
}

/**
 * Smart Import demo. A made-up camera roll from a family in Madison, Wisconsin, in time
 * order, as the clusterer would see it. Each segment is one run of photos between two
 * breaks (Stage 1 of photo_clustering.py).
 *   zone   'home' | 'away'                (Stage 3)
 *   album  which album it ends up in      (Stages 4 and 5); 'unsorted' for orphans
 *   brk    why the break BEFORE it happened: 'long' (over the max gap) | 'moved' (venue change)
 *   when   short sample date for the axis label (weekdays are right for 2026)
 * Home wins the day count (photo_clustering.py:216-240): four home days against at most
 * two in any one cell along the Maine coast, so Madison is home and the coast is away.
 */
export const IMPORT_SEGMENTS = [
  { key: 'w1', album: 'weekend', zone: 'away', when: 'SAT MAY 16', photos: ['photo-wedding-ready', 'photo-wedding-aisle', 'photo-wedding-vows', 'photo-wedding-confetti'] },
  { key: 'w2', album: 'weekend', zone: 'away', brk: 'long', when: 'SUN MAY 17', photos: ['photo-wedding-family', 'photo-wedding-speech', 'photo-wedding-dance', 'photo-wedding-sparklers'] },
  { key: 'o1', album: 'unsorted', zone: 'home', brk: 'long', when: 'TUE JUN 9', photos: ['photo-year-school'] },
  { key: 'o2', album: 'unsorted', zone: 'home', brk: 'long', when: 'THU JUN 11', photos: ['photo-year-gala'] },
  { key: 'c1', album: 'coast', zone: 'away', brk: 'long', when: 'SAT AUG 8', photos: ['photo-coast-harbour', 'photo-coast-van', 'photo-coast-harbour', 'photo-coast-beach'] },
  { key: 'c2', album: 'coast', zone: 'away', brk: 'long', when: 'SUN AUG 9', photos: ['photo-coast-cliff', 'photo-coast-cliff', 'photo-coast-van', 'photo-coast-beach', 'photo-coast-cliff'] },
  { key: 'c3', album: 'coast', zone: 'away', brk: 'long', when: 'MON AUG 10', photos: ['photo-coast-summit', 'photo-coast-summit', 'photo-coast-cliff', 'photo-coast-van'] },
  { key: 'c4', album: 'coast', zone: 'away', brk: 'long', when: 'TUE AUG 11', photos: ['photo-coast-beach', 'photo-coast-beach', 'photo-coast-harbour', 'photo-coast-van', 'photo-coast-beach'] },
  { key: 'c5', album: 'coast', zone: 'away', brk: 'long', when: 'WED AUG 12', photos: ['photo-coast-pond', 'photo-coast-pond', 'photo-coast-cliff'] },
  { key: 'c6', album: 'coast', zone: 'away', brk: 'long', when: 'THU AUG 13', photos: ['photo-coast-van', 'photo-coast-harbour', 'photo-coast-beach', 'photo-coast-beach'] },
  { key: 'r1', album: 'race', zone: 'home', brk: 'long', when: 'SUN OCT 18', photos: ['photo-race-start', 'photo-race-chips', 'photo-race-mile20', 'photo-race-video', 'photo-race-finish', 'photo-race-start', 'photo-race-mile20', 'photo-race-finish', 'photo-race-chips'] },
  { key: 'r2', album: 'race', zone: 'home', brk: 'moved', when: 'SUN OCT 18', photos: ['photo-race-hug', 'photo-race-kids', 'photo-race-hug'] },
  { key: 'b1', album: 'birthday', zone: 'home', brk: 'long', when: 'SAT NOV 14', photos: ['photo-year-halloween', 'cover-birthday', 'photo-year-rocket', 'photo-year-birthday', 'photo-year-gala', 'cover-birthday', 'photo-year-rocket', 'photo-year-birthday'] },
]

/** Photos with no time taken (screenshots, saved downloads). Drawn as plain tiles. */
export const IMPORT_UNDATED = 3

/**
 * The albums the sample roll ends up as, in card order. Titles follow the app's title-hint
 * templates (photo_clustering.py:389-403); the place names are samples, matching the
 * ui-import-albums capture where the same album appears there.
 */
export const IMPORT_ALBUMS = {
  coast: { title: '6 days in Bar Harbor', evidence: 'AUG · 6 DAYS · 25 PHOTOS · AWAY · 6 CHAPTERS', trip: true },
  weekend: { title: 'Weekend in Highland', evidence: 'MAY · 2 DAYS · 8 PHOTOS · AWAY', trip: true },
  birthday: { title: 'Saturday afternoon', evidence: 'NOV · 1 DAY · 8 PHOTOS · HOME' },
  race: { title: 'Sunday morning', evidence: 'OCT · 1 DAY · 12 PHOTOS · HOME' },
  unsorted: { title: 'Unsorted', evidence: '5 PHOTOS · NO TIME, OR ALONE' },
}

/** How many photos the sample picker selects: every photo in the sample roll, counted, never typed. */
export const IMPORT_PICKED = IMPORT_SEGMENTS.reduce((n, s) => n + s.photos.length, 0) + IMPORT_UNDATED
