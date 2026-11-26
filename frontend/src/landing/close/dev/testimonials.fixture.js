// DEV ONLY layout fixture for close/Testimonials.jsx: loaded only when import.meta.env.DEV and
// the URL has ?testimonials=fixture. Never in a production bundle. Obviously not real people:
// real testimonials come only from content/testimonials.js, supplied by the business.
const P = (n, quote) => ({
  name: `Placeholder ${n}`,
  role: 'Layout test entry, not a member',
  quote,
  photo: null,
  src: 'dev fixture',
})

export const FIXTURE = [
  P('A', 'Placeholder quote. This card only proves the layout; a real member’s words go here.'),
  P('B', 'Second placeholder, a little longer, to show how a card with more words sits beside a shorter one in the same row.'),
  P('C', 'Third placeholder quote.'),
  P('D', 'Fourth placeholder. Real testimonials replace all of these, and only with the member’s permission.'),
  P('E', 'Fifth placeholder quote, of a middling length, for the second row.'),
  P('F', 'Sixth placeholder. Not a real person, not a real quote.'),
]
