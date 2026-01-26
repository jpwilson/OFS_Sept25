import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './InvitedViewerBanner.module.css'

export default function InvitedViewerBanner() {
  const { canAccessContent, isExpired } = useAuth()
  const [dismissed, setDismissed] = useState(false)

  // Only show for expired users who can't access content
  // This replaces the old "invited viewer" banner which was misleading
  if (dismissed || canAccessContent || !isExpired) {
    return null
  }

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <div className={styles.icon}>👁️</div>
        <div className={styles.text}>
          <p className={styles.title}>
            Your free trial has ended
          </p>
          <p className={styles.subtitle}>
            You can view and interact with events from people you follow. Upgrade to Pro to create events and access all features.
          </p>
        </div>
        <div className={styles.actions}>
          <Link to="/billing" className={styles.upgradeButton}>
            Upgrade to Pro
          </Link>
          <button
            className={styles.dismissButton}
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
