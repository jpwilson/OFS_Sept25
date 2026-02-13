import { Link } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import styles from './LandingV9.module.css'

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

function LandingV9() {
  const [billingPeriod, setBillingPeriod] = useState('annual')

  return (
    <div className={styles.container}>
      {/* Admin Back Button */}
      <Link to="/admin" className={styles.adminBackBtn}>
        ← Back to Admin
      </Link>

      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <span className={styles.logo}>Our Family Socials</span>
          <div className={styles.navLinks}>
            <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }}>Features</a>
            <a href="#pricing" onClick={(e) => { e.preventDefault(); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }) }}>Pricing</a>
            <Link to="/login">Log in</Link>
            <Link to="/login?signup=true" className={styles.navCta}>Sign up free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <FadeIn>
            <h1 className={styles.heroTitle}>
              Your family isn't as far apart<br />
              <span className={styles.heroGradient}>as it feels</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Birthdays, road trips, Sunday dinners, first steps — the moments that
              matter most get lost in the noise of social media. Our Family Socials
              is the private space where your family stays connected, no matter the distance.
            </p>
            <div className={styles.heroActions}>
              <Link to="/login?signup=true" className={styles.primaryBtn}>Start for free</Link>
              <a href="#features" className={styles.secondaryBtn} onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }}>See how it works</a>
            </div>
            <p className={styles.heroNote}>Free forever &bull; No ads, ever &bull; No algorithm</p>
          </FadeIn>
        </div>

        {/* Hero: Event Preview Mockup — looks like the real app */}
        <FadeIn className={styles.heroVisual} delay={200}>
          <div className={styles.appPreview}>
            <div className={styles.appHeroImage} style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1527525443983-6e60c75fff46?w=1200&q=80)' }}>
              <div className={styles.appHeroOverlay}>
                <h3 className={styles.appEventTitle}>Thanksgiving at Grandma's</h3>
                <p className={styles.appEventMeta}>Sarah Wilson &bull; November 2024 &bull; Austin, TX</p>
              </div>
            </div>
            <div className={styles.appEventContent}>
              <p className={styles.appEventText}>
                The whole family made it this year — all four generations around one table. Grandma
                made her famous pecan pie and the kids put on a talent show after dinner. Uncle Mike
                brought his guitar and we sang until the stars came out...
              </p>
              <div className={styles.appEventPhotos}>
                <img src="https://images.unsplash.com/photo-1612949059443-e706f4c0f41a?w=300&q=80" alt="Family cooking" />
                <img src="https://images.unsplash.com/photo-1580061815194-5ffa5ac126f0?w=300&q=80" alt="Grandparents reading" />
                <img src="https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?w=300&q=80" alt="Thanksgiving table" />
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Photo Mosaic — warm family moments */}
      <section className={styles.mosaicSection}>
        <FadeIn>
          <div className={styles.mosaicGrid}>
            <div className={styles.mosaicItem}>
              <img src="https://images.unsplash.com/photo-1498252538543-fc27aee78db2?w=600&q=80" alt="Father and son hiking" />
            </div>
            <div className={styles.mosaicItem}>
              <img src="https://images.unsplash.com/photo-1609220136736-443140cffec6?w=400&q=80" alt="Family video call" />
            </div>
            <div className={styles.mosaicItem}>
              <img src="https://images.unsplash.com/photo-1536640712-4d4c36ff0e4e?w=400&q=80" alt="Kids playing outdoors" />
            </div>
            <div className={styles.mosaicItem}>
              <img src="https://images.unsplash.com/photo-1591174588729-d0297f971b1e?w=400&q=80" alt="Family at beach" />
            </div>
            <div className={styles.mosaicItem}>
              <img src="https://images.unsplash.com/photo-1505114643939-2b179ccc6430?w=400&q=80" alt="Birthday candles" />
            </div>
            <div className={styles.mosaicItem}>
              <img src="https://images.unsplash.com/photo-1594172104574-3b829faf2e28?w=400&q=80" alt="Baby first steps" />
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Anti-Social Media Section */}
      <section className={styles.contrastSection}>
        <FadeIn>
          <h2 className={styles.contrastTitle}>Social media wasn't built for families</h2>
          <p className={styles.contrastSubtitle}>
            You shouldn't have to scroll past ads and influencers to see your grandkid's first steps.
          </p>
        </FadeIn>
        <div className={styles.contrastGrid}>
          <FadeIn className={styles.contrastCard + ' ' + styles.contrastOld} delay={100}>
            <h3 className={styles.contrastCardTitle}>On social media...</h3>
            <ul className={styles.contrastList}>
              <li className={styles.contrastBad}>An algorithm decides what you see</li>
              <li className={styles.contrastBad}>Ads squeezed between family photos</li>
              <li className={styles.contrastBad}>Your data sold to advertisers</li>
              <li className={styles.contrastBad}>Strangers commenting on your kids</li>
              <li className={styles.contrastBad}>Endless influencer content in your feed</li>
            </ul>
          </FadeIn>
          <FadeIn className={styles.contrastCard + ' ' + styles.contrastNew} delay={200}>
            <h3 className={styles.contrastCardTitle}>On Our Family Socials...</h3>
            <ul className={styles.contrastList}>
              <li className={styles.contrastGood}>Chronological feed — you see everything</li>
              <li className={styles.contrastGood}>No ads, ever. Your memories aren't a product</li>
              <li className={styles.contrastGood}>Your data stays yours. Period</li>
              <li className={styles.contrastGood}>Private by default — family only</li>
              <li className={styles.contrastGood}>Only the people who matter most</li>
            </ul>
          </FadeIn>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={styles.features}>
        {/* Feature A: Stay Connected */}
        <div className={styles.featureRow}>
          <FadeIn className={styles.featureText}>
            <span className={styles.badge}>Stay Connected</span>
            <h2 className={styles.featureTitle}>See what your people are up to</h2>
            <p className={styles.featureDesc}>
              A clean, chronological feed of the people who matter most. No algorithm
              deciding what you see. Just birthdays, vacations, graduations, and Sunday dinners
              from the people you love.
            </p>
            <ul className={styles.featureList}>
              <li>Chronological feed — no hidden posts</li>
              <li>Follow family members and get notified</li>
              <li>Private and completely ad-free</li>
            </ul>
          </FadeIn>
          <FadeIn className={styles.featureVisual} delay={150}>
            <div className={styles.feedMockup}>
              <div className={styles.feedCard}>
                <div className={styles.feedHeader}>
                  <div className={styles.feedAvatar}>
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Maya" alt="Maya" />
                  </div>
                  <div className={styles.feedInfo}>
                    <div className={styles.feedName}>Maya Rodriguez</div>
                    <div className={styles.feedDate}>2 days ago</div>
                  </div>
                </div>
                <div className={styles.feedImage}>
                  <img src="https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=800&q=80" alt="Family hiking" />
                </div>
                <div className={styles.feedCardTitle}>Weekend at the Lake House</div>
              </div>
              <div className={styles.feedCard}>
                <div className={styles.feedHeader}>
                  <div className={styles.feedAvatar}>
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Grandma" alt="Grandma" />
                  </div>
                  <div className={styles.feedInfo}>
                    <div className={styles.feedName}>Grandma Elaine</div>
                    <div className={styles.feedDate}>5 days ago</div>
                  </div>
                </div>
                <div className={styles.feedImage}>
                  <img src="https://images.unsplash.com/photo-1617127284458-88cb03b86916?w=800&q=80" alt="Grandparents with grandkids" />
                </div>
                <div className={styles.feedCardTitle}>Baking Day with the Grandkids</div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Feature B: Rich Events — mockup looks like the real app */}
        <div className={`${styles.featureRow} ${styles.featureReverse}`}>
          <FadeIn className={styles.featureText}>
            <span className={styles.badge}>Rich Storytelling</span>
            <h2 className={styles.featureTitle}>Every moment deserves its story</h2>
            <p className={styles.featureDesc}>
              More than a photo dump. Create beautiful event pages with galleries, stories,
              and all the details that make a moment special. Your kid's graduation, your
              anniversary dinner, that epic road trip — told the way it deserves.
            </p>
            <ul className={styles.featureList}>
              <li>Photo galleries with lightbox viewing</li>
              <li>Rich text for the full story</li>
              <li>Comments and reactions from family</li>
            </ul>
          </FadeIn>
          <FadeIn className={styles.featureVisual} delay={150}>
            <div className={styles.appPreview}>
              <div className={styles.appHeroImage} style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1200&q=80)' }}>
                <div className={styles.appHeroOverlay}>
                  <h3 className={styles.appEventTitle}>Emma's Quincea&ntilde;era</h3>
                  <p className={styles.appEventMeta}>The Rodriguez Family &bull; March 2024</p>
                </div>
              </div>
              <div className={styles.appEventContent}>
                <p className={styles.appEventText}>
                  Fifteen years of watching this incredible girl grow into a young woman. The whole
                  family flew in from three different states to celebrate together...
                </p>
                <div className={styles.appEventPhotos}>
                  <img src="https://images.unsplash.com/photo-1519741497674-611481863552?w=300&q=80" alt="Celebration" />
                  <img src="https://images.unsplash.com/photo-1529634597503-139d3726fed5?w=300&q=80" alt="Family together" />
                  <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&q=80" alt="Dinner table" />
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Feature C: Maps & Timeline */}
        <div className={styles.featureRow}>
          <FadeIn className={styles.featureText}>
            <span className={styles.badge}>Maps & Timeline</span>
            <h2 className={styles.featureTitle}>Watch your family's world grow</h2>
            <p className={styles.featureDesc}>
              See every trip on an interactive map. Follow your family's adventures from
              Tokyo to Paris to the cabin up north. Watch years of memories unfold on a
              beautiful timeline.
            </p>
            <ul className={styles.featureList}>
              <li>Interactive world map with all events</li>
              <li>Journey maps for multi-stop trips</li>
              <li>Timeline view organized by year</li>
            </ul>
          </FadeIn>
          <FadeIn className={styles.featureVisual} delay={150}>
            <div className={styles.mapMockup}>
              <div className={styles.mapContainer}>
                <img
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&q=80"
                  alt="World Map"
                  className={styles.mapBackground}
                />
                <div className={styles.mapOverlay}></div>
                <svg className={styles.flightPath} viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 120 180 Q 250 120, 360 160 T 480 200"
                        stroke="url(#v9gradient)"
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray="8,8"
                        opacity="0.8">
                    <animate attributeName="stroke-dashoffset" from="16" to="0" dur="2s" repeatCount="indefinite"/>
                  </path>
                  <defs>
                    <linearGradient id="v9gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#667eea" />
                      <stop offset="50%" stopColor="#764ba2" />
                      <stop offset="100%" stopColor="#f093fb" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className={styles.mapPin} style={{ top: '45%', left: '20%' }}><span>📍</span></div>
                <div className={styles.mapPin} style={{ top: '40%', left: '60%' }}><span>📍</span></div>
                <div className={styles.mapPin} style={{ top: '65%', left: '48%' }}><span>📍</span></div>
                <div className={styles.mapPin} style={{ top: '50%', left: '80%' }}><span>📍</span></div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Privacy Section */}
      <section className={styles.privacySection}>
        <FadeIn>
          <h2 className={styles.sectionTitle}>Your memories belong to your family. Period.</h2>
          <p className={styles.sectionSubtitle}>
            We don't sell your data. We don't show ads. We don't use algorithms to decide
            what you see. Your family's moments are private, and they stay that way.
          </p>
        </FadeIn>
        <div className={styles.privacyGrid}>
          <FadeIn className={styles.privacyCard} delay={0}>
            <div className={styles.privacyIcon}>🔒</div>
            <h3>Private by default</h3>
            <p>Every event is private. You choose exactly who sees what.</p>
          </FadeIn>
          <FadeIn className={styles.privacyCard} delay={100}>
            <div className={styles.privacyIcon}>🚫</div>
            <h3>No ads, ever</h3>
            <p>We make money from subscriptions, not your data. Your memories aren't a product.</p>
          </FadeIn>
          <FadeIn className={styles.privacyCard} delay={200}>
            <div className={styles.privacyIcon}>👨‍👩‍👧‍👦</div>
            <h3>Made by a family</h3>
            <p>Built by parents who wanted something better. We use it with our own families.</p>
          </FadeIn>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className={styles.pricingSection}>
        <FadeIn>
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
        </FadeIn>

        <div className={styles.pricingGrid}>
          <FadeIn className={styles.pricingCard} delay={0}>
            <div className={styles.pricingHeader}>
              <h3>Free</h3>
              <div className={styles.price}>
                <span className={styles.priceAmount}>$0</span>
                <span className={styles.pricePeriod}>/forever</span>
              </div>
              <p className={styles.pricingDesc}>Perfect for family viewers</p>
            </div>
            <ul className={styles.pricingFeatures}>
              <li>View all shared events</li>
              <li>Like and comment</li>
              <li>Follow family members</li>
              <li>Interactive maps & timeline</li>
              <li>30-day Pro trial included</li>
            </ul>
            <Link to="/login" className={styles.pricingBtn}>Get started free</Link>
          </FadeIn>

          <FadeIn className={`${styles.pricingCard} ${styles.pricingFeatured}`} delay={100}>
            <div className={styles.popularBadge}>Most Popular</div>
            <div className={styles.pricingHeader}>
              <h3>Pro</h3>
              <div className={styles.price}>
                <span className={styles.priceAmount}>{billingPeriod === 'annual' ? '$9' : '$12'}</span>
                <span className={styles.pricePeriod}>/month</span>
              </div>
              <p className={styles.pricingDesc}>
                {billingPeriod === 'annual' ? 'Billed annually at $108/year' : 'Billed monthly'}
              </p>
            </div>
            <ul className={styles.pricingFeatures}>
              <li><strong>Create unlimited events</strong></li>
              <li>Photo and video uploads</li>
              <li>Journey mapping</li>
              <li>GPS extraction from photos</li>
              <li>Rich text editor</li>
            </ul>
            <Link to="/login?signup=true" className={styles.pricingBtnPrimary}>Start Free Trial</Link>
          </FadeIn>

          <FadeIn className={styles.pricingCard} delay={200}>
            <div className={styles.pricingHeader}>
              <h3>Lifetime</h3>
              <div className={styles.price}>
                <span className={styles.priceAmount}>$294</span>
                <span className={styles.pricePeriod}>once</span>
              </div>
              <p className={styles.pricingDesc}>Pay once, use forever</p>
            </div>
            <ul className={styles.pricingFeatures}>
              <li><strong>Everything in Pro</strong></li>
              <li>No recurring fees</li>
              <li>All future updates</li>
              <li>Priority support</li>
              <li>Best long-term value</li>
            </ul>
            <Link to="/login?signup=true" className={styles.pricingBtn}>Get Lifetime Access</Link>
          </FadeIn>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <FadeIn className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Your family is waiting</h2>
          <p className={styles.ctaSubtitle}>
            Every birthday, every trip, every Sunday dinner — start keeping them all
            in one place. It's free, it's private, and it takes 30 seconds.
          </p>
          <Link to="/login?signup=true" className={styles.ctaButton}>Bring your family together</Link>
          <p className={styles.ctaNote}>Free forever &bull; No credit card required</p>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <h3>Our Family Socials</h3>
            <p>The private space for families who value their shared moments.</p>
          </div>
          <div className={styles.footerSection}>
            <h3>Explore</h3>
            <ul>
              <li><a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }}>Features</a></li>
              <li><a href="#pricing" onClick={(e) => { e.preventDefault(); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }) }}>Pricing</a></li>
              <li><Link to="/blog">Blog</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
            </ul>
          </div>
          <div className={styles.footerSection}>
            <h3>Support</h3>
            <ul>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
            </ul>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>&copy; 2026 Our Family Socials. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}

export default LandingV9
