import { useNavigate } from 'react-router-dom'
import styles from './UpgradeModal.module.css'

export default function UpgradeModal({ isOpen, onClose, onSaveAsDraft, trialDays = 30, context = 'general' }) {
  const navigate = useNavigate()

  // Don't render if not open
  if (!isOpen) return null

  const handleSubscribe = () => {
    navigate('/billing')
    if (onClose) onClose()
  }

  const handleMaybeLater = () => {
    if (onClose) onClose()
  }

  // Context-specific messaging
  const getDescription = () => {
    if (context === 'create') {
      return "Subscribe to create new events and share your family memories. You can still view events from people you follow for free!"
    }
    return "Subscribe to continue creating events and viewing all content. You can still view events from people you follow for free!"
  }

  return (
    <div className={styles.overlay} onClick={handleMaybeLater}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.icon}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#gradient)" />
            <defs>
              <linearGradient id="gradient" x1="2" y1="2" x2="22" y2="21" gradientUnits="userSpaceOnUse">
                <stop stopColor="#667eea" />
                <stop offset="1" stopColor="#764ba2" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h2 className={styles.title}>Your {trialDays}-Day Free Trial Has Ended</h2>

        <p className={styles.description}>
          {getDescription()}
        </p>

        <ul className={styles.features}>
          <li>Create unlimited family events</li>
          <li>View all event details and photos</li>
          <li>Journey mapping with multiple locations</li>
          <li>Share events with family and friends</li>
          <li>Timeline and map views</li>
        </ul>

        <div className={styles.pricing}>
          <div className={styles.priceOption}>
            <span className={styles.price}>$12</span>
            <span className={styles.period}>/month</span>
          </div>
          <span className={styles.or}>or</span>
          <div className={styles.priceOption}>
            <span className={styles.price}>$108</span>
            <span className={styles.period}>/year</span>
            <span className={styles.savings}>Save $36</span>
          </div>
        </div>

        <button className={styles.subscribeButton} onClick={handleSubscribe}>
          Subscribe Now
        </button>

        <button className={styles.closeButton} onClick={handleMaybeLater}>
          Browse Feed Instead
        </button>
      </div>
    </div>
  )
}
