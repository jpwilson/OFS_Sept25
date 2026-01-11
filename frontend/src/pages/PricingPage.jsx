import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './PricingPage.module.css'

function PricingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [billingPeriod, setBillingPeriod] = useState('annual')

  const features = [
    'Unlimited family events',
    'Photo and video uploads',
    'Journey mapping with multiple locations',
    'GPS extraction from photos',
    'Timeline and map views',
    'Share events with anyone',
    'Follow family members',
    'Comments and likes',
    'Privacy controls',
    'Rich text editor'
  ]

  const handleGetStarted = () => {
    if (user) {
      navigate('/billing')
    } else {
      navigate('/login?signup=true')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Simple, Fair Pricing</h1>
        <p className={styles.subtitle}>
          Start with a 30-day free trial. No credit card required.
        </p>
      </div>

      {/* Trial Banner */}
      <div className={styles.trialBanner}>
        <div className={styles.trialIcon}>🎁</div>
        <div className={styles.trialContent}>
          <h3>30-Day Free Trial</h3>
          <p>Try all features free for 30 days. Sign up within your first 5 days and get an extra month free!</p>
        </div>
      </div>

      {/* Billing Toggle */}
      <div className={styles.billingToggle}>
        <button
          className={`${styles.toggleButton} ${billingPeriod === 'monthly' ? styles.active : ''}`}
          onClick={() => setBillingPeriod('monthly')}
        >
          Monthly
        </button>
        <button
          className={`${styles.toggleButton} ${billingPeriod === 'annual' ? styles.active : ''}`}
          onClick={() => setBillingPeriod('annual')}
        >
          Annual <span className={styles.saveBadge}>Save $36</span>
        </button>
      </div>

      {/* Single Pricing Card */}
      <div className={styles.pricingCardWrapper}>
        <div className={styles.pricingCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.planName}>Our Family Socials</h2>
            <div className={styles.price}>
              <span className={styles.currency}>$</span>
              <span className={styles.priceAmount}>{billingPeriod === 'annual' ? '108' : '12'}</span>
              <span className={styles.pricePeriod}>/{billingPeriod === 'annual' ? 'year' : 'month'}</span>
            </div>
            {billingPeriod === 'annual' && (
              <p className={styles.monthlyBreakdown}>That's only $9/month</p>
            )}
          </div>

          <div className={styles.featuresList}>
            {features.map((feature, index) => (
              <div key={index} className={styles.featureItem}>
                <span className={styles.checkmark}>✓</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <button className={styles.ctaButton} onClick={handleGetStarted}>
            {user ? 'Manage Subscription' : 'Start Free Trial'}
          </button>

          <p className={styles.guarantee}>
            30-day money-back guarantee. Cancel anytime.
          </p>
        </div>

        {/* Lifetime Option */}
        <div className={styles.lifetimeCard}>
          <div className={styles.lifetimeHeader}>
            <h2 className={styles.planName}>Lifetime Access</h2>
            <span className={styles.lifetimeBadge}>Best Value</span>
          </div>
          <div className={styles.price}>
            <span className={styles.currency}>$</span>
            <span className={styles.priceAmount}>294</span>
            <span className={styles.pricePeriod}>one-time</span>
          </div>
          <p className={styles.lifetimeDescription}>
            Pay once, use forever. No recurring fees, no renewals. All future updates included.
          </p>
          <button className={styles.lifetimeButton} onClick={handleGetStarted}>
            {user ? 'Get Lifetime Access' : 'Start Free Trial'}
          </button>
        </div>
      </div>

      {/* FAQ Section */}
      <div className={styles.faqSection}>
        <h2>Frequently Asked Questions</h2>

        <div className={styles.faqGrid}>
          <div className={styles.faqItem}>
            <h3>How does the free trial work?</h3>
            <p>
              Sign up and get full access to all features for 30 days. No credit card required.
              If you subscribe within the first 5 days, you get an extra month free (60 days total).
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>What happens when my trial ends?</h3>
            <p>
              You can still browse the feed and see what your family is up to, but you'll need
              to subscribe to view event details and create new events.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>Can I cancel anytime?</h3>
            <p>
              Yes! Cancel your subscription anytime with no questions asked.
              You'll keep access until the end of your billing period.
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
          <p>Join families who are already sharing their stories.</p>
          <Link to="/login?signup=true" className={styles.finalCta}>
            Start Your Free Trial
          </Link>
        </div>
      )}
    </div>
  )
}

export default PricingPage
