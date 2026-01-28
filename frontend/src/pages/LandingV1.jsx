import { Link } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import styles from './LandingV1.module.css'

// Custom hook for scroll-triggered animations
function useScrollAnimation() {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return [ref, isVisible]
}

function AnimatedSection({ children, className = '', delay = 0 }) {
  const [ref, isVisible] = useScrollAnimation()

  return (
    <div
      ref={ref}
      className={`${className} ${styles.animated} ${isVisible ? styles.visible : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function LandingV1() {
  const [billingPeriod, setBillingPeriod] = useState('annual')

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <h1 className={styles.logo}>Our Family Socials</h1>
          <div className={styles.navMenu}>
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a>
            <a href="#pricing" onClick={(e) => { e.preventDefault(); scrollToSection('pricing'); }}>Pricing</a>
          </div>
          <div className={styles.navActions}>
            <Link to="/login" className={styles.navLogin}>Log in</Link>
            <Link to="/login?signup=true" className={styles.navSignup}>Sign up free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <AnimatedSection className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Never miss your family's
            <span className={styles.heroGradient}> greatest adventures</span>
          </h1>
          <p className={styles.heroSubtitle}>
            From weekend getaways to once-in-a-lifetime trips, keep up with what your family is doing.
            See where they've been, relive the moments, and stay connected across any distance.
          </p>
          <div className={styles.heroButtons}>
            <Link to="/login?signup=true" className={styles.primaryBtn}>Start for free</Link>
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }} className={styles.secondaryBtn}>
              See how it works
              <span className={styles.btnArrow}>→</span>
            </a>
          </div>
          <p className={styles.heroNote}>Free forever • 5 events included • No credit card</p>
        </AnimatedSection>

        <AnimatedSection className={styles.heroScreenshot} delay={200}>
          <div className={styles.screenshotWindow}>
            <div className={styles.eventHeader}>
              <img src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80" alt="European Adventure" />
              <div className={styles.eventHeaderOverlay}>
                <h3>European Adventure - Paris & Rome</h3>
                <p>Sarah Wilson • August 2024 • 21 days</p>
              </div>
            </div>
            <div className={styles.eventBody}>
              <div className={styles.eventTitle}>Three weeks exploring historic cities</div>
              <div className={styles.eventMeta}>Paris, France → Rome, Italy</div>
              <div className={styles.eventPhotos}>
                <div className={styles.photo}>
                  <img src="https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=400&q=80" alt="Eiffel Tower" />
                </div>
                <div className={styles.photo}>
                  <img src="https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&q=80" alt="Colosseum" />
                </div>
                <div className={styles.photo}>
                  <img src="https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&q=80" alt="Paris Street" />
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Privacy/Trust Section - Moved Up */}
      <section className={styles.privacySection}>
        <AnimatedSection className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>Your memories are yours</h2>
          <p className={styles.sectionSubtitle}>
            No ads. No data selling. No algorithms. Just a private space for your family.
          </p>
        </AnimatedSection>
        <div className={styles.privacyGrid}>
          <AnimatedSection className={styles.privacyCard} delay={0}>
            <div className={styles.privacyIcon}>🔒</div>
            <h3>Private by default</h3>
            <p>Every event is private. Share only with family you approve.</p>
          </AnimatedSection>
          <AnimatedSection className={styles.privacyCard} delay={100}>
            <div className={styles.privacyIcon}>🚫</div>
            <h3>No ads, ever</h3>
            <p>We'll never sell your data or show ads. Your memories aren't a product.</p>
          </AnimatedSection>
          <AnimatedSection className={styles.privacyCard} delay={200}>
            <div className={styles.privacyIcon}>👨‍👩‍👧‍👦</div>
            <h3>Built for families</h3>
            <p>Made by a family, for families. We get what matters to you.</p>
          </AnimatedSection>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.featuresSection}>
        {/* Feature 1: Follow Family */}
        <div className={styles.feature}>
          <AnimatedSection className={styles.featureText}>
            <span className={styles.badge}>Stay Connected</span>
            <h2 className={styles.featureTitle}>
              See what your family<br />is up to, always
            </h2>
            <p className={styles.featureDesc}>
              Follow your closest family and friends. Never miss a birthday party, graduation,
              vacation, or Sunday dinner. See everything they share in one beautiful feed.
            </p>
            <ul className={styles.featureList}>
              <li>Chronological feed - no algorithm hiding posts</li>
              <li>Follow family members you care about</li>
              <li>Get notified about major life events</li>
              <li>Private and ad-free</li>
            </ul>
          </AnimatedSection>
          <AnimatedSection className={styles.featureVisual} delay={150}>
            <div className={styles.feedMockup}>
              <div className={styles.feedCard}>
                <div className={styles.feedHeader}>
                  <div className={styles.feedAvatar}>
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" alt="Sarah" />
                  </div>
                  <div className={styles.feedInfo}>
                    <div className={styles.feedName}>Sarah Wilson</div>
                    <div className={styles.feedDate}>2 days ago • Tokyo, Japan</div>
                  </div>
                </div>
                <div className={styles.feedImage}>
                  <img src="https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80" alt="Tokyo" />
                </div>
                <div className={styles.feedTitle}>Cherry Blossom Festival 🌸</div>
              </div>
              <div className={styles.feedCard}>
                <div className={styles.feedHeader}>
                  <div className={styles.feedAvatar}>
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Tom" alt="Tom" />
                  </div>
                  <div className={styles.feedInfo}>
                    <div className={styles.feedName}>Tom Wilson</div>
                    <div className={styles.feedDate}>5 days ago • Yosemite</div>
                  </div>
                </div>
                <div className={styles.feedImage}>
                  <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80" alt="Mountain" />
                </div>
                <div className={styles.feedTitle}>Epic Hiking Weekend ⛰️</div>
              </div>
            </div>
          </AnimatedSection>
        </div>

        {/* Feature 2: Rich Events */}
        <div className={`${styles.feature} ${styles.reverse}`}>
          <AnimatedSection className={styles.featureVisual} delay={150}>
            <div className={styles.eventMockup}>
              <div className={styles.eventHeaderLarge}>
                <img src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600&q=80" alt="Wedding" />
                <div className={styles.eventHeaderOverlay}>
                  <h3>Sarah & Michael's Wedding Day</h3>
                  <p>June 15, 2024 • Napa Valley, California</p>
                </div>
              </div>
              <div className={styles.eventContentArea}>
                <div className={styles.galleryGrid}>
                  <div className={styles.galleryImg}>
                    <img src="https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400&q=80" alt="Ceremony" />
                  </div>
                  <div className={styles.galleryImg}>
                    <img src="https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&q=80" alt="Reception" />
                  </div>
                  <div className={styles.galleryImg}>
                    <img src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=80" alt="Dance" />
                  </div>
                  <div className={styles.galleryImg}>
                    <img src="https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=400&q=80" alt="Sunset" />
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
          <AnimatedSection className={styles.featureText}>
            <span className={styles.badge}>Rich Storytelling</span>
            <h2 className={styles.featureTitle}>
              Every adventure deserves<br />more than one photo
            </h2>
            <p className={styles.featureDesc}>
              Create beautiful event pages with photo galleries, stories, and all the details.
              Document your road trip, graduation, or anniversary with all the context that makes it special.
            </p>
            <ul className={styles.featureList}>
              <li>Photo galleries with lightbox viewing</li>
              <li>Rich text for detailed stories</li>
              <li>Comments and likes from family</li>
              <li>Share as much or as little as you want</li>
            </ul>
          </AnimatedSection>
        </div>

        {/* Feature 3: Maps */}
        <div className={styles.feature}>
          <AnimatedSection className={styles.featureText}>
            <span className={styles.badge}>Maps & Timeline</span>
            <h2 className={styles.featureTitle}>
              Watch your family's<br />adventures unfold
            </h2>
            <p className={styles.featureDesc}>
              See every trip on an interactive map. Track your family's travels from Tokyo to Paris
              to Iceland. View journey maps with location markers, or explore the timeline.
            </p>
            <ul className={styles.featureList}>
              <li>Interactive world map with all events</li>
              <li>Journey maps showing multi-location trips</li>
              <li>Timeline view organized by year</li>
              <li>Filter by person, place, or date</li>
            </ul>
          </AnimatedSection>
          <AnimatedSection className={styles.featureVisual} delay={150}>
            <div className={styles.mapMockup}>
              <div className={styles.mapContainer}>
                <img
                  src="https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=1200&q=80"
                  alt="World Map with Pins"
                  className={styles.mapBackground}
                />
                <div className={styles.mapOverlay}></div>
                <svg className={styles.flightPath} viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 120 180 Q 250 120, 360 160 T 480 200"
                        stroke="url(#gradient1)"
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray="8,8"
                        opacity="0.8">
                    <animate attributeName="stroke-dashoffset" from="16" to="0" dur="2s" repeatCount="indefinite"/>
                  </path>
                  <defs>
                    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#667eea" />
                      <stop offset="100%" stopColor="#764ba2" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className={styles.mapPin} style={{ top: '45%', left: '20%' }}><span>📍</span></div>
                <div className={styles.mapPin} style={{ top: '40%', left: '60%' }}><span>📍</span></div>
                <div className={styles.mapPin} style={{ top: '65%', left: '48%' }}><span>📍</span></div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className={styles.pricingSection}>
        <AnimatedSection className={styles.pricingHeader}>
          <h2 className={styles.sectionTitle}>Simple, transparent pricing</h2>
          <p className={styles.sectionSubtitle}>
            Start for free. Upgrade when you need more.
          </p>

          <div className={styles.billingToggle}>
            <button
              className={billingPeriod === 'monthly' ? styles.toggleActive : ''}
              onClick={() => setBillingPeriod('monthly')}
            >
              Monthly
            </button>
            <button
              className={billingPeriod === 'annual' ? styles.toggleActive : ''}
              onClick={() => setBillingPeriod('annual')}
            >
              Annual <span className={styles.saveBadge}>Save 25%</span>
            </button>
          </div>
        </AnimatedSection>

        <div className={styles.pricingGrid}>
          <AnimatedSection className={styles.pricingCard} delay={0}>
            <div className={styles.pricingCardHeader}>
              <h3>Free</h3>
              <div className={styles.price}>
                <span className={styles.priceAmount}>$0</span>
                <span className={styles.pricePeriod}>/forever</span>
              </div>
              <p>Perfect for family viewers</p>
            </div>
            <ul className={styles.pricingFeatures}>
              <li>View all shared events</li>
              <li>Like and comment</li>
              <li>Follow family members</li>
              <li>Interactive maps & timeline</li>
              <li>30-day Pro trial</li>
            </ul>
            <Link to="/login" className={styles.pricingButton}>Get started free</Link>
          </AnimatedSection>

          <AnimatedSection className={`${styles.pricingCard} ${styles.featured}`} delay={100}>
            <div className={styles.popularBadge}>Most Popular</div>
            <div className={styles.pricingCardHeader}>
              <h3>Pro</h3>
              <div className={styles.price}>
                <span className={styles.priceAmount}>{billingPeriod === 'annual' ? '$9' : '$12'}</span>
                <span className={styles.pricePeriod}>/month</span>
              </div>
              <p>{billingPeriod === 'annual' ? 'Billed annually' : 'Billed monthly'}</p>
            </div>
            <ul className={styles.pricingFeatures}>
              <li><strong>Unlimited events</strong></li>
              <li>Photo and video uploads</li>
              <li>Journey mapping</li>
              <li>GPS extraction from photos</li>
              <li>Privacy controls</li>
              <li>Rich text editor</li>
            </ul>
            <Link to="/login?signup=true" className={styles.pricingButtonPrimary}>Start Free Trial</Link>
          </AnimatedSection>

          <AnimatedSection className={styles.pricingCard} delay={200}>
            <div className={styles.pricingCardHeader}>
              <h3>Lifetime</h3>
              <div className={styles.price}>
                <span className={styles.priceAmount}>$294</span>
                <span className={styles.pricePeriod}>once</span>
              </div>
              <p>Pay once, use forever</p>
            </div>
            <ul className={styles.pricingFeatures}>
              <li><strong>Everything in Pro</strong></li>
              <li>No recurring fees</li>
              <li>All future updates</li>
              <li>Priority support</li>
              <li>Early access to features</li>
            </ul>
            <Link to="/login?signup=true" className={styles.pricingButton}>Get Lifetime Access</Link>
          </AnimatedSection>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <AnimatedSection className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Start sharing your story today</h2>
          <p className={styles.ctaSubtitle}>
            Join families keeping their memories alive, together
          </p>
          <Link to="/login?signup=true" className={styles.ctaButton}>Get started for free</Link>
          <p className={styles.ctaNote}>Free forever • No credit card required</p>
        </AnimatedSection>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <h3>Our Family Socials</h3>
            <p>Share your stories, preserve memories, and stay connected with the people who matter most.</p>
          </div>
          <div className={styles.footerLinks}>
            <Link to="/feed">Feed</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/faq">Help</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>© 2025 Our Family Socials. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingV1
