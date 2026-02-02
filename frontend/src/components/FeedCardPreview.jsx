import { useState } from 'react'
import styles from './FeedCardPreview.module.css'

// Sample event data for preview
const SAMPLE_EVENT = {
  title: 'Caribbean Cruise 2026',
  author: 'Jean-Paul Wilson',
  date: 'Jan 18 - Jan 25, 2026',
  location: 'Port, Long Point',
  image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80'
}

const SAMPLE_EVENTS = [
  {
    title: 'Winter Freeze Week',
    author: 'Sarah Miller',
    date: 'Jan 25 - Jan 30, 2026',
    location: 'Meritage Park, Edmond',
    image: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=800&q=80'
  },
  {
    title: 'Caribbean Cruise 2026',
    author: 'Jean-Paul Wilson',
    date: 'Jan 18 - Jan 25, 2026',
    location: 'Port, Long Point',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80'
  },
  {
    title: 'Baby\'s First Steps',
    author: 'Emma Thompson',
    date: 'Jan 12 - Jan 15, 2026',
    location: 'Home, Austin TX',
    image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&q=80'
  },
  {
    title: 'Mountain Retreat',
    author: 'David Chen',
    date: 'Dec 20 - Dec 27, 2025',
    location: 'Aspen, Colorado',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80'
  }
]

/**
 * FeedCardPreview - Shows a single event card with glass hover effect
 *
 * @param {string} variant - 'A' | 'B' | 'C' | 'D' - The glass animation variant
 * @param {object} event - Event data (optional, uses sample if not provided)
 */
function FeedCardPreview({ variant = 'A', event = SAMPLE_EVENT, size = 'medium' }) {
  const variantClass = styles[`variant${variant}`]
  const sizeClass = styles[size]

  return (
    <div className={`${styles.card} ${variantClass} ${sizeClass}`}>
      <div
        className={styles.imageContainer}
        style={{ backgroundImage: `url(${event.image})` }}
      >
        {/* Glass overlay */}
        <div className={styles.glassOverlay}>
          <div className={styles.glassContent}>
            <h3 className={styles.title}>{event.title}</h3>
            <div className={styles.meta}>
              <span className={styles.author}>{event.author}</span>
              <span className={styles.separator}>·</span>
              <span className={styles.date}>{event.date}</span>
            </div>
            {event.location && (
              <span className={styles.location}>{event.location}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * FeedCardVariantGrid - Shows all 4 variants side by side for comparison
 */
export function FeedCardVariantGrid() {
  const variants = ['A', 'B', 'C', 'D']
  const variantNames = {
    A: 'Slide Up Glass',
    B: 'Fade In Glass',
    C: 'Split Glass',
    D: 'Corner Reveal'
  }

  return (
    <div className={styles.variantGrid}>
      {variants.map((variant, index) => (
        <div key={variant} className={styles.variantCard}>
          <div className={styles.variantLabel}>
            <span className={styles.variantLetter}>Variant {variant}</span>
            <span className={styles.variantName}>{variantNames[variant]}</span>
          </div>
          <FeedCardPreview
            variant={variant}
            event={SAMPLE_EVENTS[index]}
            size="small"
          />
        </div>
      ))}
    </div>
  )
}

export default FeedCardPreview
