import styles from './FeedCardPreview.module.css'

/**
 * FeedCardPreview - Image-only card with overlay on hover
 *
 * Four variations (NO image blur - image stays crisp):
 * - A: Slide up gradient from bottom
 * - B: Fade in gradient + glossy sweep animation
 * - C: Text area blur only (blur behind text, not image)
 * - D: Diagonal corner reveal wipe
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
        {/* Standard overlay for variants A, B */}
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

        {/* Variant C: Text area with blur behind it only */}
        {variant === 'C' && (
          <div className={styles.textBackdrop}>
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
        )}

        {/* Variant D: Corner reveal overlay */}
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
              {event.location && (
                <span className={styles.location}>{event.location}</span>
              )}
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
