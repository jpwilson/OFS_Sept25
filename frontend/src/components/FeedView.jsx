import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styles from './FeedView.module.css'
import { useAuth } from '../context/AuthContext'
import ShortLocation from './ShortLocation'
import { getImageUrl } from '../utils/cloudinaryUrl'

// Helper to shorten title to max 4 words
const getShortenedTitle = (title) => {
  if (!title) return ''
  const words = title.trim().split(/\s+/)
  if (words.length <= 4) return title
  return words.slice(0, 4).join(' ') + '...'
}

function formatDateRange(start, end) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const options = { month: 'long', day: 'numeric', year: 'numeric' }

  if (start === end || !end) {
    return startDate.toLocaleDateString('en-US', options)
  }

  const startMonth = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  return `${startMonth} - ${endDate.toLocaleDateString('en-US', options)}`
}

export default function FeedView({ events = [], following = [], onUpgradePrompt }) {
  const { user, canAccessContent, isDemoAccount, demoEventIds } = useAuth()
  const navigate = useNavigate()
  const [cardSize, setCardSize] = useState('small')

  // Handle card click - always navigate
  const handleCardClick = (event) => {
    const eventPath = event.slug || event.id

    if (!user || canAccessContent) {
      navigate(`/event/${eventPath}`)
      return
    }

    const isOwnEvent = event.author_id === user.id || event.author_username === user.username
    const isFollowingAuthor = following.includes(event.author_username)
    const isPublicEvent = event.privacy_level === 'public'

    if (isOwnEvent || isFollowingAuthor || isPublicEvent) {
      navigate(`/event/${eventPath}`)
    } else if (onUpgradePrompt) {
      onUpgradePrompt(event)
    }
  }

  if (events.length === 0) {
    return (
      <div className={styles.noEvents}>
        <p>No events to display.</p>
      </div>
    )
  }

  return (
    <div className={styles.feedContainer}>
      <div className={styles.cardSizeSelector}>
        <button
          className={`${styles.sizeButton} ${cardSize === 'small' ? styles.active : ''}`}
          onClick={() => setCardSize('small')}
          title="Small cards (3 columns)"
        >
          ⊞⊞⊞
        </button>
        <button
          className={`${styles.sizeButton} ${cardSize === 'medium' ? styles.active : ''}`}
          onClick={() => setCardSize('medium')}
          title="Medium cards (2 columns)"
        >
          ⊞⊞
        </button>
        <button
          className={`${styles.sizeButton} ${cardSize === 'large' ? styles.active : ''}`}
          onClick={() => setCardSize('large')}
          title="Large cards (1 column)"
        >
          ⊞
        </button>
      </div>

      <div className={`${styles.feed} ${styles[cardSize]}`}>
        {events.map(event => {
          const isDemoPinned = isDemoAccount && demoEventIds.includes(event.id)
          return (
            <div
              key={event.id}
              className={`${styles.eventCard} ${isDemoPinned ? styles.demoPinned : ''}`}
            >
              {isDemoPinned && <span className={styles.demoBadge}>FEATURED</span>}
              <div
                className={styles.eventImage}
                style={{ backgroundImage: `url(${getImageUrl(event.cover_image_url, 'small')})` }}
                onClick={() => handleCardClick(event)}
              >
                <div className={styles.shine}></div>
              </div>

              {/* Info below the image - always visible */}
              <div className={styles.cardInfo}>
                <div className={styles.cardInfoAvatar}>
                  <Link
                    to={`/profile/${event.author_username}`}
                    className={styles.avatarLink}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {(event.author_full_name || event.author_username || '?').charAt(0).toUpperCase()}
                  </Link>
                </div>
                <div className={styles.cardInfoText}>
                  <h2
                    className={styles.title}
                    onClick={() => handleCardClick(event)}
                  >
                    {getShortenedTitle(event.title)}
                  </h2>
                  <Link
                    to={`/profile/${event.author_username}`}
                    className={styles.authorLink}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {event.author_full_name || event.author_username}
                  </Link>
                  <div className={styles.meta}>
                    <span>{formatDateRange(event.start_date, event.end_date)}</span>
                    {event.location_name && (
                      <>
                        <span>·</span>
                        <ShortLocation locationName={event.location_name} maxWords={3} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
