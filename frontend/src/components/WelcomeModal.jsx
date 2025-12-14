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

    // Check how many times we've shown this modal
    const welcomeKey = `welcome_shown_${user.id}`
    const shownCount = parseInt(localStorage.getItem(welcomeKey) || '0', 10)

    // Show first 4 times
    if (shownCount < 4) {
      setIsVisible(true)
      localStorage.setItem(welcomeKey, String(shownCount + 1))
    }
  }, [user, isPaidSubscriber])

  if (!isVisible || !user) return null

  const handleClose = () => {
    setIsVisible(false)
  }

  const handleSubscribe = () => {
    navigate('/billing')
    setIsVisible(false)
  }

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeX} onClick={handleClose}>&times;</button>
        
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

        <button className={styles.startButton} onClick={handleClose}>
          Start Exploring
        </button>
      </div>
    </div>
  )
}
