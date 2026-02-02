import { Link } from 'react-router-dom'
import styles from './FeedCardPreview.module.css'

/**
 * FeedCardPreview - Image-only card with glass overlay on hover
 *
 * Four variations of glass reveal effects:
 * - A: Slide up from bottom
 * - B: Fade in overlay
 * - C: Split from center (top/bottom meet in middle)
 * - D: Corner reveal (expands from bottom-left)
 */
function FeedCardPreview({ event, variant = 'A' }) {
  const variantClass = styles[`variant${variant}`]

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Get cover image
  const coverImage = event.cover_image_url || event.image_url || '/placeholder-event.jpg'

  return (
    <div className={`${styles.card} ${variantClass}`}>
      {/* Background image */}
      <div
        className={styles.imageContainer}
        style={{ backgroundImage: `url(${coverImage})` }}
      >
        {/* Glass overlay */}
        <div className={styles.glassOverlay}>
          <div className={styles.content}>
            <h3 className={styles.title}>{event.title}</h3>
            <div className={styles.meta}>
              {event.author_name && (
                <span className={styles.author}>@{event.author_name}</span>
              )}
              {event.event_date && (
                <span className={styles.date}>{formatDate(event.event_date)}</span>
              )}
            </div>
            {event.location && (
              <span className={styles.location}>{event.location}</span>
            )}
          </div>
        </div>

        {/* Variant C: Split overlay (top half) */}
        {variant === 'C' && (
          <>
            <div className={styles.splitTop}>
              <div className={styles.content}>
                <h3 className={styles.title}>{event.title}</h3>
              </div>
            </div>
            <div className={styles.splitBottom}>
              <div className={styles.content}>
                <div className={styles.meta}>
                  {event.author_name && (
                    <span className={styles.author}>@{event.author_name}</span>
                  )}
                  {event.event_date && (
                    <span className={styles.date}>{formatDate(event.event_date)}</span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Variant D: Corner mask overlay */}
        {variant === 'D' && (
          <div className={styles.cornerOverlay}>
            <div className={styles.content}>
              <h3 className={styles.title}>{event.title}</h3>
              <div className={styles.meta}>
                {event.author_name && (
                  <span className={styles.author}>@{event.author_name}</span>
                )}
                {event.event_date && (
                  <span className={styles.date}>{formatDate(event.event_date)}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Variant label */}
      <div className={styles.variantLabel}>Variant {variant}</div>
    </div>
  )
}

export default FeedCardPreview
