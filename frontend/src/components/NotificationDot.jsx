import { useState } from 'react'
import styles from './NotificationDot.module.css'

/**
 * NotificationDot - A dismissable red notification indicator
 *
 * Props:
 * - count: Number of notifications (optional, shows if > 0)
 * - dismissable: Whether the dot can be dismissed with X (default: true)
 * - onDismiss: Callback when dismissed
 * - size: 'small' | 'medium' (default: 'small')
 * - showCount: Whether to show the count number (default: false)
 */
function NotificationDot({
  count = 1,
  dismissable = true,
  onDismiss,
  size = 'small',
  showCount = false
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [isTouched, setIsTouched] = useState(false)

  if (count <= 0) return null

  const showX = dismissable && (isHovered || isTouched)

  const handleDismiss = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onDismiss) {
      onDismiss()
    }
  }

  const handleTouchStart = (e) => {
    if (dismissable) {
      setIsTouched(true)
      // Auto-hide after 3 seconds if not dismissed
      setTimeout(() => setIsTouched(false), 3000)
    }
  }

  return (
    <div
      className={`${styles.dot} ${styles[size]}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
    >
      {showX ? (
        <button
          className={styles.dismissButton}
          onClick={handleDismiss}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      ) : showCount && count > 1 ? (
        <span className={styles.count}>{count > 99 ? '99+' : count}</span>
      ) : null}
    </div>
  )
}

export default NotificationDot
