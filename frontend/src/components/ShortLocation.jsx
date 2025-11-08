import { useState, useEffect } from 'react'
import styles from './ShortLocation.module.css'

/**
 * Displays location name shortened to first N words
 * Shows full location on hover (desktop) or tap (mobile) for 3 seconds
 */
function ShortLocation({ locationName, maxWords = 3, className = '' }) {
  const [showFull, setShowFull] = useState(false)
  const [hideTimeout, setHideTimeout] = useState(null)

  // Split location into words
  const words = locationName ? locationName.trim().split(/\s+/) : []
  const needsShortening = words.length > maxWords
  const shortName = needsShortening ? words.slice(0, maxWords).join(' ') + '...' : locationName

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout)
      }
    }
  }, [hideTimeout])

  const handleMouseEnter = () => {
    if (!needsShortening) return

    if (hideTimeout) {
      clearTimeout(hideTimeout)
      setHideTimeout(null)
    }
    setShowFull(true)
  }

  const handleMouseLeave = () => {
    if (!needsShortening) return

    // On desktop hover out, hide immediately
    setShowFull(false)
  }

  const handleClick = () => {
    if (!needsShortening) return

    // Toggle on mobile tap
    if (showFull) {
      setShowFull(false)
      if (hideTimeout) {
        clearTimeout(hideTimeout)
        setHideTimeout(null)
      }
    } else {
      setShowFull(true)
      // Auto-hide after 3 seconds
      const timeout = setTimeout(() => {
        setShowFull(false)
      }, 3000)
      setHideTimeout(timeout)
    }
  }

  if (!locationName) {
    return null
  }

  return (
    <span
      className={`${styles.locationWrapper} ${className} ${needsShortening ? styles.expandable : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <span className={styles.shortName}>{shortName}</span>
      {showFull && needsShortening && (
        <span className={styles.tooltip}>
          {locationName}
        </span>
      )}
    </span>
  )
}

export default ShortLocation
