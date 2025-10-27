import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import styles from './Landing.module.css'

function Landing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState('annual') // 'monthly' or 'annual'

  useEffect(() => {
    if (user) {
      navigate('/feed')
    }
  }, [user, navigate])

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setMobileMenuOpen(false)
    }
  }

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <h1 className={styles.logo}>Our Family Socials</h1>

          {/* Desktop Menu */}
          <div className={styles.navMenu}>
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a>
            <a href="#pricing" onClick={(e) => { e.preventDefault(); scrollToSection('pricing'); }}>Pricing</a>
          </div>

          <div className={styles.navActions}>
            <Link to="/login" className={styles.navLogin}>Log in</Link>
            <Link to="/login" className={styles.navSignup}>Sign up free</Link>
          </div>

          {/* Hamburger for Mobile */}
          <button
            className={styles.hamburger}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={styles.mobileMenuOverlay} onClick={() => setMobileMenuOpen(false)}>
            <div className={styles.mobileMenu} onClick={(e) => e.stopPropagation()}>
              <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a>
              <a href="#pricing" onClick={(e) => { e.preventDefault(); scrollToSection('pricing'); }}>Pricing</a>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Sign up free</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Never miss your family's<br />
            <span className={styles.heroGradient}>greatest adventures</span>
          </h1>
          <p className={styles.heroSubtitle}>
            From weekend getaways to once-in-a-lifetime trips, keep up with what your family is doing.
            See where they've been, relive the moments, and stay connected across any distance.
          </p>
          <div className={styles.heroButtons}>
            <Link to="/login" className={styles.primaryBtn}>Start for free</Link>
            <a href="#features" className={styles.secondaryBtn}>See how it works →</a>
          </div>
          <p className={styles.heroNote}>Free forever • 5 events included • No credit card</p>
        </div>

        {/* Hero Screenshot */}
        <div className={styles.heroScreenshot}>
          <div className={styles.screenshotWindow}>
            {/* Real event page demo */}
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
        </div>
      </section>

      {/* Feature: Follow Family */}
      <section id="features" className={styles.feature}>
        <div className={styles.featureContent}>
          <div className={styles.featureText}>
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
          </div>
          <div className={styles.featureVisual}>
            <div className={styles.feedMockup}>
              {/* Feed cards */}
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
                    <div className={styles.feedDate}>5 days ago • Yosemite National Park</div>
                  </div>
                </div>
                <div className={styles.feedImage}>
                  <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80" alt="Mountain" />
                </div>
                <div className={styles.feedTitle}>Epic Hiking Weekend ⛰️</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature: Rich Events */}
      <section className={styles.feature}>
        <div className={`${styles.featureContent} ${styles.reverse}`}>
          <div className={styles.featureVisual}>
            <div className={styles.eventMockup}>
              <div className={styles.eventHeaderLarge}>
                <img src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600&q=80" alt="Wedding" />
                <div className={styles.eventHeaderOverlay}>
                  <h3>Sarah & Michael's Wedding Day</h3>
                  <p>June 15, 2024 • Napa Valley, California</p>
                </div>
              </div>
              <div className={styles.eventContentArea}>
                <div className={styles.eventStory}>
                  <p>A perfect sunny day surrounded by vineyards, family, and friends. The ceremony was beautiful, and the reception went late into the night with dancing under the stars. So grateful to everyone who celebrated with us!</p>
                </div>
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
          </div>
          <div className={styles.featureText}>
            <span className={styles.badge}>Rich Storytelling</span>
            <h2 className={styles.featureTitle}>
              Every adventure deserves<br />more than one photo
            </h2>
            <p className={styles.featureDesc}>
              Create beautiful event pages with photo galleries, stories, and all the details.
              Document your European road trip, your kid's graduation, or your anniversary dinner
              with all the context that makes it special.
            </p>
            <ul className={styles.featureList}>
              <li>Photo galleries with lightbox viewing</li>
              <li>Rich text for detailed stories</li>
              <li>Comments and likes from family</li>
              <li>Share as much or as little as you want</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Feature: Journey Maps */}
      <section className={styles.feature}>
        <div className={styles.featureContent}>
          <div className={styles.featureText}>
            <span className={styles.badge}>Maps & Timeline</span>
            <h2 className={styles.featureTitle}>
              Watch your family's<br />adventures unfold
            </h2>
            <p className={styles.featureDesc}>
              See every trip on an interactive map. Track your family's travels from Tokyo to Paris
              to Iceland. View journey maps with location markers, or explore the timeline to watch
              years of memories unfold chronologically.
            </p>
            <ul className={styles.featureList}>
              <li>Interactive world map with all events</li>
              <li>Journey maps showing multi-location trips</li>
              <li>Timeline view organized by year</li>
              <li>Filter by person, place, or date</li>
            </ul>
          </div>
          <div className={styles.featureVisual}>
            <div className={styles.mapMockup}>
              <div className={styles.mapContainer}>
                {/* Map background image - physical map with pins */}
                <img
                  src="https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=1200&q=80"
                  alt="World Map with Pins"
                  className={styles.mapBackground}
                />
                {/* Dark overlay for better pin visibility */}
                <div className={styles.mapOverlay}></div>
                {/* Flight path overlay */}
                <svg className={styles.flightPath} viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 120 180 Q 250 120, 360 160 T 480 200"
                        stroke="url(#gradient)"
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray="8,8"
                        opacity="0.8">
                    <animate attributeName="stroke-dashoffset" from="16" to="0" dur="2s" repeatCount="indefinite"/>
                  </path>
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#667eea" />
                      <stop offset="50%" stopColor="#764ba2" />
                      <stop offset="100%" stopColor="#f093fb" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Location pins */}
                <div className={styles.mapPin} style={{ top: '45%', left: '20%' }} title="Paris">
                  <span>📍</span>
                </div>
                <div className={styles.mapPin} style={{ top: '40%', left: '60%' }} title="Tokyo">
                  <span>📍</span>
                </div>
                <div className={styles.mapPin} style={{ top: '65%', left: '48%' }} title="Kenya">
                  <span>📍</span>
                </div>
                <div className={styles.mapPin} style={{ top: '50%', left: '80%' }} title="New Zealand">
                  <span>📍</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section className={styles.privacySection}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>Your memories are yours</h2>
          <p className={styles.sectionSubtitle}>
            No ads. No data selling. No algorithms. Just a private space for your family.
          </p>
          <div className={styles.privacyGrid}>
            <div className={styles.privacyCard}>
              <div className={styles.privacyIcon}>🔒</div>
              <h3>Private by default</h3>
              <p>Every event is private. Share only with family you approve.</p>
            </div>
            <div className={styles.privacyCard}>
              <div className={styles.privacyIcon}>🚫</div>
              <h3>No ads, ever</h3>
              <p>We'll never sell your data or show ads. Your memories aren't a product.</p>
            </div>
            <div className={styles.privacyCard}>
              <div className={styles.privacyIcon}>👨‍👩‍👧‍👦</div>
              <h3>Built for families</h3>
              <p>Made by a family, for families. We get what matters to you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Photo Books */}
      <section className={styles.photoBooksSection}>
        <div className={styles.photoBookContent}>
          <div className={styles.photoBookText}>
            <h2 className={styles.photoBookTitle}>Turn events into photo books</h2>
            <p className={styles.photoBookDesc}>
              Your favorite trips and celebrations deserve to live beyond the screen.
              Turn any event into a professionally printed photo book.
            </p>
            <span className={styles.comingSoon}>Coming soon</span>
          </div>
          <div className={styles.photoBookVisual}>
            <div className={styles.bookMockup}>
              <img
                src="/images/photobooks.png"
                alt="Vacation Photo Album"
                className={styles.photoBookImage}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className={styles.pricingSection}>
        <div className={styles.pricingContent}>
          <h2 className={styles.sectionTitle}>Simple, transparent pricing</h2>
          <p className={styles.sectionSubtitle}>
            Start for free. Upgrade when you need more.
          </p>

          {/* Billing Toggle */}
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

          <div className={styles.pricingGrid}>
            {/* Free Tier */}
            <div className={styles.pricingCard}>
              <div className={styles.pricingHeader}>
                <h3>Free</h3>
                <div className={styles.price}>
                  <span className={styles.priceAmount}>$0</span>
                  <span className={styles.pricePeriod}>/month</span>
                </div>
                <p className={styles.pricingDesc}>Perfect for getting started</p>
              </div>
              <ul className={styles.pricingFeatures}>
                <li>5 events</li>
                <li>Unlimited photos per event</li>
                <li>Interactive maps</li>
                <li>Timeline view</li>
                <li>Comments & likes</li>
                <li>Follow family members</li>
              </ul>
              <Link to="/login" className={styles.pricingButton}>
                Get started free
              </Link>
            </div>

            {/* Premium Tier */}
            <div className={`${styles.pricingCard} ${styles.featured}`}>
              <div className={styles.popularBadge}>Most Popular</div>
              <div className={styles.pricingHeader}>
                <h3>Premium</h3>
                <div className={styles.price}>
                  <span className={styles.priceAmount}>{billingPeriod === 'annual' ? '$9' : '$12'}</span>
                  <span className={styles.pricePeriod}>/month</span>
                </div>
                <p className={styles.pricingDesc}>
                  {billingPeriod === 'annual' ? 'Billed annually at $108/year' : 'Billed monthly'}
                </p>
              </div>
              <ul className={styles.pricingFeatures}>
                <li><strong>Unlimited events</strong></li>
                <li>Everything in Free</li>
                <li>Photo books (coming soon)</li>
                <li>Custom event themes</li>
                <li>Priority support</li>
                <li>Export your data</li>
              </ul>
              <Link to="/checkout?plan=premium" className={styles.pricingButtonPrimary}>
                Upgrade to Premium
              </Link>
            </div>

            {/* Family Tier */}
            <div className={styles.pricingCard}>
              <div className={styles.pricingHeader}>
                <h3>Family</h3>
                <div className={styles.price}>
                  <span className={styles.priceAmount}>{billingPeriod === 'annual' ? '$19' : '$24'}</span>
                  <span className={styles.pricePeriod}>/month</span>
                </div>
                <p className={styles.pricingDesc}>
                  {billingPeriod === 'annual' ? 'Billed annually at $228/year' : 'Billed monthly'}
                </p>
              </div>
              <ul className={styles.pricingFeatures}>
                <li><strong>Everything in Premium</strong></li>
                <li>Up to 10 family accounts</li>
                <li>Shared family calendar</li>
                <li>Private family groups</li>
                <li>Admin controls</li>
                <li>Dedicated support</li>
              </ul>
              <Link to="/checkout?plan=family" className={styles.pricingButton}>
                Choose Family
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Start sharing your story today</h2>
          <p className={styles.ctaSubtitle}>
            Join families keeping their memories alive, together
          </p>
          <Link to="/login" className={styles.ctaButton}>Get started for free</Link>
          <p className={styles.ctaNote}>Free forever • 5 events • No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <h3>Our Family</h3>
            <p>Share your stories, preserve memories, and stay connected with the people who matter most.</p>
            <p>Built for families who value their shared experiences.</p>
          </div>

          <div className={styles.footerSection}>
            <h3>Explore</h3>
            <ul className={styles.footerLinks}>
              <li><a href="#features">Features</a></li>
              <li><Link to="/login">Create Event</Link></li>
              <li><Link to="/login">Your Profile</Link></li>
              <li><a href="#discover">Discover Stories</a></li>
            </ul>
          </div>

          <div className={styles.footerSection}>
            <h3>Support</h3>
            <ul className={styles.footerLinks}>
              <li><a href="#help">Help Center</a></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <div className={styles.footerCopyright}>
            © 2025 Our Family Socials. All rights reserved.
          </div>
          <div className={styles.footerSocial}>
            <a href="#twitter" aria-label="Twitter">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </a>
            <a href="#instagram" aria-label="Instagram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
              </svg>
            </a>
            <a href="#facebook" aria-label="Facebook">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
