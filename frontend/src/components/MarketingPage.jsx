import { Fragment, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { tokenizeInline } from '../content/inline.js'
import { buildJsonLd } from '../content/renderStatic.js'
import { absUrl } from '../content/site.js'
import styles from '../pages/Compare.module.css'

// Renders a page from src/content/marketing.js. The build-time prerenderer
// (scripts/prerender.mjs) renders the exact same data to static HTML, so what
// a crawler reads and what a visitor sees are always the same text.

function Inline({ text }) {
  return (
    <>
      {tokenizeInline(text).map((t, i) => {
        if (t.type === 'bold') return <strong key={i}>{t.value}</strong>
        if (t.type === 'link') {
          return /^https?:\/\//.test(t.href) ? (
            <a key={i} href={t.href} rel="noopener" target="_blank">
              {t.value}
            </a>
          ) : (
            <Link key={i} to={t.href}>
              {t.value}
            </Link>
          )
        }
        return <Fragment key={i}>{t.value}</Fragment>
      })}
    </>
  )
}

function Block({ block }) {
  if (block.h2) return <h2><Inline text={block.h2} /></h2>
  if (block.h3) return <h3><Inline text={block.h3} /></h3>
  if (block.p) return <p><Inline text={block.p} /></p>
  if (block.ul)
    return (
      <ul className={styles.list}>
        {block.ul.map((item, i) => <li key={i}><Inline text={item} /></li>)}
      </ul>
    )
  if (block.ol)
    return (
      <ol className={styles.orderedList}>
        {block.ol.map((item, i) => <li key={i}><Inline text={item} /></li>)}
      </ol>
    )
  if (block.faq)
    return (
      <>
        {block.faq.filter(Boolean).map((f, i) => (
          <div className={styles.comparisonItem} key={i}>
            <h3>{f.q}</h3>
            <p><Inline text={f.a} /></p>
          </div>
        ))}
      </>
    )
  if (block.compare) {
    const { aLabel, bLabel, rows } = block.compare
    return (
      <div className={styles.comparison}>
        {rows.map((r, i) => (
          <div className={styles.comparisonItem} key={i}>
            <h3><Inline text={r.h} /></h3>
            <div className={styles.vs}>
              <div className={styles.vsColumn}>
                <strong>{aLabel}</strong>
                <p><Inline text={r.a} /></p>
              </div>
              <div className={styles.vsColumn}>
                <strong>{bLabel}</strong>
                <p><Inline text={r.b} /></p>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (block.cta)
    return (
      <div className={styles.ctaButtons}>
        {block.cta.map((c, i) => (
          <Link key={i} to={c.href} className={c.primary ? styles.ctaButton : styles.secondaryButton}>
            {c.text}
          </Link>
        ))}
      </div>
    )
  return null
}

export default function MarketingPage({ page }) {
  const { user } = useAuth()

  // Keep <title>, meta description, canonical and JSON-LD correct for
  // client-side navigations. The prerendered HTML already carries them for the
  // first (crawled) response.
  useEffect(() => {
    window.scrollTo(0, 0)
    const previousTitle = document.title
    document.title = page.title

    const setMeta = (selector, attrs) => {
      let el = document.head.querySelector(selector)
      let created = false
      if (!el) {
        el = document.createElement(attrs.tag)
        created = true
      }
      Object.entries(attrs).forEach(([k, v]) => k !== 'tag' && el.setAttribute(k, v))
      if (created) document.head.appendChild(el)
      return { el, created }
    }

    const desc = setMeta('meta[name="description"]', {
      tag: 'meta',
      name: 'description',
      content: page.description
    })
    const canonical = setMeta('link[rel="canonical"]', {
      tag: 'link',
      rel: 'canonical',
      href: absUrl(page.path)
    })

    const ld = document.createElement('script')
    ld.type = 'application/ld+json'
    ld.dataset.marketing = 'true'
    ld.text = JSON.stringify(buildJsonLd(page))
    document.head.appendChild(ld)

    return () => {
      document.title = previousTitle
      document.head.removeChild(ld)
      if (desc.created) document.head.removeChild(desc.el)
      if (canonical.created) document.head.removeChild(canonical.el)
    }
  }, [page])

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <Link to={user ? '/feed' : '/'} className={styles.backLink}>
            ← Back
          </Link>
          <h1 className={styles.title}>{page.h1}</h1>
          <p className={styles.subtitle}><Inline text={page.lede} /></p>
          {page.updated && <p className={styles.updated}>Last updated {page.updated}</p>}
        </div>
        <div className={styles.section}>
          {page.blocks.map((block, i) => <Block key={i} block={block} />)}
        </div>
      </div>
    </div>
  )
}
