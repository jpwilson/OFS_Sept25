// proof package sample content (owner: proof). Sample data with digits lives here; the
// facts check skips *.sample.js. Everything here is shown under a visible sample label.
// Stops and coordinates are ROUND2.md's (also the capture fixtures), so the drawn route and the
// real journey-map capture agree.

/** "A week on the Maine coast": the six stops, in order (coordinates from docs/landing/ROUND2.md). */
export const COAST_STOPS = [
  { id: 'portland', name: 'Portland Head Light', lat: 43.6231, lng: -70.2079, day: 'Sat, Aug 8', time: '4:20 PM', photo: 'photo-coast-cliff', caption: 'The first lighthouse of the week' },
  { id: 'camden', name: 'Camden harbor', lat: 44.2098, lng: -69.0648, day: 'Sun, Aug 9', time: '1:05 PM', photo: 'photo-coast-harbour', caption: 'Ice cream on the harbor wall' },
  { id: 'barharbor', name: 'Bar Harbor', lat: 44.3876, lng: -68.2039, day: 'Mon, Aug 10', time: '11:40 AM', photo: 'photo-coast-beach', caption: 'Leo and Biscuit meet the Atlantic' },
  { id: 'cadillac', name: 'Cadillac Mountain', lat: 44.3527, lng: -68.2251, day: 'Tue, Aug 11', time: '6:15 AM', photo: 'photo-coast-summit', caption: 'Pink granite at the top' },
  { id: 'jordan', name: 'Jordan Pond', lat: 44.32, lng: -68.254, day: 'Wed, Aug 12', time: '3:30 PM', photo: 'photo-coast-pond', caption: 'Skimming stones' },
  { id: 'bassharbor', name: 'Bass Harbor Head Light', lat: 44.222, lng: -68.3373, day: 'Fri, Aug 14', time: '7:50 PM', photo: 'photo-coast-van', caption: 'The van on its clifftop pitch' },
]

/** Feed cards for the category browser: the eight sample stories with their capture ids, in page order. */
export const SAMPLE_CARDS = [
  { id: 'coast', shot: 'ui-card-coast', title: 'A week on the Maine coast', when: 'Aug 2026', by: 'Maya', categories: ['Vacations'] },
  { id: 'tetons', shot: 'ui-card-tetons', title: 'Seven days in the Tetons', when: 'Jun 2026', by: 'Tom', categories: ['Vacations'] },
  { id: 'maui', shot: 'ui-card-maui', title: 'Spring break in Maui', when: 'Mar 2026', by: 'Maya', categories: ['Vacations'] },
  { id: 'wedding', shot: 'ui-card-wedding', title: 'Kate and Marcus get married', when: 'May 2026', by: 'Maya', categories: ['Wedding'] },
  { id: 'kitchen', shot: 'ui-card-kitchen', title: 'Six weeks without a kitchen', when: 'Feb 2026', by: 'Maya', categories: ['Projects'] },
  { id: 'marathon', shot: 'ui-card-race', title: "Dad's first marathon", when: 'Oct 2026', by: 'Tom', categories: ['Milestones'] },
  { id: 'ivy', shot: 'ui-card-year', title: 'Ivy turns nine', when: 'Nov 2026', by: 'Maya', categories: ['Birthdays'] },
  { id: 'joe', shot: 'ui-card-joe70', title: 'Grandpa Joe at seventy', when: 'Dec 2026', by: 'Tom', categories: ['Family Gatherings'] },
]

/** The family's own category, made in the app's category picker. */
export const OWN_CATEGORY = 'Wedding'

/** Sample tags in the coast story (Biscuit is a tag profile with no account). */
export const SAMPLE_TAGS = [
  { id: 'ivy', name: 'Ivy', note: 'Tagged', art: 'p-ivy-cake' },
  { id: 'leo', name: 'Leo', note: 'Tagged', art: 'p-leo-cheer' },
  { id: 'biscuit', name: 'Biscuit', note: 'Tag profile, no account', art: 'p-biscuit' },
]
