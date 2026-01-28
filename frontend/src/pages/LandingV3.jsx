import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState, useRef } from 'react'
import styles from './LandingV3.module.css'

function useScrollAnimation() {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return [ref, isVisible]
}

function AnimatedElement({ children, className = '', delay = 0 }) {
  const [ref, isVisible] = useScrollAnimation()
  return (
    <div
      ref={ref}
      className={`${className} ${styles.fadeIn} ${isVisible ? styles.visible : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function LandingV3() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [billingPeriod, setBillingPeriod] = useState('annual')

  useEffect(() => {
    if (user) navigate('/feed')
  }, [user, navigate])

  const heroImages = [
    { src: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80', alt: 'Paris' },
    { src: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=600&q=80', alt: 'Tokyo' },
    { src: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80', alt: 'Wedding' },
    { src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80', alt: 'Mountain' },
    { src: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80', alt: 'Road Trip' },
    { src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80', alt: 'Dance' },
    { src: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&q=80', alt: 'Landscape' },
    { src: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&q=80', alt: 'Family' },
  ]

  return (
    <div className={styles.container}>
      {/* Nav */}
      <nav className={styles.nav}>
        <h1 className={styles.logo}>Our Family Socials</h1>
        <div className={styles.navActions}>
          <Link to="/login" className={styles.navLogin}>Log in</Link>
          <Link to="/login?signup=true" className={styles.navSignup}>Start free</Link>
        </div>
      </nav>

      {/* Hero with Masonry */}
      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          {heroImages.map((img, i) => (
            <div key={i} className={styles.heroImage} style={{ animationDelay: `${i * 100}ms` }}>
              <img src={img.src} alt={img.alt} loading="lazy" />
            </div>
          ))}
          <div className={styles.heroOverlay}></div>
        </div>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Your family's story,<br />beautifully told
          </h1>
          <p className={styles.heroSubtitle}>
            A private space for your most precious memories
          </p>
          <div className={styles.heroButtons}>
            <Link to="/login?signup=true" className={styles.primaryBtn}>Start for free</Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className={styles.statsBar}>
        <AnimatedElement className={styles.stat} delay={0}>
          <span className={styles.statNumber}>10,000+</span>
          <span className={styles.statLabel}>Families</span>
        </AnimatedElement>
        <AnimatedElement className={styles.stat} delay={100}>
          <span className={styles.statNumber}>500,000+</span>
          <span className={styles.statLabel}>Events</span>
        </AnimatedElement>
        <AnimatedElement className={styles.stat} delay={200}>
          <span className={styles.statNumber}>45+</span>
          <span className={styles.statLabel}>Countries</span>
        </AnimatedElement>
      </section>

      {/* Feature: Feed */}
      <section className={styles.featureSection}>
        <AnimatedElement className={styles.featureImage}>
          <img
            src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=1200&q=80"
            alt="Family connections"
          />
        </AnimatedElement>
        <AnimatedElement className={styles.featureCaption} delay={100}>
          <span className={styles.badge}>Stay Connected</span>
          <h2>Never miss a moment</h2>
          <p>See every birthday, vacation, and milestone from the people you love</p>
        </AnimatedElement>
      </section>

      {/* Feature: Event Pages */}
      <section className={styles.featureSection}>
        <AnimatedElement className={styles.featureImage}>
          <img
            src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80"
            alt="Wedding celebration"
          />
        </AnimatedElement>
        <AnimatedElement className={styles.featureCaption} delay={100}>
          <span className={styles.badge}>Rich Stories</span>
          <h2>More than just photos</h2>
          <p>Create beautiful event pages with galleries, stories, and memories</p>
        </AnimatedElement>
      </section>

      {/* Explore Grid */}
      <section className={styles.exploreSection}>
        <AnimatedElement className={styles.exploreHeader}>
          <h2>Explore moments</h2>
          <p>A glimpse into what families are sharing</p>
        </AnimatedElement>
        <div className={styles.exploreGrid}>
          {[
            { img: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&q=80', title: 'Road Trip 2024', author: 'The Wilsons' },
            { img: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=500&q=80', title: 'Roman Holiday', author: 'Sarah & Tom' },
            { img: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=500&q=80', title: 'Beach Week', author: 'The Martinez Family' },
            { img: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=500&q=80', title: 'Thanksgiving', author: 'Grandma Rose' },
            { img: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=500&q=80', title: 'Baby Shower', author: 'Emily & James' },
            { img: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=500&q=80', title: 'Tokyo Adventure', author: 'The Chen Family' },
          ].map((item, i) => (
            <AnimatedElement key={i} className={styles.exploreCard} delay={i * 50}>
              <div className={styles.cardImage}>
                <img src={item.img} alt={item.title} />
              </div>
              <div className={styles.cardContent}>
                <h3>{item.title}</h3>
                <p>{item.author}</p>
              </div>
            </AnimatedElement>
          ))}
        </div>
      </section>

      {/* Feature: Maps */}
      <section className={styles.featureSection}>
        <AnimatedElement className={styles.featureImage}>
          <img
            src="https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=1200&q=80"
            alt="World map"
          />
        </AnimatedElement>
        <AnimatedElement className={styles.featureCaption} delay={100}>
          <span className={styles.badge}>Interactive Maps</span>
          <h2>Track every adventure</h2>
          <p>See your family's travels unfold on beautiful interactive maps</p>
        </AnimatedElement>
      </section>

      {/* Photo Books Teaser */}
      <section className={styles.photoBookSection}>
        <AnimatedElement className={styles.photoBookContent}>
          <div className={styles.photoBookVisual}>
            <img src="/images/photobooks.png" alt="Photo book" />
          </div>
          <div className={styles.photoBookText}>
            <span className={styles.comingSoon}>Coming Soon</span>
            <h2>Turn memories into keepsakes</h2>
            <p>
              Create professionally printed photo books from your favorite events.
              Because some memories deserve to live beyond the screen.
            </p>
          </div>
        </AnimatedElement>
      </section>

      {/* Pricing */}
      <section className={styles.pricingSection}>
        <AnimatedElement className={styles.pricingHeader}>
          <h2>Simple pricing</h2>
          <p>Start free, upgrade when you're ready</p>
          <div className={styles.billingToggle}>
            <button
              className={billingPeriod === 'monthly' ? styles.active : ''}
              onClick={() => setBillingPeriod('monthly')}
            >Monthly</button>
            <button
              className={billingPeriod === 'annual' ? styles.active : ''}
              onClick={() => setBillingPeriod('annual')}
            >Annual <span className={styles.save}>-25%</span></button>
          </div>
        </AnimatedElement>
        <div className={styles.pricingGrid}>
          <AnimatedElement className={styles.pricingCard}>
            <h3>Free</h3>
            <div className={styles.price}>$0<span>/forever</span></div>
            <ul>
              <li>View all shared events</li>
              <li>Like and comment</li>
              <li>Follow family</li>
              <li>30-day Pro trial</li>
            </ul>
            <Link to="/login" className={styles.pricingBtn}>Get started</Link>
          </AnimatedElement>
          <AnimatedElement className={`${styles.pricingCard} ${styles.featured}`} delay={100}>
            <span className={styles.popular}>Popular</span>
            <h3>Pro</h3>
            <div className={styles.price}>${billingPeriod === 'annual' ? '9' : '12'}<span>/month</span></div>
            <ul>
              <li><strong>Unlimited events</strong></li>
              <li>Photo & video uploads</li>
              <li>Journey maps</li>
              <li>GPS extraction</li>
              <li>Privacy controls</li>
            </ul>
            <Link to="/login?signup=true" className={styles.pricingBtnPrimary}>Start trial</Link>
          </AnimatedElement>
          <AnimatedElement className={styles.pricingCard} delay={200}>
            <h3>Lifetime</h3>
            <div className={styles.price}>$294<span> once</span></div>
            <ul>
              <li><strong>Everything in Pro</strong></li>
              <li>No recurring fees</li>
              <li>All future updates</li>
              <li>Priority support</li>
            </ul>
            <Link to="/login?signup=true" className={styles.pricingBtn}>Get lifetime</Link>
          </AnimatedElement>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <AnimatedElement className={styles.ctaContent}>
          <h2>Start preserving your story</h2>
          <Link to="/login?signup=true" className={styles.ctaBtn}>Get started for free</Link>
          <p>No credit card required</p>
        </AnimatedElement>
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
          <p>© 2025 Our Family Socials</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingV3
