import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './WelcomeModal.module.css'

export default function WelcomeModal() {
  const [isVisible, setIsVisible] = useState(false)
  const { user, trialDaysRemaining, isWithinFirst5Days, isPaidSubscriber } = useAuth()
  const navigate = useNavigate()

  // Calculate Early Bird days remaining (first 5 days of 30-day trial)
  const earlyBirdDaysRemaining = Math.max(0, trialDaysRemaining - 25)

  useEffect(() => {
    if (!user || isPaidSubscriber) return

    // Only show during first 5 days
    if (!isWithinFirst5Days) return

    // Check if user permanently dismissed the modal
    const dismissedKey = `welcome_dismissed_${user.id}`
    if (localStorage.getItem(dismissedKey) === 'true') return

    // Check if dismissed within last 24 hours
    const tempDismissKey = `welcome_temp_dismissed_${user.id}`
    const dismissedAt = localStorage.getItem(tempDismissKey)
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10)
      const now = Date.now()
      const twentyFourHours = 24 * 60 * 60 * 1000

      if (now - dismissedTime < twentyFourHours) {
        // Still within 24 hours, don't show
        return
      } else {
        // More than 24 hours, clear dismissal
        localStorage.removeItem(tempDismissKey)
      }
    }

    setIsVisible(true)
  }, [user, isPaidSubscriber, isWithinFirst5Days])

  if (!isVisible || !user) return null

  // X button dismisses for 24 hours
  const handleClose = () => {
    const tempDismissKey = `welcome_temp_dismissed_${user.id}`
    localStorage.setItem(tempDismissKey, Date.now().toString())
    setIsVisible(false)
  }

  // "Don't show again" permanently dismisses
  const handleDontShowAgain = () => {
    const dismissedKey = `welcome_dismissed_${user.id}`
    localStorage.setItem(dismissedKey, 'true')
    setIsVisible(false)
  }

  const handleSubscribe = () => {
    setIsVisible(false)
    navigate('/billing')
  }

  const handleStartExploring = () => {
    setIsVisible(false)
    navigate('/feed')
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeX} onClick={handleClose} aria-label="Close">&times;</button>

        <div className={styles.header}>
          <span className={styles.wave}>👋</span>
          <h2>Welcome to Our Family Socials!</h2>
        </div>

        <div className={styles.content}>
          <div className={styles.trialInfo}>
            <div className={styles.trialBadge}>
              <span className={styles.days}>{trialDaysRemaining}</span>
              <span className={styles.label}>days free</span>
            </div>
            <p>
              You have a <strong>30-day free trial</strong> to explore all features.
              Create events, share memories, and connect with your family!
            </p>
          </div>

          {isWithinFirst5Days && (
            <div className={styles.bonus}>
              <div className={styles.bonusIcon}>🎁</div>
              <div className={styles.bonusContent}>
                <strong>Early Bird Bonus!</strong>
                <span className={styles.urgencyBadge}>
                  {earlyBirdDaysRemaining === 1 ? 'Last chance!' : `${earlyBirdDaysRemaining} days left`}
                </span>
                <p>
                  Subscribe now and get your <strong>first month FREE</strong> &mdash;
                  that's 60 days total before any charge!
                </p>
                <button className={styles.claimButton} onClick={handleSubscribe}>
                  Claim Bonus
                </button>
              </div>
            </div>
          )}

          <div className={styles.features}>
            <h3>What you can do:</h3>
            <ul>
              <li>Create and share family events</li>
              <li>Add photos, videos, and journey maps</li>
              <li>Connect with family members</li>
              <li>View events on timeline and map</li>
            </ul>
          </div>
        </div>

        <button className={styles.startButton} onClick={handleStartExploring}>
          Start Exploring
        </button>

        <button className={styles.dontShowButton} onClick={handleDontShowAgain}>
          Don't show this again
        </button>
      </div>
    </div>
  )
}
