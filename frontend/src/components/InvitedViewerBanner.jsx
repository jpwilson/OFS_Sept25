import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import apiService from '../services/api'
import styles from './InvitedViewerBanner.module.css'

export default function InvitedViewerBanner() {
  const [viewerStatus, setViewerStatus] = useState(null)
  const [inviters, setInviters] = useState([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    loadViewerStatus()
  }, [])

  async function loadViewerStatus() {
    try {
      const [status, invitersData] = await Promise.all([
        apiService.getViewerStatus(),
        apiService.getMyInviters()
      ])
      setViewerStatus(status)
      setInviters(invitersData)
    } catch (error) {
      console.error('Failed to load viewer status:', error)
    } finally {
      setLoading(false)
    }
  }

  // Don't show if loading, dismissed, or not a restricted viewer
  if (loading || dismissed || !viewerStatus?.is_restricted) {
    return null
  }

  const inviterNames = inviters.map(inv => inv.username).join(', ')

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <div className={styles.icon}>👁️</div>
        <div className={styles.text}>
          <p className={styles.title}>
            You're viewing as an invited guest
          </p>
          <p className={styles.subtitle}>
            {inviters.length === 1
              ? `You can only see events from @${inviterNames}`
              : `You can only see events from ${inviters.length} people who invited you`
            }
          </p>
        </div>
        <div className={styles.actions}>
          <Link to="/checkout" className={styles.upgradeButton}>
            Upgrade for Full Access
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
