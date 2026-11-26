// The look of each story marketing page (owner: pages): its wash and its one cut-out, by
// art manifest id (src/landing/art/manifest.json). Plain data. No art: no cut-out.
// small: a shorter cut-out, for heads with only a line or two of copy.
export const LOOK = {
  '/features': { wash: 'tide', art: 'p-maya-talk' },
  '/pricing': { wash: 'sun', art: 'p-joe-phone', small: true },
  '/faq': { wash: 'lime', art: 'p-kate-wave' },
  '/about': { wash: 'zest', art: 'g-family-hero' },
  '/alternatives': { wash: 'azure', art: 'g-family-hike' },
  '/compare/facebook-groups': { wash: 'tide', art: 'p-ruth-tablet' },
  '/compare/tinybeans': { wash: 'zest', art: 'g-kids-beach' },
  '/compare/familyalbum': { wash: 'lime', art: 'p-marcus-camera' },
  '/compare/private-instagram': { wash: 'fizz', art: 'p-maya-phone' },
  '/compare/how-to-share-photos-privately': { wash: 'sun', art: 'g-kids-biscuit' },
  '/contact': { wash: 'fizz', art: 'p-deb-wave', small: true },
  '/blog': { wash: 'violet', art: 'p-leo-cheer', small: true },
  '/privacy': { wash: 'paper' },
  '/terms': { wash: 'paper' },
  '/404': { wash: 'tide', art: 'p-biscuit', small: true },
}

/** Card colours, in turn (the landing's: tide, fizz, zest, then lime and azure). */
export const CARD_WASHES = ['tide', 'zest', 'lime', 'fizz', 'azure']
