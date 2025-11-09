import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styles from './Feed.module.css'
import apiService from '../services/api'
import { FeedSkeleton } from '../components/Skeleton'
import { useAuth } from '../context/AuthContext'
import ShortLocation from '../components/ShortLocation'

function Feed() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [filteredEvents, setFilteredEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, following, self
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: '',
    end: ''
  })
  const [following, setFollowing] = useState([])
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [cardSize, setCardSize] = useState('large') // large, medium, small

  useEffect(() => {
    loadEvents()
    loadFollowing()
  }, [])

  // Helper to get clean excerpt text
  const getExcerpt = (event) => {
    // Use summary if available
    if (event.summary && event.summary.trim()) {
      return event.summary
    }

    // Otherwise, strip HTML from description and limit length
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

  const loadFollowing = async () => {
    if (user) {
      const followingList = await apiService.getFollowing()
      setFollowing(followingList.map(u => u.username))
    }
  }

  useEffect(() => {
    applyFilters()
  }, [filter, selectedDateRange, events])

  async function loadEvents() {
    const data = await apiService.getEvents()
    setEvents(data)
    setFilteredEvents(data)
    setLoading(false)
  }

  const applyFilters = () => {
    let filtered = [...events]

    // Apply person filter
    if (filter === 'self' && user) {
      filtered = filtered.filter(event => event.author_username === user.username)
    } else if (filter === 'following') {
      filtered = filtered.filter(event => following.includes(event.author_username))
    }

    // Apply date filter
    if (selectedDateRange.start) {
      filtered = filtered.filter(event =>
        new Date(event.start_date) >= new Date(selectedDateRange.start)
      )
    }
    if (selectedDateRange.end) {
      filtered = filtered.filter(event =>
        new Date(event.end_date || event.start_date) <= new Date(selectedDateRange.end)
      )
    }

    setFilteredEvents(filtered)
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

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.feed}>
          <FeedSkeleton />
        </div>
      </div>
    )
  }


  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.pageTitle}>Event Feed</h1>
          <div className={styles.headerControls}>
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
            <button
              className={styles.filterToggle}
              onClick={() => setFiltersExpanded(!filtersExpanded)}
            >
              {filtersExpanded ? '▲ Hide Filters' : '▼ Show Filters'}
            </button>
          </div>
        </div>

        {filtersExpanded && (
          <div className={styles.filters}>
            <div className={styles.dateSelector}>
              <span>From:</span>
              <input
                type="date"
                value={selectedDateRange.start}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
              <span>To:</span>
              <input
                type="date"
                value={selectedDateRange.end}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>

            <button
              className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
              onClick={() => setFilter('all')}
            >
              All Events
            </button>
            <button
              className={`${styles.filterButton} ${filter === 'following' ? styles.active : ''}`}
              onClick={() => setFilter('following')}
            >
              Following
            </button>
            <button
              className={`${styles.filterButton} ${filter === 'self' ? styles.active : ''}`}
              onClick={() => setFilter('self')}
            >
              My Events
            </button>
          </div>
        )}

        {filteredEvents.length !== events.length && (
          <div className={styles.filterInfo}>
            Showing {filteredEvents.length} of {events.length} events
          </div>
        )}
      </div>

      <div className={`${styles.feed} ${styles[cardSize]}`}>
        {filteredEvents.map(event => (
          <div
            key={event.id}
            className={styles.eventCard}
            onClick={() => navigate(`/event/${event.id}`)}
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

export default Feed