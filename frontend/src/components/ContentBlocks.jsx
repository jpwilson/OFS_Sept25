import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { tokenizeInline } from '../content/inline.js'
import styles from '../pages/Compare.module.css'

// Renders the plain-data content blocks from src/content/marketing.js.
//
// The build-time prerenderer (scripts/prerender.mjs, via
// src/content/renderStatic.js) renders the same blocks to static HTML, so the
// text a crawler reads and the text a visitor reads come from one source.
// Used by MarketingPage.jsx (whole pages) and by Landing.jsx (the shared home
// sections, so the mounted home page keeps the prerendered text).

export function Inline({ text }) {
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

export function Block({ block }) {
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

export default function Blocks({ blocks }) {
  return blocks.map((block, i) => <Block key={i} block={block} />)
}
