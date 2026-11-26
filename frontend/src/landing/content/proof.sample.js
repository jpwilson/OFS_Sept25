// proof package sample content (owner: proof). Sample data with digits lives here; the
// facts check skips *.sample.js. Everything here is shown under a visible sample label.
// Stops and coordinates match the capture fixtures (scripts/landing/fixtures/stories.mjs:14-19),
// so the drawn route and the real journey-map capture agree.

/** "A week on the coast path": the six stops, in order. */
export const COAST_STOPS = [
  { id: 'stives', name: 'St Ives harbour', lat: 50.2132, lng: -5.4786, day: 'Sat 8 Aug', time: '16:20', photo: 'photo-coast-harbour', caption: 'Ice-creams on the harbour wall' },
  { id: 'zennor', name: 'Zennor Head', lat: 50.1975, lng: -5.5735, day: 'Sun 9 Aug', time: '13:05', photo: 'cover-coast', caption: 'Round the head, the coast opens up' },
  { id: 'pendeen', name: 'Pendeen lighthouse', lat: 50.1653, lng: -5.672, day: 'Mon 10 Aug', time: '19:40', photo: 'photo-coast-van', caption: 'The van on its clifftop pitch' },
  { id: 'botallack', name: 'Botallack mine', lat: 50.1405, lng: -5.6869, day: 'Tue 11 Aug', time: '11:15', photo: 'photo-coast-mine', caption: "Ivy's day: forty questions" },
  { id: 'sennen', name: 'Sennen Cove', lat: 50.0767, lng: -5.7, day: 'Thu 13 Aug', time: '15:30', photo: 'photo-coast-beach', caption: 'Rest day, six hours of beach' },
  { id: 'porthcurno', name: 'Porthcurno', lat: 50.042, lng: -5.651, day: 'Fri 14 Aug', time: '20:10', photo: 'photo-coast-theatre', caption: 'A play in the cliff theatre' },
]

/** Feed cards for the category browser: the five sample stories with their capture ids. */
export const SAMPLE_CARDS = [
  { id: 'kitchen', shot: 'ui-card-kitchen', title: 'Six weeks without a kitchen', when: 'Feb 2026', by: 'Maya', categories: ['Projects'] },
  { id: 'marathon', shot: 'ui-card-race', title: "Dad's first marathon", when: 'Apr 2026', by: 'Tom', categories: ['Milestones'] },
  { id: 'coast', shot: 'ui-card-coast', title: 'A week on the coast path', when: 'Aug 2026', by: 'Maya', categories: ['Vacations'] },
  { id: 'ivy', shot: 'ui-card-year', title: 'Ivy turns nine', when: 'Oct 2026', by: 'Maya', categories: ['Birthdays'] },
  { id: 'joe', shot: 'ui-card-joe70', title: 'Grandpa Joe at seventy', when: 'Dec 2026', by: 'Tom', categories: ['Family Gatherings'] },
]

/** Sample tags in the coast story (Biscuit is a tag profile with no account). */
export const SAMPLE_TAGS = [
  { id: 'ivy', name: 'Ivy', note: 'Tagged', art: 'p-ivy-cake' },
  { id: 'leo', name: 'Leo', note: 'Tagged', art: 'p-leo-cheer' },
  { id: 'biscuit', name: 'Biscuit', note: 'Tag profile, no account', art: 'p-biscuit' },
]
