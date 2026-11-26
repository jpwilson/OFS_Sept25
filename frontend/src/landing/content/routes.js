// Every link the landing makes (owner: F0). Plain <a href> paths: no router on the landing.
// These are the app's existing routes; the landing never invents one.

export const ROUTES = {
  home: '/',
  signup: '/login?signup=true',
  login: '/login',
  pricing: '/pricing',
  faq: '/faq',
  features: '/features',
  about: '/about',
  alternatives: '/alternatives',
  compare: [
    { href: '/compare/facebook-groups', label: 'vs private Facebook groups', name: 'Facebook groups' },
    { href: '/compare/tinybeans', label: 'vs Tinybeans', name: 'Tinybeans' },
    { href: '/compare/familyalbum', label: 'vs FamilyAlbum', name: 'FamilyAlbum' },
    { href: '/compare/private-instagram', label: 'vs a private Instagram account', name: 'A private Instagram' },
    { href: '/compare/how-to-share-photos-privately', label: "How to share kids' photos privately", name: 'Sharing privately' },
  ],
  privacy: '/privacy',
  terms: '/terms',
  contact: '/contact',
}

/** Section ids, in page order (SPEC "Page order"). Hash links use these. */
export const SECTION_IDS = {
  film: 'lp-film',
  difference: 'lp-difference',
  how: 'lp-how',
  create: 'lp-create',
  import: 'lp-import',
  anatomy: 'lp-anatomy',
  places: 'lp-places',
  views: 'lp-views',
  audience: 'lp-audience',
  family: 'lp-family',
  love: 'lp-love',
  compare: 'lp-compare',
  plans: 'lp-plans',
  questions: 'lp-questions',
  start: 'lp-start',
}

/** Old landing hashes, mapped on mount. */
export const OLD_HASHES = { features: SECTION_IDS.difference, pricing: SECTION_IDS.plans }
