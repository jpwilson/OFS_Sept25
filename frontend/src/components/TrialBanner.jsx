import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import styles from './TrialBanner.module.css'

export default function TrialBanner() {
  const {
    user,
    isTrialActive,
    trialDaysRemaining,
    isWithinFirst5Days,
    isPaidSubscriber,
    isTrialExpired
  } = useAuth()
  const navigate = useNavigate()
  const [isDismissed, setIsDismissed] = useState(false)

  // Check if banner was dismissed within last 24 hours
  useEffect(() => {
    if (!user) return

    const dismissKey = `trial_banner_dismissed_${user.id}`
    const dismissedAt = localStorage.getItem(dismissKey)

    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10)
      const now = Date.now()
      const twentyFourHours = 24 * 60 * 60 * 1000

      // If dismissed less than 24 hours ago, keep it dismissed
      if (now - dismissedTime < twentyFourHours) {
        setIsDismissed(true)
      } else {
        // More than 24 hours ago, clear the dismissal
        localStorage.removeItem(dismissKey)
        setIsDismissed(false)
      }
    }
  }, [user])

  const handleDismiss = () => {
    if (!user) return

    const dismissKey = `trial_banner_dismissed_${user.id}`
    localStorage.setItem(dismissKey, Date.now().toString())
    setIsDismissed(true)
  }

  // Don't show for anonymous users, paid subscribers, or if no user
  if (!user || isPaidSubscriber) {
    return null
  }

  // Don't show if dismissed within 24 hours (for trial banners)
  if (isDismissed && !isTrialExpired) {
    return null
  }

  // Show expired trial banner (always show, not dismissible - they need to pay!)
  if (isTrialExpired) {
    return (
      <div className={`${styles.banner} ${styles.expired}`}>
        <div className={styles.content}>
          <span className={styles.message}>
            Your free trial has ended. Subscribe now to continue creating and viewing events.
          </span>
          <button
            className={styles.upgradeButton}
            onClick={() => navigate('/billing')}
          >
            Subscribe Now
          </button>
        </div>
      </div>
    )
  }

  // Show active trial banner
  if (isTrialActive) {
    // Early bird bonus banner (first 5 days)
    if (isWithinFirst5Days) {
      return (
        <div className={`${styles.banner} ${styles.earlyBird}`}>
          <div className={styles.content}>
            <span className={styles.message}>
              <span className={styles.highlight}>Early Bird Bonus!</span> Subscribe now and get your first month FREE (60 days total instead of 30)
            </span>
            <button
              className={styles.upgradeButton}
              onClick={() => navigate('/billing')}
            >
              Claim Bonus
            </button>
          </div>
          <button
            className={styles.dismissButton}
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )
    }

    // Regular trial countdown
    return (
      <div className={`${styles.banner} ${styles.trial}`}>
        <div className={styles.content}>
          <span className={styles.message}>
            <span className={styles.days}>{trialDaysRemaining}</span> days left in your free trial
          </span>
          <button
            className={styles.upgradeButton}
            onClick={() => navigate('/billing')}
          >
            Subscribe
          </button>
        </div>
        <button
          className={styles.dismissButton}
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    )
  }

  return null
}
