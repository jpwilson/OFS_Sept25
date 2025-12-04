import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import styles from './Billing.module.css'

export default function Billing() {
  const {
    user,
    isTrialActive,
    trialDaysRemaining,
    isWithinFirst5Days,
    isPaidSubscriber,
    isTrialExpired,
    subscriptionTier
  } = useAuth()
  const navigate = useNavigate()
  const [billingPeriod, setBillingPeriod] = useState('annual')
  const [loading, setLoading] = useState(false)

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <h1>Please sign in to manage your subscription</h1>
          <button onClick={() => navigate('/login')} className={styles.primaryButton}>
            Sign In
          </button>
        </div>
      </div>
    )
  }

  const handleSubscribe = async () => {
    setLoading(true)
    // TODO: Implement Stripe checkout
    // For now, show coming soon message
    alert('Stripe checkout coming soon! This will redirect to secure payment.')
    setLoading(false)
  }

  const handleManageSubscription = async () => {
    setLoading(true)
    // TODO: Implement Stripe customer portal
    alert('Stripe customer portal coming soon!')
    setLoading(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Subscription</h1>

        {/* Current Status Card */}
        <div className={styles.statusCard}>
          <div className={styles.statusHeader}>
            <h2>Current Plan</h2>
            {isPaidSubscriber ? (
              <span className={styles.badge}>Pro</span>
            ) : isTrialActive ? (
              <span className={`${styles.badge} ${styles.trialBadge}`}>Trial</span>
            ) : (
              <span className={`${styles.badge} ${styles.expiredBadge}`}>Expired</span>
            )}
          </div>

          {isPaidSubscriber ? (
            <div className={styles.statusContent}>
              <p className={styles.statusText}>
                You're on the <strong>{subscriptionTier}</strong> plan. Thank you for your support!
              </p>
              <button
                className={styles.secondaryButton}
                onClick={handleManageSubscription}
                disabled={loading}
              >
                Manage Subscription
              </button>
            </div>
          ) : isTrialActive ? (
            <div className={styles.statusContent}>
              <p className={styles.statusText}>
                <span className={styles.daysCount}>{trialDaysRemaining}</span> days remaining in your free trial
              </p>
              {isWithinFirst5Days && (
                <div className={styles.earlyBirdAlert}>
                  <span className={styles.earlyBirdIcon}>🎁</span>
                  <span>Subscribe now and get your <strong>first month FREE</strong> - 60 days total!</span>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.statusContent}>
              <p className={styles.statusText}>
                Your free trial has ended. Subscribe to continue using all features.
              </p>
            </div>
          )}
        </div>

        {/* Pricing Section (show if not paid) */}
        {!isPaidSubscriber && (
          <>
            {/* Billing Toggle */}
            <div className={styles.billingToggle}>
              <button
                className={`${styles.toggleOption} ${billingPeriod === 'monthly' ? styles.active : ''}`}
                onClick={() => setBillingPeriod('monthly')}
              >
                Monthly
              </button>
              <button
                className={`${styles.toggleOption} ${billingPeriod === 'annual' ? styles.active : ''}`}
                onClick={() => setBillingPeriod('annual')}
              >
                Annual
                <span className={styles.saveBadge}>Save $18</span>
              </button>
            </div>

            {/* Price Card */}
            <div className={styles.priceCard}>
              <div className={styles.priceHeader}>
                <h3>Our Family Socials Pro</h3>
              </div>
              <div className={styles.priceAmount}>
                <span className={styles.currency}>$</span>
                <span className={styles.price}>{billingPeriod === 'annual' ? '90' : '9'}</span>
                <span className={styles.period}>/{billingPeriod === 'annual' ? 'year' : 'month'}</span>
              </div>
              {billingPeriod === 'annual' && (
                <p className={styles.monthlyBreakdown}>That's only $7.50/month</p>
              )}
              
              <ul className={styles.features}>
                <li>Unlimited family events</li>
                <li>Photo and video uploads</li>
                <li>Journey mapping with multiple locations</li>
                <li>Share events with anyone</li>
                <li>Timeline and map views</li>
                <li>GPS extraction from photos</li>
                <li>Privacy controls</li>
              </ul>

              <button
                className={styles.subscribeButton}
                onClick={handleSubscribe}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Subscribe Now'}
              </button>

              <p className={styles.guarantee}>
                30-day money-back guarantee. Cancel anytime.
              </p>
            </div>
          </>
        )}

        {/* FAQ Section */}
        <div className={styles.faqSection}>
          <h2>Frequently Asked Questions</h2>
          
          <div className={styles.faqItem}>
            <h3>What happens when my trial ends?</h3>
            <p>You can still browse the feed, map, and timeline, but you won't be able to view event details or create new events until you subscribe.</p>
          </div>

          <div className={styles.faqItem}>
            <h3>Can I cancel anytime?</h3>
            <p>Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
          </div>

          <div className={styles.faqItem}>
            <h3>What payment methods do you accept?</h3>
            <p>We accept all major credit cards through our secure payment partner, Stripe.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
