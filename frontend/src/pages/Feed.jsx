import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './Feed.module.css'
import apiService from '../services/api'
import { FeedSkeleton } from '../components/Skeleton'
import { useAuth } from '../context/AuthContext'

function Feed() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [filteredEvents, setFilteredEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, following, self
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: '',
    end: ''
  })

  useEffect(() => {
    loadEvents()
  }, [])

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
      // Mock following list
      const following = ['sarahw', 'michaelc']
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
        <h1 className={styles.pageTitle}>Event Feed</h1>

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

        {filteredEvents.length !== events.length && (
          <div className={styles.filterInfo}>
            Showing {filteredEvents.length} of {events.length} events
          </div>
        )}
      </div>

      <div className={styles.feed}>
        {filteredEvents.map(event => (
          <Link to={`/event/${event.id}`} key={event.id} className={styles.eventCard}>
            <div
              className={styles.eventImage}
              style={{ backgroundImage: `url(${event.cover_image_url})` }}
            >
              <div className={styles.overlay}>
                <h2 className={styles.title}>{event.title}</h2>
                <div className={styles.meta}>
                  <span>{event.author_full_name || event.author_username}</span>
                  <span>·</span>
                  <span>{formatDateRange(event.start_date, event.end_date)}</span>
                  <span>·</span>
                  <span>{event.location_name}</span>
                </div>
                <p className={styles.excerpt}>{event.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Feed