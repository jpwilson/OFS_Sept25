import { useEffect } from 'react'
import { pageByPath } from './marketing.js'
import { buildJsonLd } from './renderStatic.js'
import { absUrl, OG_IMAGE, SITE_NAME } from './site.js'

// One route-aware head manager for every public page.
//
// The prerendered HTML (scripts/prerender.mjs) already carries the correct
// title, description, canonical, Open Graph/Twitter tags and a single JSON-LD
// graph for the page that was requested. On a client-side navigation none of
// that is re-fetched, so this hook rewrites the whole set in place - including
// replacing the existing JSON-LD graph rather than appending a second one,
// which is how /features -> /pricing used to keep the features canonical and
// /faq -> /features used to keep the FAQ structured data.
//
// Every tag it touches is a singleton, found by selector and mutated. On
// unmount it restores the site default (the home page's metadata), which is
// exactly what a fresh load of / carries, so app routes never inherit a
// marketing page's canonical.

const JSONLD_SELECTOR = 'script[type="application/ld+json"][data-seo="page"]'

function upsert(selector, tag, attrs) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement(tag)
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
  return el
}

export function applySeoHead(page, { noindex = false } = {}) {
  const url = absUrl(page.path)

  document.title = page.title
  upsert('link[rel="canonical"]', 'link', { rel: 'canonical', href: url })
  upsert('meta[name="description"]', 'meta', { name: 'description', content: page.description })

  const og = {
    'og:type': page.path === '/' ? 'website' : 'article',
    'og:url': url,
    'og:title': page.title,
    'og:description': page.description,
    'og:image': OG_IMAGE,
    'og:site_name': SITE_NAME
  }
  Object.entries(og).forEach(([property, content]) =>
    upsert(`meta[property="${property}"]`, 'meta', { property, content })
  )

  const twitter = {
    'twitter:card': 'summary_large_image',
    'twitter:url': url,
    'twitter:title': page.title,
    'twitter:description': page.description,
    'twitter:image': OG_IMAGE
  }
  Object.entries(twitter).forEach(([name, content]) =>
    upsert(`meta[name="${name}"]`, 'meta', { name, content })
  )

  const robots = document.head.querySelector('meta[name="robots"]')
  if (noindex) {
    upsert('meta[name="robots"]', 'meta', { name: 'robots', content: 'noindex, follow' })
  } else if (robots) {
    robots.remove()
  }

  // Exactly one JSON-LD graph for the current page.
  const ld = upsert(JSONLD_SELECTOR, 'script', { type: 'application/ld+json', 'data-seo': 'page' })
  ld.textContent = JSON.stringify(buildJsonLd(page))
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((other) => {
    if (other !== ld) other.remove()
  })
}

// Used by pages that are React routes but have no prerendered marketing
// content of their own (currently only the 404 page).
export function pageDescriptor({ path, title, description }) {
  return { path, title, description, h1: title, lede: description, blocks: [] }
}

export function useSeoHead(page, options) {
  const noindex = options?.noindex ?? false
  useEffect(() => {
    applySeoHead(page, { noindex })
    return () => applySeoHead(pageByPath('/'))
  }, [page, noindex])
}
