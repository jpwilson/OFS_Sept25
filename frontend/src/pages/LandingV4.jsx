import { Link } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import styles from './LandingV4.module.css'

function useScrollReveal() {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.2, rootMargin: '-50px' }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return [ref, isVisible]
}

function RevealSection({ children, className = '' }) {
  const [ref, isVisible] = useScrollReveal()
  return (
    <section
      ref={ref}
      className={`${className} ${styles.reveal} ${isVisible ? styles.revealed : ''}`}
    >
      {children}
    </section>
  )
}

function LandingV4() {
  return (
    <div className={styles.container}>
      {/* Minimal Nav */}
      <nav className={styles.nav}>
        <span className={styles.logo}>OFS</span>
        <div className={styles.navLinks}>
          <Link to="/login">Log in</Link>
          <Link to="/login?signup=true" className={styles.navCta}>Start free</Link>
        </div>
      </nav>

      {/* Hero - Ultra minimal */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Family memories.<br />
          <span className={styles.accent}>Beautifully preserved.</span>
        </h1>
      </section>

      {/* Feature 1 */}
      <RevealSection className={styles.feature}>
        <div className={styles.featureContent}>
          <p className={styles.featureLabel}>Stay connected</p>
          <h2 className={styles.featureTitle}>
            See what your family<br />
            is up to, always
          </h2>
        </div>
        <div className={styles.featureVisual}>
          <div className={styles.phoneFrame}>
            <img
              src="https://images.unsplash.com/photo-1522383225653-ed111181a951?w=600&q=80"
              alt="Family feed"
            />
          </div>
        </div>
      </RevealSection>

      {/* Feature 2 */}
      <RevealSection className={styles.feature}>
        <div className={styles.featureContent}>
          <p className={styles.featureLabel}>Rich storytelling</p>
          <h2 className={styles.featureTitle}>
            Every adventure deserves<br />
            more than one photo
          </h2>
        </div>
        <div className={styles.featureVisual}>
          <div className={styles.browserFrame}>
            <div className={styles.browserHeader}>
              <span></span><span></span><span></span>
            </div>
            <img
              src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80"
              alt="Event page"
            />
          </div>
        </div>
      </RevealSection>

      {/* Feature 3 */}
      <RevealSection className={styles.feature}>
        <div className={styles.featureContent}>
          <p className={styles.featureLabel}>Interactive maps</p>
          <h2 className={styles.featureTitle}>
            Watch your family's<br />
            adventures unfold
          </h2>
        </div>
        <div className={styles.featureVisual}>
          <div className={styles.mapFrame}>
            <img
              src="https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=800&q=80"
              alt="Journey map"
            />
            <div className={styles.mapPins}>
              <span style={{ top: '30%', left: '25%' }}>📍</span>
              <span style={{ top: '45%', left: '55%' }}>📍</span>
              <span style={{ top: '60%', left: '70%' }}>📍</span>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* Privacy Statement */}
      <RevealSection className={styles.privacy}>
        <h2 className={styles.privacyTitle}>
          Your memories are yours.
        </h2>
        <p className={styles.privacyText}>
          No ads. No data selling. No algorithms.<br />
          Just a private space for your family.
        </p>
      </RevealSection>

      {/* Pricing */}
      <RevealSection className={styles.pricing}>
        <h2 className={styles.pricingTitle}>Simple pricing</h2>
        <div className={styles.pricingCards}>
          <div className={styles.pricingCard}>
            <h3>Free</h3>
            <p className={styles.priceTag}>$0</p>
            <p className={styles.priceDesc}>View & engage</p>
            <ul>
              <li>View all events</li>
              <li>Like & comment</li>
              <li>Follow family</li>
            </ul>
            <Link to="/login" className={styles.pricingBtn}>Get started</Link>
          </div>
          <div className={`${styles.pricingCard} ${styles.featured}`}>
            <h3>Pro</h3>
            <p className={styles.priceTag}>$9<span>/mo</span></p>
            <p className={styles.priceDesc}>Create unlimited</p>
            <ul>
              <li>Unlimited events</li>
              <li>Photo & video</li>
              <li>Journey maps</li>
              <li>Privacy controls</li>
            </ul>
            <Link to="/login?signup=true" className={styles.pricingBtnPrimary}>Start trial</Link>
          </div>
          <div className={styles.pricingCard}>
            <h3>Lifetime</h3>
            <p className={styles.priceTag}>$294</p>
            <p className={styles.priceDesc}>Pay once</p>
            <ul>
              <li>Everything in Pro</li>
              <li>Forever access</li>
              <li>Future updates</li>
            </ul>
            <Link to="/login?signup=true" className={styles.pricingBtn}>Get lifetime</Link>
          </div>
        </div>
      </RevealSection>

      {/* Final CTA */}
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>
          Start preserving<br />
          your story today.
        </h2>
        <Link to="/login?signup=true" className={styles.ctaButton}>Get started free</Link>
        <p className={styles.ctaNote}>No credit card required</p>
      </section>

      {/* Minimal Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <span>© 2025 Our Family Socials</span>
          <div className={styles.footerLinks}>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/faq">Help</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingV4
