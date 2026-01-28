import { Link } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import styles from './LandingV8.module.css'

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

function FadeIn({ children, className = '', delay = 0 }) {
  const [ref, inView] = useInView()
  return (
    <div
      ref={ref}
      className={`${className} ${styles.fadeIn} ${inView ? styles.visible : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function LandingV8() {
  const testimonials = [
    { quote: "Finally a place where our family photos aren't mixed with ads and politics.", author: "The Martinez Family", location: "California" },
    { quote: "We use it to stay connected with grandparents who live across the country.", author: "Sarah W.", location: "New York" },
    { quote: "The journey maps feature is amazing for documenting our road trips.", author: "Tom & Emily", location: "Colorado" },
  ]

  const activityItems = [
    { name: 'Sarah Wilson', action: 'shared', event: 'Cherry Blossom Festival', time: '2 min ago' },
    { name: 'The Chen Family', action: 'created', event: 'Summer Road Trip 2024', time: '15 min ago' },
    { name: 'Emily Johnson', action: 'shared', event: 'Baby Emma\'s First Birthday', time: '1 hour ago' },
    { name: 'Tom & Lisa', action: 'created', event: 'Anniversary Weekend', time: '2 hours ago' },
    { name: 'The Park Family', action: 'shared', event: 'Thanksgiving 2024', time: '3 hours ago' },
    { name: 'Mike Roberts', action: 'created', event: 'Ski Trip to Aspen', time: '5 hours ago' },
  ]

  return (
    <div className={styles.container}>
      {/* Nav */}
      <nav className={styles.nav}>
        <span className={styles.logo}>Our Family Socials</span>
        <div className={styles.navLinks}>
          <Link to="/login">Log in</Link>
          <Link to="/login?signup=true" className={styles.navCta}>Join free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <FadeIn className={styles.heroContent}>
          <div className={styles.communityBadge}>
            <span className={styles.avatarStack}>
              {[1, 2, 3, 4, 5].map(i => (
                <img key={i} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`} alt="" />
              ))}
            </span>
            <span>Join 10,000+ families</span>
          </div>
          <h1 className={styles.heroTitle}>
            Your family's story,<br />
            shared <span className={styles.highlight}>together</span>
          </h1>
          <p className={styles.heroSubtitle}>
            A private social network for families who want to share moments,
            preserve memories, and stay connected - without the noise.
          </p>
          <div className={styles.heroActions}>
            <Link to="/login?signup=true" className={styles.primaryBtn}>Start for free</Link>
            <Link to="/login" className={styles.secondaryBtn}>Log in</Link>
          </div>
        </FadeIn>

        {/* Activity Ticker */}
        <div className={styles.tickerWrapper}>
          <div className={styles.ticker}>
            {[...activityItems, ...activityItems].map((item, i) => (
              <div key={i} className={styles.tickerItem}>
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.name}`} alt="" className={styles.tickerAvatar} />
                <span><strong>{item.name}</strong> {item.action} "{item.event}"</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className={styles.trustBadges}>
        <FadeIn className={styles.badge} delay={0}>
          <span className={styles.badgeIcon}>🔒</span>
          <span>Private by default</span>
        </FadeIn>
        <FadeIn className={styles.badge} delay={100}>
          <span className={styles.badgeIcon}>🚫</span>
          <span>No ads, ever</span>
        </FadeIn>
        <FadeIn className={styles.badge} delay={200}>
          <span className={styles.badgeIcon}>👨‍👩‍👧‍👦</span>
          <span>Family-built</span>
        </FadeIn>
      </section>

      {/* Features with Testimonial */}
      <section className={styles.features}>
        <FadeIn className={styles.featureBlock}>
          <h2>"What our families love"</h2>
          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>📱</span>
              <h3>Beautiful Feed</h3>
              <p>See everything your family shares in one clean, chronological feed.</p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>🎉</span>
              <h3>Rich Event Pages</h3>
              <p>Photo galleries, stories, maps - capture every detail.</p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>🗺️</span>
              <h3>Journey Maps</h3>
              <p>Track adventures across the globe on interactive maps.</p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>🔔</span>
              <h3>Stay Updated</h3>
              <p>Never miss a birthday, vacation, or special moment.</p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Testimonials */}
      <section className={styles.testimonials}>
        <FadeIn className={styles.testimonialHeader}>
          <h2>Loved by families everywhere</h2>
        </FadeIn>
        <div className={styles.testimonialGrid}>
          {testimonials.map((t, i) => (
            <FadeIn key={i} className={styles.testimonialCard} delay={i * 100}>
              <p className={styles.quote}>"{t.quote}"</p>
              <div className={styles.author}>
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${t.author}`} alt="" />
                <div>
                  <span className={styles.authorName}>{t.author}</span>
                  <span className={styles.authorLocation}>{t.location}</span>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Avatar Grid */}
      <section className={styles.community}>
        <FadeIn className={styles.communityContent}>
          <h2>Join our growing community</h2>
          <div className={styles.avatarGrid}>
            {Array.from({ length: 24 }).map((_, i) => (
              <img
                key={i}
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=member${i}`}
                alt=""
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        </FadeIn>
      </section>

      {/* Pricing */}
      <section className={styles.pricing}>
        <FadeIn className={styles.pricingHeader}>
          <h2>Simple, fair pricing</h2>
          <p>Start free, upgrade when you're ready</p>
        </FadeIn>
        <div className={styles.pricingGrid}>
          <FadeIn className={styles.pricingCard} delay={0}>
            <h3>Free</h3>
            <div className={styles.price}>$0</div>
            <ul>
              <li>View all events</li>
              <li>Like & comment</li>
              <li>Follow family</li>
            </ul>
            <Link to="/login" className={styles.pricingBtn}>Get started</Link>
          </FadeIn>
          <FadeIn className={`${styles.pricingCard} ${styles.featured}`} delay={100}>
            <span className={styles.popular}>Most popular</span>
            <h3>Pro</h3>
            <div className={styles.price}>$9<span>/mo</span></div>
            <ul>
              <li><strong>Unlimited events</strong></li>
              <li>Photo & video</li>
              <li>Journey maps</li>
              <li>Privacy controls</li>
            </ul>
            <Link to="/login?signup=true" className={styles.pricingBtnPrimary}>Start trial</Link>
          </FadeIn>
          <FadeIn className={styles.pricingCard} delay={200}>
            <h3>Lifetime</h3>
            <div className={styles.price}>$294</div>
            <ul>
              <li>Everything in Pro</li>
              <li>Forever access</li>
              <li>Future updates</li>
            </ul>
            <Link to="/login?signup=true" className={styles.pricingBtn}>Get lifetime</Link>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <FadeIn className={styles.ctaContent}>
          <h2>Ready to join?</h2>
          <p>Start preserving your family's story today.</p>
          <Link to="/login?signup=true" className={styles.ctaBtn}>Get started for free</Link>
        </FadeIn>
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

export default LandingV8
