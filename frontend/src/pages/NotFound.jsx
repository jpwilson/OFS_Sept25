import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './Compare.module.css'

// Vercel's SPA catch-all means an unknown path still returns 200 with
// index.html. Rendering a real "not found" page with robots=noindex is the
// cheapest way to stop those soft-404s being indexed. Googlebot renders
// JavaScript, so it sees the noindex; non-rendering crawlers only ever see the
// prerendered pages, which are all real.
export default function NotFound() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, follow'
    document.head.appendChild(meta)
    const previousTitle = document.title
    document.title = 'Page not found - Our Family Socials'
    return () => {
      document.head.removeChild(meta)
      document.title = previousTitle
    }
  }, [])

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
