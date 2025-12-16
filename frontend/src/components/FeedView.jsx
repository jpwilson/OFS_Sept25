import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styles from './FeedView.module.css'
import { useAuth } from '../context/AuthContext'
import ShortLocation from './ShortLocation'

// Helper to get clean excerpt text
const getExcerpt = (event) => {
  if (event.summary && event.summary.trim()) {
    return event.summary
  }

  if (event.description) {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = event.description
    const plainText = tempDiv.textContent || tempDiv.innerText || ''
    return plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '')
  }

  return ''
}

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
  const { user, canAccessContent } = useAuth()
  const navigate = useNavigate()
  const [cardSize, setCardSize] = useState('small')

  // Handle card click - check subscription access for expired users
  const handleEventClick = (event) => {
    if (!user || canAccessContent) {
      navigate(`/event/${event.id}`)
      return
    }

    const isFollowingAuthor = following.includes(event.author_username)
    const isPublicEvent = event.privacy_level === 'public'

    if (isFollowingAuthor || isPublicEvent) {
      navigate(`/event/${event.id}`)
    } else if (onUpgradePrompt) {
      onUpgradePrompt()
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
        {events.map(event => (
          <div
            key={event.id}
            className={styles.eventCard}
            onClick={() => handleEventClick(event)}
          >
            <div
              className={styles.eventImage}
              style={{ backgroundImage: `url(${event.cover_image_url})` }}
            >
              <div className={styles.overlay}>
                <h2 className={styles.title}>{getShortenedTitle(event.title)}</h2>
                <div className={styles.meta}>
                  <Link
                    to={`/profile/${event.author_username}`}
                    className={styles.authorLink}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {event.author_full_name || event.author_username}
                  </Link>
                  <span>·</span>
                  <span>{formatDateRange(event.start_date, event.end_date)}</span>
                  <span>·</span>
                  <ShortLocation locationName={event.location_name} maxWords={3} />
                </div>
                <p className={styles.excerpt}>{getExcerpt(event)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
