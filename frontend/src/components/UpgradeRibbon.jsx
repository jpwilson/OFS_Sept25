import { useState } from 'react'
import { Link } from 'react-router-dom'
import styles from './UpgradeRibbon.module.css'

function UpgradeRibbon({ eventCount, limit = 5 }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (eventCount < limit) return null

  return (
    <div
      className={styles.ribbon}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className={styles.ribbonContent}>
        <div className={styles.mainText}>
          <span className={styles.icon}>⚠️</span>
          <span className={styles.text}>
            You're at your limit ({eventCount}/{limit} events published)
          </span>
        </div>

        {isExpanded && (
          <div className={styles.expandedContent}>
            <p className={styles.message}>
              Upgrade to Premium to publish unlimited events. Your drafts and deleted events don't count!
            </p>
            <Link to="/pricing" className={styles.upgradeButton}>
              Upgrade to Premium
            </Link>
          </div>
        )}

        {!isExpanded && (
          <Link to="/pricing" className={styles.upgradeButtonCompact}>
            Upgrade
          </Link>
        )}
      </div>
    </div>
  )
}

export default UpgradeRibbon
