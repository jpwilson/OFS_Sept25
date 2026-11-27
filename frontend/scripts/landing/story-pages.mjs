// Story restyle of the marketing pages (owner: pages; see docs/landing/handover/PAGES.md).
//
// A Vite plugin that is registered ONLY in the story variant (vite.config.js). It swaps a
// few modules at build time, so the app's own files stay untouched and a classic build is
// byte-for-byte what it was:
//
//   - each marketing page the app imports (src/pages/FAQ.jsx and friends) resolves to a thin
//     wrapper in src/landing/pages/routes/ that renders the ORIGINAL page inside the
//     landing's frame (nav, footer, fonts, tokens). The words stay in the original files.
//   - those pages' CSS Modules resolve to story stylesheets with the same class names
//     (src/landing/pages/css/), so the same markup gets the landing's look.
//   - src/components/MarketingPage.jsx (the data-driven pages: /features, /alternatives,
//     /compare/*) resolves to a story renderer of the same marketing.js blocks.
//   - Layout's Header and Footer resolve to wrappers that step aside while a story page is
//     on screen (the frame draws the landing's nav and footer instead).
//
// Nothing is swapped for an importer inside src/landing/pages/, which is how a wrapper
// reaches the original module it wraps.
import { join, normalize, sep } from 'node:path'

export function storyPages(root) {
  const src = (p) => normalize(join(root, 'src', p))
  const own = src('landing/pages') + sep

  // original module -> story module, for every importer
  const swap = new Map([
    [src('components/MarketingPage.jsx'), src('landing/pages/MarketingPage.jsx')],
    [src('pages/FAQ.jsx'), src('landing/pages/routes/FAQ.jsx')],
    [src('pages/PricingPage.jsx'), src('landing/pages/routes/PricingPage.jsx')],
    [src('pages/About.jsx'), src('landing/pages/routes/About.jsx')],
    [src('pages/Contact.jsx'), src('landing/pages/routes/Contact.jsx')],
    [src('pages/Blog.jsx'), src('landing/pages/routes/Blog.jsx')],
    [src('pages/Privacy.jsx'), src('landing/pages/routes/Privacy.jsx')],
    [src('pages/Terms.jsx'), src('landing/pages/routes/Terms.jsx')],
    [src('pages/NotFound.jsx'), src('landing/pages/routes/NotFound.jsx')],
    [src('pages/FAQ.module.css'), src('landing/pages/css/FAQ.module.css')],
    [src('pages/PricingPage.module.css'), src('landing/pages/css/PricingPage.module.css')],
    [src('pages/About.module.css'), src('landing/pages/css/About.module.css')],
    [src('pages/Contact.module.css'), src('landing/pages/css/Contact.module.css')],
    [src('pages/Blog.module.css'), src('landing/pages/css/Blog.module.css')],
    [src('pages/Legal.module.css'), src('landing/pages/css/Legal.module.css')],
  ])
  // original module -> story module, only for one importer
  const swapFor = new Map([
    [src('components/Layout.jsx'), new Map([
      [src('components/Header.jsx'), src('landing/pages/AppHeader.jsx')],
      [src('components/Footer.jsx'), src('landing/pages/AppFooter.jsx')],
    ])],
    [src('pages/NotFound.jsx'), new Map([[src('pages/Compare.module.css'), src('landing/pages/css/NotFound.module.css')]])],
  ])

  return {
    name: 'ofs-story-pages',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || source.startsWith('\0')) return null
      const from = normalize(importer.split('?')[0])
      if (from.startsWith(own)) return null
      if (!/^\.{1,2}\//.test(source)) return null
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      if (!resolved || resolved.external) return null
      const id = normalize(resolved.id.split('?')[0])
      const target = swapFor.get(from)?.get(id) || swap.get(id)
      return target || null
    },
  }
}
