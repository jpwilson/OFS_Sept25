import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './Feed.module.css'
import apiService from '../services/api'
import { FeedSkeleton } from '../components/Skeleton'

function Feed() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    const data = await apiService.getEvents()
    setEvents(data)
    setLoading(false)
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
      <div className={styles.feed}>
        {events.map(event => (
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