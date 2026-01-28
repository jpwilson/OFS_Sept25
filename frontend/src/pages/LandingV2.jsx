import { Link } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import styles from './LandingV2.module.css'

function LandingV2() {
  const [activeChapter, setActiveChapter] = useState(0)
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollTop = container.scrollTop
      const height = window.innerHeight
      const chapter = Math.round(scrollTop / height)
      setActiveChapter(chapter)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToChapter = (index) => {
    const container = containerRef.current
    if (container) {
      container.scrollTo({
        top: index * window.innerHeight,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Minimal Navigation */}
      <nav className={styles.nav}>
        <Link to="/" className={styles.logo}>OFS</Link>
        <div className={styles.navActions}>
          <Link to="/login" className={styles.navLogin}>Log in</Link>
          <Link to="/login?signup=true" className={styles.navSignup}>Join</Link>
        </div>
      </nav>

      {/* Chapter Progress Dots */}
      <div className={styles.progressDots}>
        {[0, 1, 2, 3, 4].map((i) => (
          <button
            key={i}
            className={`${styles.dot} ${activeChapter === i ? styles.activeDot : ''}`}
            onClick={() => scrollToChapter(i)}
            aria-label={`Go to chapter ${i + 1}`}
          />
        ))}
      </div>

      {/* Chapter 1: Opening */}
      <section className={`${styles.chapter} ${styles.chapter1}`}>
        <div className={styles.chapterBg}>
          <img src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=1920&q=80" alt="Family silhouette" />
          <div className={styles.bgOverlay}></div>
        </div>
        <div className={styles.chapterContent}>
          <h1 className={styles.headline}>
            Every family has a story<br />
            <span className={styles.highlight}>worth keeping</span>
          </h1>
          <p className={styles.subheadline}>
            The moments that matter. The places you've been together.
            The memories that make you, you.
          </p>
          <button
            className={styles.scrollPrompt}
            onClick={() => scrollToChapter(1)}
          >
            <span>Begin your story</span>
            <span className={styles.scrollArrow}>↓</span>
          </button>
        </div>
      </section>

      {/* Chapter 2: Relive Moments */}
      <section className={`${styles.chapter} ${styles.chapter2}`}>
        <div className={styles.chapterBg}>
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&q=80" alt="Sunset memories" />
          <div className={styles.bgOverlay}></div>
        </div>
        <div className={styles.splitContent}>
          <div className={styles.textSide}>
            <span className={styles.chapterNumber}>01</span>
            <h2 className={styles.chapterTitle}>
              Relive the moments<br />that matter
            </h2>
            <p className={styles.chapterDesc}>
              From your daughter's first steps to your parents' 50th anniversary.
              From weekend camping trips to once-in-a-lifetime adventures.
              Every moment deserves to be remembered.
            </p>
          </div>
          <div className={styles.visualSide}>
            <div className={styles.eventPreview}>
              <div className={styles.previewHeader}>
                <img src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80" alt="Wedding" />
                <div className={styles.previewOverlay}>
                  <h3>Sarah & Michael's Wedding</h3>
                  <p>Napa Valley • June 2024</p>
                </div>
              </div>
              <div className={styles.previewGallery}>
                <img src="https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=200&q=80" alt="Ceremony" />
                <img src="https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=200&q=80" alt="Reception" />
                <img src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=200&q=80" alt="Dance" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chapter 3: Stay Close */}
      <section className={`${styles.chapter} ${styles.chapter3}`}>
        <div className={styles.chapterBg}>
          <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80" alt="World connections" />
          <div className={styles.bgOverlay}></div>
        </div>
        <div className={styles.splitContent}>
          <div className={styles.visualSide}>
            <div className={styles.mapVisualization}>
              <div className={styles.mapGlobe}>
                <img src="https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=800&q=80" alt="Map" />
                <div className={styles.mapPins}>
                  <div className={styles.pinPulse} style={{ top: '30%', left: '20%' }}>📍</div>
                  <div className={styles.pinPulse} style={{ top: '40%', left: '55%' }}>📍</div>
                  <div className={styles.pinPulse} style={{ top: '60%', left: '75%' }}>📍</div>
                </div>
                <svg className={styles.connectionLines} viewBox="0 0 400 300">
                  <path d="M 80 90 Q 200 50 220 120" stroke="url(#lineGrad)" strokeWidth="2" fill="none" strokeDasharray="4,4">
                    <animate attributeName="stroke-dashoffset" from="8" to="0" dur="1s" repeatCount="indefinite"/>
                  </path>
                  <path d="M 220 120 Q 280 180 300 180" stroke="url(#lineGrad)" strokeWidth="2" fill="none" strokeDasharray="4,4">
                    <animate attributeName="stroke-dashoffset" from="8" to="0" dur="1s" repeatCount="indefinite"/>
                  </path>
                  <defs>
                    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#667eea" />
                      <stop offset="100%" stopColor="#f093fb" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
          <div className={styles.textSide}>
            <span className={styles.chapterNumber}>02</span>
            <h2 className={styles.chapterTitle}>
              Stay close,<br />no matter the distance
            </h2>
            <p className={styles.chapterDesc}>
              Your sister in Tokyo. Your parents in Florida. Your cousin backpacking through Europe.
              See their adventures unfold on the map. Watch their journeys. Stay connected across any distance.
            </p>
          </div>
        </div>
      </section>

      {/* Chapter 4: Privacy */}
      <section className={`${styles.chapter} ${styles.chapter4}`}>
        <div className={styles.chapterBg}>
          <div className={styles.gradientBg}></div>
        </div>
        <div className={styles.centeredContent}>
          <span className={styles.chapterNumber}>03</span>
          <h2 className={styles.chapterTitle}>
            Your memories.<br />Your privacy.
          </h2>
          <div className={styles.privacyPoints}>
            <div className={styles.privacyPoint}>
              <span className={styles.privacyIcon}>🔒</span>
              <div>
                <h3>Private by default</h3>
                <p>Share only with the family members you choose</p>
              </div>
            </div>
            <div className={styles.privacyPoint}>
              <span className={styles.privacyIcon}>🚫</span>
              <div>
                <h3>No ads. No data selling.</h3>
                <p>Your memories are not a product</p>
              </div>
            </div>
            <div className={styles.privacyPoint}>
              <span className={styles.privacyIcon}>👨‍👩‍👧‍👦</span>
              <div>
                <h3>Built by a family</h3>
                <p>We understand what matters to you</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chapter 5: CTA */}
      <section className={`${styles.chapter} ${styles.chapter5}`}>
        <div className={styles.chapterBg}>
          <img src="https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1920&q=80" alt="Family future" />
          <div className={styles.bgOverlay}></div>
          <div className={styles.warmOverlay}></div>
        </div>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>
            Your story starts here
          </h2>
          <p className={styles.ctaSubtitle}>
            Join families around the world keeping their memories alive
          </p>
          <div className={styles.ctaPricing}>
            <div className={styles.pricingOption}>
              <h3>Free</h3>
              <p className={styles.priceTag}>$0/forever</p>
              <p>View all shared events, like & comment</p>
              <Link to="/login" className={styles.ctaBtnSecondary}>Get Started</Link>
            </div>
            <div className={`${styles.pricingOption} ${styles.featured}`}>
              <span className={styles.popular}>Most Popular</span>
              <h3>Pro</h3>
              <p className={styles.priceTag}>$9/month</p>
              <p>Unlimited events, photos, videos & more</p>
              <Link to="/login?signup=true" className={styles.ctaBtn}>Start Free Trial</Link>
            </div>
            <div className={styles.pricingOption}>
              <h3>Lifetime</h3>
              <p className={styles.priceTag}>$294 once</p>
              <p>Everything in Pro, pay once forever</p>
              <Link to="/login?signup=true" className={styles.ctaBtnSecondary}>Get Lifetime</Link>
            </div>
          </div>
          <p className={styles.ctaNote}>30-day free trial • No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <span className={styles.footerLogo}>Our Family Socials</span>
          <div className={styles.footerLinks}>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/faq">Help</Link>
          </div>
          <p className={styles.copyright}>© 2025 Our Family Socials</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingV2
