import { Link } from 'react-router-dom'
import styles from './UpgradeModal.module.css'

function UpgradeModal({ isOpen, onClose, onSaveAsDraft }) {
  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>

        <div className={styles.header}>
          <div className={styles.icon}>🚀</div>
          <h2 className={styles.title}>You've reached the free plan limit</h2>
          <p className={styles.subtitle}>
            Upgrade to Premium to publish unlimited events
          </p>
        </div>

        <div className={styles.comparison}>
          <div className={styles.planCard}>
            <div className={styles.planHeader}>
              <h3>Free Plan</h3>
              <div className={styles.currentBadge}>Current</div>
            </div>
            <div className={styles.planFeature}>
              <span className={styles.limit}>5/5</span> Published events
            </div>
            <div className={styles.planFeature}>
              ✓ Unlimited drafts
            </div>
            <div className={styles.planFeature}>
              ✓ All core features
            </div>
          </div>

          <div className={`${styles.planCard} ${styles.premium}`}>
            <div className={styles.planHeader}>
              <h3>Premium</h3>
              <div className={styles.recommendedBadge}>Recommended</div>
            </div>
            <div className={styles.price}>
              <span className={styles.priceAmount}>$9</span>
              <span className={styles.pricePeriod}>/month</span>
            </div>
            <p className={styles.priceNote}>Billed annually at $108/year</p>
            <div className={styles.planFeature}>
              <strong>Unlimited</strong> published events
            </div>
            <div className={styles.planFeature}>
              ✓ Everything in Free
            </div>
            <div className={styles.planFeature}>
              ✓ Priority support
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.buttonSecondary}
            onClick={onSaveAsDraft}
          >
            Save as Draft
          </button>
          <Link
            to="/pricing"
            className={styles.buttonPrimary}
          >
            Upgrade to Premium
          </Link>
        </div>

        <p className={styles.note}>
          Your event will be saved as a draft. Upgrade anytime to publish unlimited events!
        </p>
      </div>
    </div>
  )
}

export default UpgradeModal
