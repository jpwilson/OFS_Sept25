import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState, useRef } from 'react'
import styles from './LandingV5.module.css'

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

function AnimatedBox({ children, className = '', delay = 0 }) {
  const [ref, inView] = useInView()
  return (
    <div
      ref={ref}
      className={`${className} ${styles.animated} ${inView ? styles.inView : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function LandingV5() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/feed')
  }, [user, navigate])

  return (
    <div className={styles.container}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navLeft}>
          <span className={styles.logo}>Our Family Socials</span>
        </div>
        <div className={styles.navRight}>
          <Link to="/login">Log in</Link>
          <Link to="/login?signup=true" className={styles.navCta}>Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow}></div>
        <AnimatedBox className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.dot}></span>
            Private. Beautiful. Yours.
          </div>
          <h1 className={styles.heroTitle}>
            The family social network<br />
            <span className={styles.gradient}>built for memories</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Share events, track adventures, and stay connected with the people who matter most.
            No ads, no algorithms, just your family.
          </p>
          <div className={styles.heroActions}>
            <Link to="/login?signup=true" className={styles.primaryBtn}>
              Start for free <span>→</span>
            </Link>
            <Link to="/login" className={styles.secondaryBtn}>
              Log in
            </Link>
          </div>
        </AnimatedBox>
      </section>

      {/* Bento Grid */}
      <section className={styles.bentoSection}>
        <div className={styles.bentoGrid}>
          {/* Large card - Feed */}
          <AnimatedBox className={`${styles.bentoCard} ${styles.cardLarge}`} delay={0}>
            <div className={styles.cardIcon}>📱</div>
            <h3>Stay Connected</h3>
            <p>A chronological feed of everything your family shares. No algorithm deciding what you see.</p>
            <div className={styles.cardVisual}>
              <div className={styles.miniCard}>
                <div className={styles.miniAvatar}></div>
                <div className={styles.miniLines}>
                  <span style={{ width: '70%' }}></span>
                  <span style={{ width: '50%' }}></span>
                </div>
              </div>
              <div className={styles.miniCard}>
                <div className={styles.miniAvatar}></div>
                <div className={styles.miniLines}>
                  <span style={{ width: '60%' }}></span>
                  <span style={{ width: '40%' }}></span>
                </div>
              </div>
            </div>
          </AnimatedBox>

          {/* Medium card - Events */}
          <AnimatedBox className={`${styles.bentoCard} ${styles.cardMedium}`} delay={100}>
            <div className={styles.cardIcon}>🎉</div>
            <h3>Rich Event Pages</h3>
            <p>Photo galleries, stories, maps, and more.</p>
            <div className={styles.cardVisual}>
              <div className={styles.galleryPreview}>
                <span></span><span></span><span></span><span></span>
              </div>
            </div>
          </AnimatedBox>

          {/* Medium card - Maps */}
          <AnimatedBox className={`${styles.bentoCard} ${styles.cardMedium}`} delay={200}>
            <div className={styles.cardIcon}>🗺️</div>
            <h3>Interactive Maps</h3>
            <p>Track adventures across the globe.</p>
            <div className={styles.cardVisual}>
              <div className={styles.mapPreview}>
                <div className={styles.mapLine}></div>
                <span className={styles.mapDot} style={{ top: '30%', left: '20%' }}></span>
                <span className={styles.mapDot} style={{ top: '50%', left: '50%' }}></span>
                <span className={styles.mapDot} style={{ top: '40%', left: '75%' }}></span>
              </div>
            </div>
          </AnimatedBox>

          {/* Small card - Privacy */}
          <AnimatedBox className={`${styles.bentoCard} ${styles.cardSmall}`} delay={300}>
            <div className={styles.cardIcon}>🔒</div>
            <h3>Private by default</h3>
          </AnimatedBox>

          {/* Small card - No ads */}
          <AnimatedBox className={`${styles.bentoCard} ${styles.cardSmall}`} delay={400}>
            <div className={styles.cardIcon}>🚫</div>
            <h3>No ads, ever</h3>
          </AnimatedBox>

          {/* Wide card - Photo books */}
          <AnimatedBox className={`${styles.bentoCard} ${styles.cardWide}`} delay={500}>
            <div className={styles.cardContent}>
              <div className={styles.cardIcon}>📚</div>
              <h3>Coming Soon: Photo Books</h3>
              <p>Turn your favorite events into professionally printed keepsakes.</p>
            </div>
            <div className={styles.bookVisual}>
              <div className={styles.book}></div>
            </div>
          </AnimatedBox>
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.pricingSection}>
        <AnimatedBox className={styles.pricingHeader}>
          <h2>Simple, transparent pricing</h2>
          <p>Start free. Upgrade when you're ready.</p>
        </AnimatedBox>

        <div className={styles.pricingGrid}>
          <AnimatedBox className={styles.pricingCard} delay={0}>
            <h3>Free</h3>
            <div className={styles.price}>$0</div>
            <p className={styles.priceNote}>Forever free</p>
            <ul>
              <li>View all shared events</li>
              <li>Like and comment</li>
              <li>Follow family members</li>
              <li>30-day Pro trial</li>
            </ul>
            <Link to="/login" className={styles.pricingBtn}>Get started</Link>
          </AnimatedBox>

          <AnimatedBox className={`${styles.pricingCard} ${styles.featured}`} delay={100}>
            <div className={styles.featuredBadge}>Popular</div>
            <h3>Pro</h3>
            <div className={styles.price}>$9<span>/mo</span></div>
            <p className={styles.priceNote}>Billed annually</p>
            <ul>
              <li><strong>Unlimited events</strong></li>
              <li>Photo & video uploads</li>
              <li>Journey mapping</li>
              <li>GPS extraction</li>
              <li>Privacy controls</li>
            </ul>
            <Link to="/login?signup=true" className={styles.pricingBtnPrimary}>Start free trial</Link>
          </AnimatedBox>

          <AnimatedBox className={styles.pricingCard} delay={200}>
            <h3>Lifetime</h3>
            <div className={styles.price}>$294</div>
            <p className={styles.priceNote}>One-time payment</p>
            <ul>
              <li><strong>Everything in Pro</strong></li>
              <li>No recurring fees</li>
              <li>All future updates</li>
              <li>Priority support</li>
            </ul>
            <Link to="/login?signup=true" className={styles.pricingBtn}>Get lifetime</Link>
          </AnimatedBox>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <AnimatedBox className={styles.ctaContent}>
          <h2>Ready to start?</h2>
          <p>Join families preserving their memories together.</p>
          <Link to="/login?signup=true" className={styles.ctaBtn}>
            Get started for free <span>→</span>
          </Link>
        </AnimatedBox>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <span className={styles.footerLogo}>Our Family Socials</span>
          <div className={styles.footerLinks}>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/faq">Help</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <span className={styles.copyright}>© 2025</span>
        </div>
      </footer>
    </div>
  )
}

export default LandingV5
