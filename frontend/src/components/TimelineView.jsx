import { Link } from 'react-router-dom'
import styles from './TimelineView.module.css'

// Predefined categories with icons
const CATEGORIES = [
  { value: 'Birthday', icon: '🎂' },
  { value: 'Anniversary', icon: '💝' },
  { value: 'Vacation', icon: '✈️' },
  { value: 'Family Gathering', icon: '👨‍👩‍👧‍👦' },
  { value: 'Holiday', icon: '🎄' },
  { value: 'Project', icon: '🛠️' },
  { value: 'Daily Life', icon: '☕' },
  { value: 'Milestone', icon: '🏆' }
]

// Helper to get category icon
const getCategoryIcon = (category) => {
  const cat = CATEGORIES.find(c => c.value === category)
  return cat ? cat.icon : '📅'
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

export default function TimelineView({ events = [] }) {
  // Sort events by date (most recent first)
  const sortedEvents = [...events].sort((a, b) => new Date(b.start_date) - new Date(a.start_date))

  // Group events by year
  const eventsByYear = sortedEvents.reduce((acc, event) => {
    const year = formatYear(event.start_date)
    if (!acc[year]) {
      acc[year] = []
    }
    acc[year].push(event)
    return acc
  }, {})

  const years = Object.keys(eventsByYear).sort((a, b) => b - a) // Newest year first

  if (events.length === 0) {
    return (
      <div className={styles.noEvents}>
        <p>No events to display.</p>
      </div>
    )
  }

  return (
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
                <Link to={`/event/${event.slug || event.id}`} className={styles.eventCard}>
                  <div
                    className={styles.eventImage}
                    style={{ backgroundImage: `url(${event.cover_image_url})` }}
                  >
                    <div className={styles.categoryBadge}>
                      {getCategoryIcon(event.category)}
                    </div>
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
                        {event.location_name && <span> · {event.location_name}</span>}
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
  )
}
