// Renders marketing page data to static HTML, JSON-LD and plain text.
// Used at build time by scripts/prerender.mjs and scripts/generate-seo-files.mjs.
import { escapeHtml, inlineToHtml, inlineToText } from './inline.js'
import { SITE_NAME, SITE_ORIGIN, OG_IMAGE, absUrl } from './site.js'

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
  { href: '/alternatives', label: 'Alternatives' }
]

export const COMPARE_LINKS = [
  { href: '/compare/facebook-groups', label: 'vs private Facebook groups' },
  { href: '/compare/tinybeans', label: 'vs Tinybeans' },
  { href: '/compare/familyalbum', label: 'vs FamilyAlbum' },
  { href: '/compare/private-instagram', label: 'vs a private Instagram account' },
  { href: '/compare/how-to-share-photos-privately', label: "How to share kids' photos privately" }
]

function renderBlock(b) {
  if (b.h2) return `<h2>${inlineToHtml(b.h2)}</h2>`
  if (b.h3) return `<h3>${inlineToHtml(b.h3)}</h3>`
  if (b.p) return `<p>${inlineToHtml(b.p)}</p>`
  if (b.ul) return `<ul>${b.ul.map((i) => `<li>${inlineToHtml(i)}</li>`).join('')}</ul>`
  if (b.ol) return `<ol>${b.ol.map((i) => `<li>${inlineToHtml(i)}</li>`).join('')}</ol>`
  if (b.faq) {
    return b.faq
      .filter(Boolean)
      .map((f) => `<h3>${escapeHtml(f.q)}</h3><p>${inlineToHtml(f.a)}</p>`)
      .join('')
  }
  if (b.compare) {
    const { aLabel, bLabel, rows } = b.compare
    return (
      `<table><thead><tr><th scope="col">&nbsp;</th><th scope="col">${escapeHtml(aLabel)}</th>` +
      `<th scope="col">${escapeHtml(bLabel)}</th></tr></thead><tbody>` +
      rows
        .map(
          (r) =>
            `<tr><th scope="row">${inlineToHtml(r.h)}</th><td>${inlineToHtml(r.a)}</td>` +
            `<td>${inlineToHtml(r.b)}</td></tr>`
        )
        .join('') +
      `</tbody></table>`
    )
  }
  if (b.cta) {
    return `<p>${b.cta.map((c) => `<a href="${escapeHtml(c.href)}">${escapeHtml(c.text)}</a>`).join(' ')}</p>`
  }
  return ''
}

export function renderBody(page) {
  const nav =
    `<nav aria-label="Main"><a href="/">${escapeHtml(SITE_NAME)}</a>` +
    NAV_LINKS.filter((l) => l.href !== '/')
      .map((l) => ` <a href="${l.href}">${escapeHtml(l.label)}</a>`)
      .join('') +
    `</nav>`

  const crumbs = page.breadcrumb
    ? `<p><a href="/">Home</a> &rsaquo; ${escapeHtml(page.breadcrumb)}</p>`
    : ''

  const updated = page.updated ? `<p><em>Last updated ${escapeHtml(page.updated)}</em></p>` : ''

  const footer =
    `<footer><h2>Our Family Socials</h2>` +
    `<p>A private, ad-free social network for families to share life events, photos and memories.</p>` +
    `<ul>` +
    NAV_LINKS.map((l) => `<li><a href="${l.href}">${escapeHtml(l.label)}</a></li>`).join('') +
    COMPARE_LINKS.map((l) => `<li><a href="${l.href}">${escapeHtml(l.label)}</a></li>`).join('') +
    `<li><a href="/privacy">Privacy Policy</a></li><li><a href="/terms">Terms of Service</a></li>` +
    `<li><a href="/contact">Contact</a></li><li><a href="/login">Log in</a></li>` +
    `<li><a href="/login?signup=true">Sign up free</a></li>` +
    `</ul></footer>`

  return (
    `<div class="prerender-shell">${nav}<main>${crumbs}<h1>${inlineToHtml(page.h1)}</h1>` +
    `<p>${inlineToHtml(page.lede)}</p>${updated}` +
    page.blocks.map(renderBlock).join('') +
    `</main>${footer}</div>`
  )
}

// --- plain text (llms-full.txt) ---

function blockToText(b) {
  if (b.h2) return `\n## ${inlineToText(b.h2)}\n`
  if (b.h3) return `\n### ${inlineToText(b.h3)}\n`
  if (b.p) return `${inlineToText(b.p)}\n`
  if (b.ul) return b.ul.map((i) => `- ${inlineToText(i)}`).join('\n') + '\n'
  if (b.ol) return b.ol.map((i, n) => `${n + 1}. ${inlineToText(i)}`).join('\n') + '\n'
  if (b.faq)
    return b.faq.filter(Boolean).map((f) => `Q: ${f.q}\nA: ${inlineToText(f.a)}`).join('\n\n') + '\n'
  if (b.compare) {
    const { aLabel, bLabel, rows } = b.compare
    return rows
      .map((r) => `- ${inlineToText(r.h)}\n  - ${aLabel}: ${inlineToText(r.a)}\n  - ${bLabel}: ${inlineToText(r.b)}`)
      .join('\n') + '\n'
  }
  if (b.cta) return b.cta.map((c) => `-> ${c.text}: ${absUrl(c.href.split('?')[0])}`).join('\n') + '\n'
  return ''
}

export function renderText(page) {
  return (
    `# ${inlineToText(page.h1)}\n` +
    `URL: ${absUrl(page.path)}\n` +
    (page.updated ? `Last updated: ${page.updated}\n` : '') +
    `\n${inlineToText(page.lede)}\n` +
    page.blocks.map(blockToText).join('')
  )
}

// --- word count used by scripts/check-seo.mjs reporting ---
export function countWords(html) {
  const stripped = html
    .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
  return stripped.split(/\s+/).filter(Boolean).length
}

// --- JSON-LD ---

const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE_ORIGIN}/#organization`,
  name: SITE_NAME,
  url: `${SITE_ORIGIN}/`,
  logo: { '@type': 'ImageObject', url: OG_IMAGE, width: 512, height: 512 },
  email: 'support@ourfamilysocials.com',
  description:
    'Our Family Socials is a private, ad-free social network for families to share life events, photos and memories.'
}

const WEBSITE = {
  '@type': 'WebSite',
  '@id': `${SITE_ORIGIN}/#website`,
  name: SITE_NAME,
  alternateName: 'OFS',
  url: `${SITE_ORIGIN}/`,
  inLanguage: 'en',
  publisher: { '@id': `${SITE_ORIGIN}/#organization` }
}

// Offers mirror the prices published on /pricing.
const SOFTWARE_APPLICATION = {
  '@type': 'WebApplication',
  '@id': `${SITE_ORIGIN}/#webapp`,
  name: SITE_NAME,
  alternateName: 'OFS',
  url: `${SITE_ORIGIN}/`,
  applicationCategory: 'SocialNetworkingApplication',
  operatingSystem: 'Any (web browser)',
  browserRequirements: 'Requires JavaScript',
  description:
    'A private, ad-free social network for families to share life events, photos and stories, with interactive journey maps, a chronological feed and family trees.',
  publisher: { '@id': `${SITE_ORIGIN}/#organization` },
  featureList: [
    'Event pages with photo galleries, rich text stories and a per-event audience setting',
    'Chronological family feed with follow requests',
    'Interactive world map and multi-stop journey maps',
    'GPS location extraction from photo metadata',
    'Timeline view grouped by year',
    'Video uploads with built-in trimming',
    'AI Create (beta) event story drafting',
    'Family trees from confirmed relationships',
    'Private share links for people without an account',
    'No advertising and no data selling'
  ],
  offers: [
    {
      '@type': 'Offer',
      name: 'Free to View',
      price: '0',
      priceCurrency: 'USD',
      description:
        'View the events you have access to, like and comment, follow family members, maps and timeline. Includes a 30-day Pro trial with up to 5 published events; creating events after that needs a paid plan.',
      url: `${SITE_ORIGIN}/pricing`
    },
    {
      '@type': 'Offer',
      name: 'Pro (billed annually)',
      price: '108',
      priceCurrency: 'USD',
      description: 'Unlimited event creation, billed annually at $108/year ($9/month).',
      url: `${SITE_ORIGIN}/pricing`
    },
    {
      '@type': 'Offer',
      name: 'Pro (billed monthly)',
      price: '12',
      priceCurrency: 'USD',
      description: 'Unlimited event creation, billed monthly at $12/month.',
      url: `${SITE_ORIGIN}/pricing`
    },
    {
      '@type': 'Offer',
      name: 'Lifetime',
      price: '294',
      priceCurrency: 'USD',
      description: 'One-time payment for everything in Pro, with no recurring fees.',
      url: `${SITE_ORIGIN}/pricing`
    }
  ]
}

export function buildJsonLd(page) {
  const graph = [ORGANIZATION, WEBSITE]

  graph.push({
    '@type': 'WebPage',
    '@id': `${absUrl(page.path)}#webpage`,
    url: absUrl(page.path),
    name: page.title,
    description: page.description,
    inLanguage: 'en',
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    about: { '@id': `${SITE_ORIGIN}/#webapp` },
    ...(page.updated ? { dateModified: '2026-10-21' } : {})
  })

  if (page.path === '/' || page.path === '/pricing' || page.path === '/features') {
    graph.push(SOFTWARE_APPLICATION)
  }

  if (page.breadcrumb) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${absUrl(page.path)}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: page.breadcrumb, item: absUrl(page.path) }
      ]
    })
  }

  // FAQPage only where the questions and answers are actually visible on the page.
  const faqItems = page.blocks.flatMap((b) => (b.faq ? b.faq.filter(Boolean) : []))
  if (page.isFaqPage && faqItems.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${absUrl(page.path)}#faq`,
      mainEntity: faqItems.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: inlineToText(f.a) }
      }))
    })
  }

  // Comparison guides are editorial articles.
  if (page.path.startsWith('/compare/') || page.path === '/alternatives') {
    graph.push({
      '@type': 'Article',
      '@id': `${absUrl(page.path)}#article`,
      headline: page.h1,
      description: page.description,
      mainEntityOfPage: { '@id': `${absUrl(page.path)}#webpage` },
      inLanguage: 'en',
      dateModified: '2026-10-21',
      author: { '@id': `${SITE_ORIGIN}/#organization` },
      publisher: { '@id': `${SITE_ORIGIN}/#organization` }
    })
  }

  return { '@context': 'https://schema.org', '@graph': graph }
}

export function buildHead(page) {
  const url = absUrl(page.path)
  const title = escapeHtml(page.title)
  const desc = escapeHtml(page.description)
  return [
    `<title>${title}</title>`,
    ...(page.noindex ? ['<meta name="robots" content="noindex, follow" />'] : []),
    `<meta name="description" content="${desc}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${page.path === '/' ? 'website' : 'article'}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:image:width" content="512" />`,
    `<meta property="og:image:height" content="512" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:url" content="${url}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${desc}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    `<script type="application/ld+json" data-seo="page">${JSON.stringify(buildJsonLd(page))}</script>`
  ].join('\n    ')
}
