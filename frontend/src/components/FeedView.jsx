import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import styles from './FeedView.module.css'
import { useAuth } from '../context/AuthContext'
import ShortLocation from './ShortLocation'
import { getImageUrl } from '../utils/cloudinaryUrl'

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

// Check if we're on mobile/touch device
const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

export default function FeedView({ events = [], following = [], onUpgradePrompt }) {
  const { user, canAccessContent } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [cardSize, setCardSize] = useState('small')
  const [activeCards, setActiveCards] = useState(new Set()) // Cards with visible text (for mobile)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isTouchDevice() || window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Reset active cards when view param changes (feed/calendar/map/timeline)
  useEffect(() => {
    setActiveCards(new Set())
  }, [searchParams.get('view')])

  // Handle card click
  const handleCardClick = (event, e) => {
    const eventPath = event.slug || event.id

    if (isMobile) {
      // On mobile: toggle text visibility
      e.preventDefault()
      setActiveCards(prev => {
        const newSet = new Set(prev)
        if (newSet.has(event.id)) {
          newSet.delete(event.id)
        } else {
          newSet.add(event.id)
        }
        return newSet
      })
    } else {
      // On desktop: navigate to event (check subscription access for expired users)
      if (!user || canAccessContent) {
        navigate(`/event/${eventPath}`)
        return
      }

      // Authors can always view their own events
      const isOwnEvent = event.author_id === user.id || event.author_username === user.username
      const isFollowingAuthor = following.includes(event.author_username)
      const isPublicEvent = event.privacy_level === 'public'

      if (isOwnEvent || isFollowingAuthor || isPublicEvent) {
        navigate(`/event/${eventPath}`)
      } else if (onUpgradePrompt) {
        onUpgradePrompt(event)
      }
    }
  }

  // Handle navigation when text is visible on mobile
  const handleNavigate = (event, e) => {
    e.stopPropagation()
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
          const isActive = activeCards.has(event.id)
          return (
            <div
              key={event.id}
              className={`${styles.eventCard} ${isActive ? styles.active : ''}`}
              onClick={(e) => handleCardClick(event, e)}
            >
              <div
                className={styles.eventImage}
                style={{ backgroundImage: `url(${getImageUrl(event.cover_image_url, 'small')})` }}
              >
                {/* Glossy shine effect */}
                <div className={styles.shine}></div>

                <div className={styles.overlay}>
                  <div className={styles.overlayContent}>
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

                    {/* View button on mobile when text is visible */}
                    {isMobile && isActive && (
                      <button
                        className={styles.viewButton}
                        onClick={(e) => handleNavigate(event, e)}
                      >
                        View Event →
                      </button>
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
