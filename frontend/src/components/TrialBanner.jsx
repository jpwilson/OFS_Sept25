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

  // Don't show for anonymous users, paid subscribers, or if no user
  if (!user || isPaidSubscriber) {
    return null
  }

  // Show expired trial banner
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
      </div>
    )
  }

  return null
}
