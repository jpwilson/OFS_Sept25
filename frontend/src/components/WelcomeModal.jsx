import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './WelcomeModal.module.css'

export default function WelcomeModal() {
  const [isVisible, setIsVisible] = useState(false)
  const { user, trialDaysRemaining, isWithinFirst5Days, isPaidSubscriber } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user || isPaidSubscriber) return

    // Check if user permanently dismissed the modal
    const dismissedKey = `welcome_dismissed_${user.id}`
    if (localStorage.getItem(dismissedKey) === 'true') return

    // Check how many times we've shown this modal
    const welcomeKey = `welcome_shown_${user.id}`
    const shownCount = parseInt(localStorage.getItem(welcomeKey) || '0', 10)

    // Show first 5 times
    if (shownCount < 5) {
      setIsVisible(true)
      localStorage.setItem(welcomeKey, String(shownCount + 1))
    }
  }, [user, isPaidSubscriber])

  if (!isVisible || !user) return null

  const handleClose = () => {
    setIsVisible(false)
  }

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
                <p>
                  Subscribe within the next 5 days and get your <strong>first month FREE</strong> &mdash;
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
