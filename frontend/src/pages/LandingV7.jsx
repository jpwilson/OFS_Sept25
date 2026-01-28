import { Link } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import styles from './LandingV7.module.css'

function useInView() {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold: 0.2 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return [ref, inView]
}

function SplitSection({ title, description, cta, ctaLink, image, imageAlt, reverse = false, label }) {
  const [ref, inView] = useInView()

  return (
    <section ref={ref} className={`${styles.split} ${reverse ? styles.reverse : ''} ${inView ? styles.visible : ''}`}>
      <div className={styles.textSide}>
        <div className={styles.textContent}>
          {label && <span className={styles.label}>{label}</span>}
          <h2 className={styles.sectionTitle}>{title}</h2>
          <p className={styles.sectionDesc}>{description}</p>
          {cta && (
            <Link to={ctaLink} className={styles.sectionCta}>
              {cta} <span>→</span>
            </Link>
          )}
        </div>
      </div>
      <div className={styles.visualSide}>
        <div className={styles.imageWrapper}>
          <img src={image} alt={imageAlt} loading="lazy" />
        </div>
      </div>
    </section>
  )
}

function LandingV7() {
  return (
    <div className={styles.container}>
      {/* Nav */}
      <nav className={styles.nav}>
        <span className={styles.logo}>Our Family Socials</span>
        <div className={styles.navLinks}>
          <Link to="/login">Log in</Link>
          <Link to="/login?signup=true" className={styles.navCta}>Start free</Link>
        </div>
      </nav>

      {/* Hero Split */}
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>
            Your family's story,<br />
            <span className={styles.accent}>beautifully told</span>
          </h1>
          <p className={styles.heroSubtitle}>
            A private space to share moments, track adventures, and stay connected.
          </p>
          <div className={styles.heroActions}>
            <Link to="/login?signup=true" className={styles.primaryBtn}>Start for free</Link>
            <Link to="/login" className={styles.secondaryBtn}>Log in</Link>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.heroImageStack}>
            <img src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80" alt="Paris" />
            <img src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80" alt="Wedding" />
          </div>
        </div>
      </section>

      {/* Feature Splits */}
      <SplitSection
        label="Stay Connected"
        title="Never miss a moment from the people you love"
        description="Your family's activities in one chronological feed. No algorithm deciding what you see. Just the moments that matter."
        cta="Learn more"
        ctaLink="/login?signup=true"
        image="https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80"
        imageAlt="Tokyo cherry blossoms"
      />

      <SplitSection
        label="Rich Stories"
        title="Every adventure deserves more than one photo"
        description="Create beautiful event pages with photo galleries, detailed stories, and interactive maps. Capture the full context of every memory."
        cta="Start creating"
        ctaLink="/login?signup=true"
        image="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"
        imageAlt="Mountain adventure"
        reverse
      />

      <SplitSection
        label="Journey Maps"
        title="Watch adventures unfold across the globe"
        description="See every trip on an interactive map. Track your family's travels from city to city, country to country."
        cta="Explore maps"
        ctaLink="/login?signup=true"
        image="https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=800&q=80"
        imageAlt="World map"
      />

      <SplitSection
        label="Private & Secure"
        title="Your memories are yours"
        description="No ads. No data selling. No algorithms. Just a private, beautiful space for your family to share and connect."
        image="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&q=80"
        imageAlt="Family silhouette"
        reverse
      />

      {/* Pricing */}
      <section className={styles.pricing}>
        <h2 className={styles.pricingTitle}>Simple pricing</h2>
        <div className={styles.pricingGrid}>
          <div className={styles.pricingCard}>
            <h3>Free</h3>
            <div className={styles.price}>$0</div>
            <ul>
              <li>View all events</li>
              <li>Like & comment</li>
              <li>Follow family</li>
            </ul>
            <Link to="/login" className={styles.pricingBtn}>Get started</Link>
          </div>
          <div className={`${styles.pricingCard} ${styles.featured}`}>
            <span className={styles.popular}>Popular</span>
            <h3>Pro</h3>
            <div className={styles.price}>$9<span>/mo</span></div>
            <ul>
              <li><strong>Unlimited events</strong></li>
              <li>Photo & video</li>
              <li>Journey maps</li>
              <li>Privacy controls</li>
            </ul>
            <Link to="/login?signup=true" className={styles.pricingBtnPrimary}>Start trial</Link>
          </div>
          <div className={styles.pricingCard}>
            <h3>Lifetime</h3>
            <div className={styles.price}>$294</div>
            <ul>
              <li>Everything in Pro</li>
              <li>Forever access</li>
              <li>Future updates</li>
            </ul>
            <Link to="/login?signup=true" className={styles.pricingBtn}>Get lifetime</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <h2>Ready to start your story?</h2>
        <Link to="/login?signup=true" className={styles.ctaBtn}>Get started for free</Link>
        <p>No credit card required</p>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <span>© 2025 Our Family Socials</span>
        <div className={styles.footerLinks}>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/faq">Help</Link>
        </div>
      </footer>
    </div>
  )
}

export default LandingV7
