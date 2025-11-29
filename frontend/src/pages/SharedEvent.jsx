import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import apiService from '../services/api'
import styles from './SharedEvent.module.css'

function SharedEvent() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bannerType, setBannerType] = useState(null)
  const [isExpired, setIsExpired] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)

  useEffect(() => {
    loadSharedEvent()
  }, [token, user])

  async function loadSharedEvent() {
    try {
      const data = await apiService.viewSharedEvent(token)
      setEvent(data.event)

      // Check if expired
      const expired = new Date(data.expires_at) < new Date()
      setIsExpired(expired)

      // Determine banner type based on user status
      if (!user) {
        setBannerType('not_logged_in')
      } else if (user.username === data.event.author_username) {
        setBannerType('is_author')
      } else {
        // Check if following
        try {
          const followStatus = await apiService.checkIfFollowing(data.event.author_username)
          setIsFollowing(followStatus.is_following)
          if (followStatus.is_following) {
            setBannerType('already_following')
          } else {
            setBannerType('not_following')
          }
        } catch (err) {
          setBannerType('not_following')
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading shared event:', error)
      setError(error.message || 'Failed to load event')
      setLoading(false)
    }
  }

  async function handleFollow() {
    if (!user) {
      navigate('/login')
      return
    }

    try {
      await apiService.followUser(event.author_username)
      setIsFollowing(true)
      setBannerType('already_following')
    } catch (error) {
      console.error('Error following user:', error)
    }
  }

  function formatDateRange(start, end) {
    const startDate = new Date(start)
    const endDate = end ? new Date(end) : null

    const options = { month: 'long', day: 'numeric', year: 'numeric' }

    if (!endDate || startDate.toDateString() === endDate.toDateString()) {
      return startDate.toLocaleDateString('en-US', options)
    }

    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading event...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <div className={styles.errorIcon}>🔗</div>
          <h2>Unable to Load Event</h2>
          <p>{error}</p>
          {!user && (
            <Link to="/login" className={styles.loginButton}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Banner */}
      {isExpired ? (
        <div className={`${styles.banner} ${styles.bannerExpired}`}>
          <div className={styles.bannerContent}>
            <div className={styles.bannerIcon}>⏰</div>
            <div className={styles.bannerText}>
              <strong>This share link has expired.</strong>
              <p>
                Follow <Link to={`/profile/${event.author_username}`}>@{event.author_username}</Link> to request access to their events.
              </p>
            </div>
            {!user && (
              <Link to="/login" className={styles.bannerButton}>
                Sign Up
              </Link>
            )}
          </div>
        </div>
      ) : bannerType === 'not_logged_in' ? (
        <div className={`${styles.banner} ${styles.bannerSignup}`}>
          <div className={styles.bannerContent}>
            <div className={styles.bannerIcon}>👋</div>
            <div className={styles.bannerText}>
              <strong>Enjoying this event?</strong>
              <p>
                Sign up to follow <Link to={`/profile/${event.author_username}`}>@{event.author_username}</Link> and see more of their events!
              </p>
            </div>
            <Link to="/login" className={styles.bannerButton}>
              Sign Up Free
            </Link>
          </div>
        </div>
      ) : bannerType === 'not_following' ? (
        <div className={`${styles.banner} ${styles.bannerFollow}`}>
          <div className={styles.bannerContent}>
            <div className={styles.bannerIcon}>👤</div>
            <div className={styles.bannerText}>
              <strong>Want to see more?</strong>
              <p>
                Follow <Link to={`/profile/${event.author_username}`}>@{event.author_username}</Link> to permanently access their events.
              </p>
            </div>
            <button onClick={handleFollow} className={styles.bannerButton}>
              Follow
            </button>
          </div>
        </div>
      ) : bannerType === 'already_following' ? (
        <div className={`${styles.banner} ${styles.bannerSuccess}`}>
          <div className={styles.bannerContent}>
            <div className={styles.bannerIcon}>✓</div>
            <div className={styles.bannerText}>
              <strong>You're following this user</strong>
              <p>
                You already have access to <Link to={`/profile/${event.author_username}`}>@{event.author_username}</Link>'s events.
              </p>
            </div>
            <Link to="/feed" className={styles.bannerButton}>
              Go to Feed
            </Link>
          </div>
        </div>
      ) : bannerType === 'is_author' ? (
        <div className={`${styles.banner} ${styles.bannerInfo}`}>
          <div className={styles.bannerContent}>
            <div className={styles.bannerIcon}>ℹ️</div>
            <div className={styles.bannerText}>
              <strong>This is your shared event</strong>
              <p>This is how others see your event when you share the link.</p>
            </div>
            <Link to={`/event/${event.id}`} className={styles.bannerButton}>
              View Full Event
            </Link>
          </div>
        </div>
      ) : null}

      {/* Event Content */}
      <div className={styles.eventContent}>
        {event.cover_image_url && (
          <div
            className={styles.coverImage}
            style={{ backgroundImage: `url(${event.cover_image_url})` }}
          />
        )}

        <div className={styles.eventHeader}>
          <h1 className={styles.title}>{event.title}</h1>

          <div className={styles.meta}>
            <Link to={`/profile/${event.author_username}`} className={styles.author}>
              <div className={styles.authorAvatar}>
                {event.author_full_name?.charAt(0) || event.author_username.charAt(0)}
              </div>
              <div>
                <div className={styles.authorName}>
                  {event.author_full_name || event.author_username}
                </div>
                <div className={styles.authorUsername}>@{event.author_username}</div>
              </div>
            </Link>

            <div className={styles.details}>
              <div className={styles.detail}>
                <span className={styles.detailIcon}>📅</span>
                <span>{formatDateRange(event.start_date, event.end_date)}</span>
              </div>

              {event.location_name && (
                <div className={styles.detail}>
                  <span className={styles.detailIcon}>📍</span>
                  <span>{event.location_name}</span>
                </div>
              )}

              {event.category && (
                <div className={styles.detail}>
                  <span className={styles.detailIcon}>🏷️</span>
                  <span>{event.category}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.eventBody}>
          <div
            className={styles.description}
            dangerouslySetInnerHTML={{ __html: event.description }}
          />
        </div>

        {!user && (
          <div className={styles.ctaFooter}>
            <h3>Create Your Own Events</h3>
            <p>Join thousands sharing their life stories and special moments.</p>
            <Link to="/login" className={styles.ctaButton}>
              Sign Up Free
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default SharedEvent
