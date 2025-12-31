import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import confetti from 'canvas-confetti'
import api from '../services/api'
import styles from './Billing.module.css'

const API_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? (import.meta.env.VITE_API_URL || 'https://ofs-sept25.vercel.app')
  : 'http://localhost:8000'
const API_BASE = `${API_URL}/api/v1`

export default function Billing() {
  const {
    user,
    loading: authLoading,
    isTrialActive,
    trialDaysRemaining,
    isWithinFirst5Days,
    isPaidSubscriber,
    isSubscriptionCanceled,
    subscriptionEndsAt,
    subscriptionStartedAt,
    isTrialExpired,
    subscriptionTier
  } = useAuth()
  const navigate = useNavigate()
  const [billingPeriod, setBillingPeriod] = useState('annual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Payment history state
  const [paymentHistory, setPaymentHistory] = useState({ payments: [], total_spent: '$0.00' })
  const [historyLoading, setHistoryLoading] = useState(false)
  const [emailingHistory, setEmailingHistory] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Receipt preference state
  const [receiptPreference, setReceiptPreference] = useState(false)
  const [savingPreference, setSavingPreference] = useState(false)

  // Check for success/cancel query params - must be before any conditional returns
  const urlParams = new URLSearchParams(window.location.search)
  const isSuccess = urlParams.get('success') === 'true'
  const isCanceled = urlParams.get('canceled') === 'true'

  // Celebration confetti on successful subscription - must be before any conditional returns
  useEffect(() => {
    if (isSuccess && user) {
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
  }, [isSuccess, user])

  // Load payment history and preferences for paid subscribers
  useEffect(() => {
    const loadBillingData = async () => {
      if (!isPaidSubscriber) return

      setHistoryLoading(true)
      try {
        const [historyData, prefData] = await Promise.all([
          api.getPaymentHistory(),
          api.getReceiptPreference()
        ])
        setPaymentHistory(historyData)
        setReceiptPreference(prefData.notify_payment_receipts)
      } catch (err) {
        console.error('Failed to load billing data:', err)
      } finally {
        setHistoryLoading(false)
      }
    }

    loadBillingData()
  }, [isPaidSubscriber])

  const handleEmailHistory = async () => {
    setEmailingHistory(true)
    setEmailSent(false)
    setError(null)
    try {
      await api.emailBillingHistory()
      setEmailSent(true)
      setTimeout(() => setEmailSent(false), 5000)
    } catch (err) {
      // Show rate limit errors inline instead of as a general error
      setError(err.message || 'Failed to send billing history')
      setTimeout(() => setError(null), 8000)
    } finally {
      setEmailingHistory(false)
    }
  }

  const handleReceiptToggle = async () => {
    setSavingPreference(true)
    try {
      const newValue = !receiptPreference
      await api.updateReceiptPreference(newValue)
      setReceiptPreference(newValue)
    } catch (err) {
      setError(err.message || 'Failed to update preference')
    } finally {
      setSavingPreference(false)
    }
  }

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

  // Show loading while auth is being determined
  if (authLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.title}>Loading...</h1>
        </div>
      </div>
    )
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
              isSubscriptionCanceled ? (
                <span className={`${styles.badge} ${styles.cancelingBadge}`}>Canceling</span>
              ) : (
                <span className={styles.badge}>Pro</span>
              )
            ) : isTrialActive ? (
              <span className={`${styles.badge} ${styles.trialBadge}`}>Trial</span>
            ) : (
              <span className={`${styles.badge} ${styles.expiredBadge}`}>Expired</span>
            )}
          </div>

          {isPaidSubscriber ? (
            <div className={styles.statusContent}>
              {isSubscriptionCanceled ? (
                <>
                  <p className={styles.statusText}>
                    Your subscription is set to end on{' '}
                    <strong>
                      {subscriptionEndsAt?.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </strong>
                  </p>
                  <p className={styles.statusSubtext}>
                    You'll keep full access until then. Want to stay? You can resubscribe anytime.
                  </p>
                </>
              ) : (
                <p className={styles.statusText}>
                  You're on the <strong>{subscriptionTier}</strong> plan. Thank you for your support!
                </p>
              )}
              <button
                className={styles.secondaryButton}
                onClick={handleManageSubscription}
                disabled={loading}
              >
                {isSubscriptionCanceled ? 'Resubscribe' : 'View Stripe Billing'}
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

        {/* Payment History Section (show if paid) */}
        {isPaidSubscriber && (
          <>
            {/* Plan Details */}
            <div className={styles.planDetailsCard}>
              <h2>Plan Details</h2>
              <div className={styles.planDetails}>
                <div className={styles.planDetailRow}>
                  <span className={styles.planDetailLabel}>Plan</span>
                  <span className={styles.planDetailValue}>
                    {subscriptionTier === 'premium' ? 'Pro' : subscriptionTier}
                  </span>
                </div>
                {subscriptionStartedAt && (
                  <div className={styles.planDetailRow}>
                    <span className={styles.planDetailLabel}>Member since</span>
                    <span className={styles.planDetailValue}>
                      {new Date(subscriptionStartedAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                {subscriptionEndsAt && !isSubscriptionCanceled && (
                  <div className={styles.planDetailRow}>
                    <span className={styles.planDetailLabel}>
                      {paymentHistory.payments.length === 0 ? 'First billing date' : 'Next billing date'}
                    </span>
                    <span className={styles.planDetailValue}>
                      {subscriptionEndsAt.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                {paymentHistory.payments.length === 0 && subscriptionEndsAt && (
                  <div className={styles.trialNotice}>
                    You're in your free trial period. Billing starts on the date above.
                  </div>
                )}
              </div>
            </div>

            {/* Payment History */}
            <div className={styles.paymentHistoryCard}>
              <div className={styles.paymentHistoryHeader}>
                <h2>Payment History</h2>
                {paymentHistory.payments.length > 0 && (
                  <span className={styles.totalSpent}>
                    Total: {paymentHistory.total_spent}
                  </span>
                )}
              </div>

              {historyLoading ? (
                <p className={styles.loadingText}>Loading payment history...</p>
              ) : paymentHistory.payments.length === 0 ? (
                <p className={styles.emptyText}>No payments yet</p>
              ) : (
                <div className={styles.paymentTable}>
                  <div className={styles.paymentTableHeader}>
                    <span>Date</span>
                    <span>Description</span>
                    <span>Amount</span>
                    <span>Status</span>
                  </div>
                  {paymentHistory.payments.map((payment, idx) => (
                    <div key={idx} className={styles.paymentRow}>
                      <span>{payment.date}</span>
                      <span>{payment.description}</span>
                      <span>{payment.amount}</span>
                      <span className={styles.statusPaid}>{payment.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {paymentHistory.payments.length > 0 && (
                <div className={styles.paymentActions}>
                  <button
                    className={styles.emailHistoryButton}
                    onClick={handleEmailHistory}
                    disabled={emailingHistory}
                  >
                    {emailingHistory ? 'Sending...' : 'Email My Billing History'}
                  </button>
                  {emailSent && (
                    <span className={styles.emailSentMessage}>Sent to your email!</span>
                  )}
                </div>
              )}
            </div>

            {/* Billing Settings */}
            <div className={styles.billingSettingsCard}>
              <h2>Billing Settings</h2>
              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>Email payment receipts</span>
                  <span className={styles.settingDescription}>
                    Receive an email receipt each time your subscription renews
                  </span>
                </div>
                <button
                  className={`${styles.toggleButton} ${receiptPreference ? styles.toggleOn : ''}`}
                  onClick={handleReceiptToggle}
                  disabled={savingPreference}
                >
                  <span className={styles.toggleKnob} />
                </button>
              </div>
            </div>
          </>
        )}

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
                <span className={styles.saveBadge}>Save $36</span>
              </button>
            </div>

            {/* Price Card */}
            <div className={styles.priceCard}>
              <div className={styles.priceHeader}>
                <h3>Our Family Socials Pro</h3>
              </div>
              <div className={styles.priceAmount}>
                <span className={styles.currency}>$</span>
                <span className={styles.price}>{billingPeriod === 'annual' ? '108' : '12'}</span>
                <span className={styles.period}>/{billingPeriod === 'annual' ? 'year' : 'month'}</span>
              </div>
              {billingPeriod === 'annual' && (
                <p className={styles.monthlyBreakdown}>That's only $9/month</p>
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
