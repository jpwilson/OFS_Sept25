import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Blocks, { Inline } from './ContentBlocks'
import { useSeoHead } from '../content/useSeoHead.js'
import styles from '../pages/Compare.module.css'

// Renders a page from src/content/marketing.js. The build-time prerenderer
// (scripts/prerender.mjs) renders the exact same blocks to static HTML, so what
// a crawler reads and what a visitor sees are the same text.

export default function MarketingPage({ page }) {
  const { user } = useAuth()

  // Title, description, canonical, social tags and the single JSON-LD graph,
  // rewritten on every client-side navigation. See content/useSeoHead.js.
  useSeoHead(page)

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
          <Blocks blocks={page.blocks} />
        </div>
      </div>
    </div>
  )
}
