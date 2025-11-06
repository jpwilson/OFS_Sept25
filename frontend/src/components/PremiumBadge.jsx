import styles from './PremiumBadge.module.css'

/**
 * Subtle premium indicator - thin blue ring around avatar
 * Only shown for premium and family tier users
 */
function PremiumBadge({ subscriptionTier, children }) {
  const isPremium = subscriptionTier === 'premium' || subscriptionTier === 'family'

  if (!isPremium) {
    return <>{children}</>
  }

  const tierClass = subscriptionTier === 'family' ? styles.family : styles.premium

  return (
    <div className={`${styles.badge} ${tierClass}`}>
      {children}
    </div>
  )
}

export default PremiumBadge
