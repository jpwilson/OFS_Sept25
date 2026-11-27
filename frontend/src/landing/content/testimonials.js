// Testimonials (owner: the business). SUPPLIED BY THE BUSINESS from real members who agreed
// to be quoted. Never invented: nobody on the build writes a customer, a name, a quote or a
// customer photo. A testimonial is only ever a real person's own words.
//
// Shape of each entry:
//   {
//     name:  'Jane',                       // first name, as the member agreed
//     role:  'Grandmother of four, Ohio',  // a few words about them
//     quote: 'Their own words, unedited.',
//     photo: 'photo-member-jane',          // an art manifest id, or null for an initial
//     src:   'email consent, 2026-12-01',  // where and when they agreed to be quoted
//   }
//
// Entries render as testimonial cards under the "Why Our Family Socials" head
// (close/Testimonials.jsx, mounted by close/Compare.jsx). While the list is empty nothing
// renders and the section closes up.
export const TESTIMONIALS = []
