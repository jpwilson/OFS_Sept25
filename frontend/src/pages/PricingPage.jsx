import { useState, useEffect } from 'react'
import { pageByPath, JOIN_LINE } from '../content/marketing.js'
import { useSeoHead } from '../content/useSeoHead.js'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './PricingPage.module.css'

const PRICING_PAGE = pageByPath('/pricing')

function PricingPage() {
  // /pricing is prerendered, so a client-side navigation needs the same
  // title, description, canonical and JSON-LD graph written back.
  useSeoHead(PRICING_PAGE)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [billingPeriod, setBillingPeriod] = useState('annual')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleProClick = () => {
    if (user) {
      navigate('/billing')
    } else {
      navigate('/login?signup=true')
    }
  }

  const handleLifetimeClick = () => {
    if (user) {
      navigate('/billing')
    } else {
      navigate('/login?signup=true')
    }
  }

  // Determine current user's tier for showing "Current Plan" indicators
  const userTier = user?.subscription_tier || 'free'
  const isFreeTier = userTier === 'free'
  const isProTier = userTier === 'premium'
  const isLifetimeTier = userTier === 'lifetime'

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <h1 className={styles.title}>Simple, transparent pricing</h1>
        <p className={styles.subtitle}>
          Readers are free, forever. Storytellers start with a 30-day Pro trial, no card needed,
          and pick Pro or Lifetime to keep publishing.
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

        {/* Pricing Cards Grid */}
        <div className={styles.pricingGrid}>
          {/* Free Tier */}
          <div className={styles.pricingCard}>
            <div className={styles.pricingHeader}>
              <h3>Free to View</h3>
              <div className={styles.price}>
                <span className={styles.priceAmount}>$0</span>
                <span className={styles.pricePeriod}>/forever</span>
              </div>
              <p className={styles.pricingDesc}>For the whole family of readers</p>
            </div>
            <ul className={styles.pricingFeatures}>
              <li><strong>Read, like and comment, free forever</strong></li>
              <li>Open the events of the people you follow, and every Public event</li>
              <li>Like and comment</li>
              <li>Follow family members</li>
              <li>Interactive maps & timeline</li>
              <li>30-day Pro trial included, with up to 5 published events</li>
            </ul>
            {user && isFreeTier ? (
              <span className={styles.currentPlan}>Current Plan</span>
            ) : !user ? (
              <Link to="/login" className={styles.pricingButton}>
                Get started free
              </Link>
            ) : null}
          </div>

          {/* Pro Tier (Featured) */}
          <div className={`${styles.pricingCard} ${styles.featured}`}>
            <div className={styles.popularBadge}>For storytellers</div>
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
              <li>Privacy controls</li>
              <li>Rich text editor</li>
              <li>AI Create and Smart Import</li>
            </ul>
            {user && isProTier ? (
              <span className={styles.currentPlan}>Current Plan</span>
            ) : (
              <button onClick={handleProClick} className={styles.pricingButtonPrimary}>
                {user ? 'Upgrade to Pro' : 'Start Free Trial'}
              </button>
            )}
          </div>

          {/* Lifetime Tier */}
          <div className={styles.pricingCard}>
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
              <li>Early access to features</li>
              <li>Best long-term value</li>
            </ul>
            {user && isLifetimeTier ? (
              <span className={styles.currentPlan}>Current Plan</span>
            ) : (
              <button onClick={handleLifetimeClick} className={styles.pricingButton}>
                Get Lifetime Access
              </button>
            )}
          </div>
        </div>

        {/* Pricing Footer */}
        <div className={styles.pricingFooter}>
          <p className={styles.pricingNote}>
            <strong>30-day free trial on all accounts.</strong> Subscribe within 5 days for an extra month free.
          </p>
        </div>

        {/* FAQ Section */}
        <div className={styles.faqSection}>
          <h2>Frequently Asked Questions</h2>

          <div className={styles.faqGrid}>
            <div className={styles.faqItem}>
              <h3>How does the free trial work?</h3>
              <p>
                Sign up and get Pro for 30 days, with no credit card required, and publish up to
                5 events. Subscribe to Pro during the trial and the days you have left are added on
                before your first renewal. Subscribe within your first 5 days and we add an extra
                30 days free on top.
              </p>
            </div>

            <div className={styles.faqItem}>
              <h3>What happens when my trial ends?</h3>
              <p>
                Your free account keeps the feed, your own events, every event set to Public and
                the events of the people you follow, all open to you, with likes and comments.
                Opening everything else, and publishing new events, comes with an active trial or
                subscription. Pick Pro or Lifetime whenever you are ready, and you are publishing
                again straight away.
              </p>
            </div>

            <div className={styles.faqItem}>
              <h3>Can I cancel anytime?</h3>
              <p>
                Yes. Cancel your subscription anytime, with no questions asked. Every event you
                have published stays right where it is, and you can pick up again whenever you like.
              </p>
            </div>

            <div className={styles.faqItem}>
              <h3>What payment methods do you accept?</h3>
              <p>
                We accept all major credit cards through Stripe, our secure payment partner.
                Your payment information is never stored on our servers.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        {!user && (
          <div className={styles.ctaSection}>
            <h2>Ready to preserve your family memories?</h2>
            <p>{JOIN_LINE}</p>
            <Link to="/login?signup=true" className={styles.finalCta}>
              Start Your Free Trial
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default PricingPage
