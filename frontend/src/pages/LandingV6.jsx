import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState, useRef } from 'react'
import styles from './LandingV6.module.css'

function useInView() {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return [ref, inView]
}

function GlassCard({ children, className = '', delay = 0 }) {
  const [ref, inView] = useInView()
  return (
    <div
      ref={ref}
      className={`${styles.glassCard} ${className} ${inView ? styles.visible : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function LandingV6() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/feed')
  }, [user, navigate])

  return (
    <div className={styles.container}>
      {/* Background orbs */}
      <div className={styles.orbContainer}>
        <div className={`${styles.orb} ${styles.orb1}`}></div>
        <div className={`${styles.orb} ${styles.orb2}`}></div>
        <div className={`${styles.orb} ${styles.orb3}`}></div>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        <span className={styles.logo}>Our Family Socials</span>
        <div className={styles.navLinks}>
          <Link to="/login">Log in</Link>
          <Link to="/login?signup=true" className={styles.navCta}>Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>Premium Family Memories</span>
          <h1 className={styles.heroTitle}>
            Where your family's
            <span className={styles.glow}> story </span>
            lives forever
          </h1>
          <p className={styles.heroSubtitle}>
            A private, beautiful space to share moments, track adventures,
            and stay connected with the people who matter most.
          </p>
          <div className={styles.heroActions}>
            <Link to="/login?signup=true" className={styles.primaryBtn}>
              <span className={styles.btnGlow}></span>
              Start for free
            </Link>
            <Link to="/login" className={styles.secondaryBtn}>Log in</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.featuresGrid}>
          <GlassCard delay={0}>
            <div className={styles.cardIcon}>📱</div>
            <h3>Beautiful Feed</h3>
            <p>See every moment your family shares in one chronological, ad-free feed.</p>
          </GlassCard>
          <GlassCard delay={100}>
            <div className={styles.cardIcon}>🎉</div>
            <h3>Rich Event Pages</h3>
            <p>Create stunning pages with photo galleries, stories, and maps.</p>
          </GlassCard>
          <GlassCard delay={200}>
            <div className={styles.cardIcon}>🗺️</div>
            <h3>Journey Maps</h3>
            <p>Track your family's adventures across the globe on interactive maps.</p>
          </GlassCard>
          <GlassCard delay={300}>
            <div className={styles.cardIcon}>🔒</div>
            <h3>Private & Secure</h3>
            <p>Your memories stay private. No ads, no data selling, ever.</p>
          </GlassCard>
        </div>
      </section>

      {/* Showcase */}
      <section className={styles.showcase}>
        <div className={styles.showcaseContent}>
          <GlassCard className={styles.showcaseCard}>
            <div className={styles.showcaseImage}>
              <img src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80" alt="Wedding" />
            </div>
            <div className={styles.showcaseInfo}>
              <h3>Sarah & Michael's Wedding</h3>
              <p>Napa Valley • June 2024</p>
            </div>
          </GlassCard>
        </div>
        <div className={styles.showcaseText}>
          <h2>Every moment<br />deserves to shine</h2>
          <p>From intimate dinners to grand celebrations, capture every detail that makes your memories special.</p>
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.pricing}>
        <h2 className={styles.pricingTitle}>Simple pricing</h2>
        <p className={styles.pricingSubtitle}>Start free, upgrade when you're ready</p>

        <div className={styles.pricingGrid}>
          <GlassCard className={styles.pricingCard} delay={0}>
            <h3>Free</h3>
            <div className={styles.price}>$0</div>
            <p className={styles.priceNote}>Forever</p>
            <ul>
              <li>View all events</li>
              <li>Like & comment</li>
              <li>Follow family</li>
            </ul>
            <Link to="/login" className={styles.pricingBtn}>Get started</Link>
          </GlassCard>

          <GlassCard className={`${styles.pricingCard} ${styles.featured}`} delay={100}>
            <div className={styles.featuredGlow}></div>
            <span className={styles.popularBadge}>Popular</span>
            <h3>Pro</h3>
            <div className={styles.price}>$9<span>/mo</span></div>
            <p className={styles.priceNote}>Billed annually</p>
            <ul>
              <li><strong>Unlimited events</strong></li>
              <li>Photo & video</li>
              <li>Journey maps</li>
              <li>Privacy controls</li>
            </ul>
            <Link to="/login?signup=true" className={styles.pricingBtnPrimary}>Start trial</Link>
          </GlassCard>

          <GlassCard className={styles.pricingCard} delay={200}>
            <h3>Lifetime</h3>
            <div className={styles.price}>$294</div>
            <p className={styles.priceNote}>One-time</p>
            <ul>
              <li>Everything in Pro</li>
              <li>Forever access</li>
              <li>Future updates</li>
            </ul>
            <Link to="/login?signup=true" className={styles.pricingBtn}>Get lifetime</Link>
          </GlassCard>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <GlassCard className={styles.ctaCard}>
          <h2>Ready to preserve your story?</h2>
          <p>Join families keeping their memories alive together.</p>
          <Link to="/login?signup=true" className={styles.ctaBtn}>
            <span className={styles.btnGlow}></span>
            Get started for free
          </Link>
        </GlassCard>
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

export default LandingV6
