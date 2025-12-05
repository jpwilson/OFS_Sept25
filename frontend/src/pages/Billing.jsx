import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import confetti from 'canvas-confetti'
import styles from './Billing.module.css'

const API_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? (import.meta.env.VITE_API_URL || 'https://ofs-sept25.vercel.app')
  : 'http://localhost:8000'
const API_BASE = `${API_URL}/api/v1`

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
  const [error, setError] = useState(null)

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }
    }
    const legacyToken = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      ...(legacyToken && { 'Authorization': `Bearer ${legacyToken}` })
    }
  }

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

  const handleSubscribe = async (priceType = null) => {
    setLoading(true)
    setError(null)

    const selectedPrice = priceType || billingPeriod

    try {
      const headers = await getAuthHeaders()
      const currentUrl = window.location.origin

      const response = await fetch(`${API_BASE}/stripe/create-checkout-session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          price_id: selectedPrice,
          success_url: `${currentUrl}/billing?success=true`,
          cancel_url: `${currentUrl}/billing?canceled=true`
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create checkout session')
      }

      const data = await response.json()

      // Redirect to Stripe Checkout
      window.location.href = data.checkout_url
    } catch (err) {
      console.error('Checkout error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setLoading(true)
    setError(null)

    try {
      const headers = await getAuthHeaders()
      const currentUrl = window.location.origin

      const response = await fetch(`${API_BASE}/stripe/create-portal-session?return_url=${encodeURIComponent(currentUrl + '/billing')}`, {
        method: 'POST',
        headers
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to open customer portal')
      }

      const data = await response.json()

      // Redirect to Stripe Customer Portal
      window.location.href = data.portal_url
    } catch (err) {
      console.error('Portal error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  // Check for success/cancel query params
  const urlParams = new URLSearchParams(window.location.search)
  const isSuccess = urlParams.get('success') === 'true'
  const isCanceled = urlParams.get('canceled') === 'true'

  // Celebration confetti on successful subscription
  useEffect(() => {
    if (isSuccess) {
      // Fire confetti from both sides
      const duration = 3000
      const end = Date.now() + duration

      const frame = () => {
        // Left side
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4fd1c5']
        })
        // Right side
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4fd1c5']
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }
      frame()

      // Big burst in the center
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x: 0.5, y: 0.5 },
          colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4fd1c5']
        })
      }, 500)
    }
  }, [isSuccess])

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Subscription</h1>

        {/* Success Message */}
        {isSuccess && (
          <div className={styles.successMessage}>
            <span>🎉</span>
            <div>
              <strong>Welcome to Our Family Socials!</strong>
              <p>Your subscription is now active. Enjoy unlimited access to all features!</p>
            </div>
          </div>
        )}

        {/* Canceled Message */}
        {isCanceled && (
          <div className={styles.canceledMessage}>
            <span>ℹ️</span>
            <div>
              <strong>Checkout canceled</strong>
              <p>No worries! You can subscribe whenever you're ready.</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={styles.errorMessage}>
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

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
                onClick={() => handleSubscribe()}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Subscribe Now'}
              </button>

              <p className={styles.guarantee}>
                30-day money-back guarantee. Cancel anytime.
              </p>
            </div>

            {/* Lifetime Option */}
            <div className={styles.lifetimeCard}>
              <div className={styles.lifetimeHeader}>
                <h3>Lifetime Access</h3>
                <span className={styles.lifetimeBadge}>Best Value</span>
              </div>
              <div className={styles.priceAmount}>
                <span className={styles.currency}>$</span>
                <span className={styles.price}>250</span>
                <span className={styles.period}>one-time</span>
              </div>
              <p className={styles.lifetimeDescription}>
                Pay once, use forever. No recurring fees, no renewals.
              </p>
              <button
                className={styles.lifetimeButton}
                onClick={() => handleSubscribe('lifetime')}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Get Lifetime Access'}
              </button>
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
