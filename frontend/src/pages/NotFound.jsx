import { Link } from 'react-router-dom'
import { useSeoHead, pageDescriptor } from '../content/useSeoHead.js'
import styles from './Compare.module.css'

const NOT_FOUND = pageDescriptor({
  path: '/404',
  title: 'Page not found - Our Family Socials',
  description:
    'That link does not point anywhere on Our Family Socials. Try the home page, features, pricing or the FAQ.'
})

// Unknown paths are no longer rewritten to the SPA: vercel.json only rewrites
// real React routes, so an address that matches nothing gets dist/404.html with
// an HTTP 404 (scripts/prerender.mjs writes it from this page's copy). This
// component is what a client-side navigation to a bad path renders, and it
// carries the same noindex.
export default function NotFound() {
  useSeoHead(NOT_FOUND, { noindex: true })

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Page not found</h1>
          <p className={styles.subtitle}>
            That link does not point anywhere on Our Family Socials. It may have moved, or the
            address may have a typo in it.
          </p>
        </div>
        <div className={styles.section}>
          <h2>Try one of these</h2>
          <ul className={styles.list}>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/features">Features</Link></li>
            <li><Link to="/pricing">Pricing</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
            <li><Link to="/alternatives">Private family sharing apps compared</Link></li>
            <li><Link to="/contact">Contact us</Link></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
