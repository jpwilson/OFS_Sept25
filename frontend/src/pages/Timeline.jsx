import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './Timeline.module.css'
import apiService from '../services/api'
import { useAuth } from '../context/AuthContext'

function Timeline() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [filteredEvents, setFilteredEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, following, self
  const [following, setFollowing] = useState([])

  useEffect(() => {
    loadEvents()
    loadFollowing()
  }, [])

  const loadFollowing = async () => {
    if (user) {
      const followingList = await apiService.getFollowing()
      setFollowing(followingList.map(u => u.username))
    }
  }

  useEffect(() => {
    applyFilters()
  }, [filter, events])

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

    // Sort chronologically (oldest first for timeline)
    filtered.sort((a, b) => new Date(a.start_date) - new Date(b.start_date))

    setFilteredEvents(filtered)
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  function formatYear(dateString) {
    return new Date(dateString).getFullYear()
  }

  // Group events by year for timeline sections
  const eventsByYear = filteredEvents.reduce((acc, event) => {
    const year = formatYear(event.start_date)
    if (!acc[year]) {
      acc[year] = []
    }
    acc[year].push(event)
    return acc
  }, {})

  const years = Object.keys(eventsByYear).sort((a, b) => a - b)

  if (loading) {
    return <div className={styles.loading}>Loading timeline...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Timeline</h1>

        <div className={styles.filters}>
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

        {filteredEvents.length !== events.length && (
          <div className={styles.filterInfo}>
            Showing {filteredEvents.length} of {events.length} events
          </div>
        )}
      </div>

      <div className={styles.timeline}>
        <div className={styles.timelineLine}></div>

        {years.map(year => (
          <div key={year} className={styles.yearSection}>
            <div className={styles.yearMarker}>
              <div className={styles.yearDot}></div>
              <div className={styles.yearLabel}>{year}</div>
            </div>

            {eventsByYear[year].map((event, index) => (
              <div
                key={event.id}
                className={`${styles.timelineItem} ${index % 2 === 0 ? styles.left : styles.right}`}
              >
                <div className={styles.timelineContent}>
                  <Link to={`/event/${event.id}`} className={styles.eventCard}>
                    <div
                      className={styles.eventImage}
                      style={{ backgroundImage: `url(${event.cover_image_url})` }}
                    >
                      <div className={styles.eventOverlay}>
                        <h3 className={styles.eventTitle}>{event.title}</h3>
                        <div className={styles.eventMeta}>
                          <Link
                            to={`/profile/${event.author_username}`}
                            className={styles.authorLink}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {event.author_full_name || event.author_username}
                          </Link>
                          <span> · {event.location_name}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                  <div className={styles.eventDate}>{formatDate(event.start_date)}</div>
                </div>
                <div className={styles.timelineDot}></div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className={styles.noEvents}>
          <p>No events to display in the timeline.</p>
        </div>
      )}
    </div>
  )
}

export default Timeline
