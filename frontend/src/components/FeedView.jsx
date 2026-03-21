import { useState, useEffect } from 'react'
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

// Lumo avatar colors - warm, vibrant palette
const AVATAR_COLORS = [
  'linear-gradient(135deg, #f97316 0%, #ef4444 100%)', // orange-red
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', // cyan-blue
  'linear-gradient(135deg, #10b981 0%, #059669 100%)', // emerald
  'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)', // amber-orange
  'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)', // pink-rose
  'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)', // violet-indigo
  'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)', // teal-cyan
  'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', // rose-red
]

const getAvatarColor = (name) => {
  let hash = 0
  const str = name || '?'
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// Check if we're on mobile/touch device
const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

export default function FeedView({ events = [], following = [], onUpgradePrompt }) {
  const { user, canAccessContent, isDemoAccount, demoEventIds } = useAuth()
  const navigate = useNavigate()
  const [cardSize, setCardSize] = useState('small')
  const [focusedCard, setFocusedCard] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isTouchDevice() || window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Navigate to event
  const goToEvent = (event) => {
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

  // Handle card click
  const handleCardClick = (event) => {
    if (isMobile) {
      // On mobile: first tap focuses, second tap navigates
      if (focusedCard === event.id) {
        goToEvent(event)
      } else {
        setFocusedCard(event.id)
      }
    } else {
      goToEvent(event)
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
          const isFocused = focusedCard === event.id
          const authorName = event.author_full_name || event.author_username || '?'
          return (
            <div
              key={event.id}
              className={`${styles.eventCard} ${isDemoPinned ? styles.demoPinned : ''} ${isFocused ? styles.focused : ''}`}
              onClick={() => handleCardClick(event)}
            >
              {isDemoPinned && <span className={styles.demoBadge}>FEATURED</span>}
              <div
                className={styles.eventImage}
                style={{ backgroundImage: `url(${getImageUrl(event.cover_image_url, 'small')})` }}
              >
                <div className={styles.shine}></div>

                {/* Hover/focus overlay with text on image */}
                <div className={styles.hoverOverlay}>
                  <div className={styles.hoverContent}>
                    <h2 className={styles.hoverTitle}>{event.title}</h2>
                    <div className={styles.hoverMeta}>
                      <span>{authorName}</span>
                      <span>·</span>
                      <span>{formatDateRange(event.start_date, event.end_date)}</span>
                      {event.location_name && (
                        <>
                          <span>·</span>
                          <ShortLocation locationName={event.location_name} maxWords={3} />
                        </>
                      )}
                    </div>
                    {isMobile && isFocused && (
                      <span className={styles.tapHint}>Tap again to view</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Info below the image - always visible */}
              <div className={styles.cardInfo}>
                <div className={styles.cardInfoAvatar}>
                  <Link
                    to={`/profile/${event.author_username}`}
                    className={styles.avatarLink}
                    style={{ background: getAvatarColor(authorName) }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {authorName.charAt(0).toUpperCase()}
                  </Link>
                </div>
                <div className={styles.cardInfoText}>
                  <h2
                    className={styles.title}
                  >
                    {getShortenedTitle(event.title)}
                  </h2>
                  <Link
                    to={`/profile/${event.author_username}`}
                    className={styles.authorLink}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {authorName}
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
