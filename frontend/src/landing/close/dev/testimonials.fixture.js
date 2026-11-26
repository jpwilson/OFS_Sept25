// DEV ONLY layout fixture for close/Love.jsx: loaded only when import.meta.env.DEV and the
// URL has ?testimonials=fixture. Never in a production bundle. Obviously not real people.
export const FIXTURE = [
  {
    name: 'Placeholder A',
    role: 'Layout test entry, not a member',
    quote: 'Placeholder quote. This card only proves the layout; a real member’s words go here.',
    photo: null,
    src: 'dev fixture',
  },
  {
    name: 'Placeholder B',
    role: 'Layout test entry, not a member',
    quote: 'Second placeholder quote, a little longer, to show how two cards sit side by side above the reasons.',
    photo: null,
    src: 'dev fixture',
  },
]
