import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Profile.module.css'
import { ProfileSkeleton } from '../components/Skeleton'

function Profile() {
  const { username } = useParams()
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const isOwnProfile = currentUser && currentUser.username === username

  useEffect(() => {
    loadProfile()
    loadUserEvents()
  }, [username])

  async function loadProfile() {
    // Mock profile data for now
    setProfile({
      username: username,
      full_name: username === 'sarahw' ? 'Sarah Wilson' :
                 username === 'michaelc' ? 'Michael Chen' :
                 username === 'emmar' ? 'Emma Rodriguez' : 'Unknown User',
      bio: 'Adventurer, storyteller, and memory keeper. Sharing life\'s beautiful moments with family and friends.',
      avatar_url: null,
      event_count: 3,
      joined_date: '2025-01-01'
    })
  }

  async function loadUserEvents() {
    try {
      const response = await fetch('/api/v1/events')
      if (response.ok) {
        const allEvents = await response.json()
        // Filter events by username (mock filtering)
        const userEvents = allEvents.filter(event =>
          event.author_username === username || username === 'me'
        )
        setEvents(userEvents.slice(0, 6)) // Limit to 6 events for now
      }
    } catch (error) {
      console.error('Failed to load events:', error)
    }
    setLoading(false)
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return <ProfileSkeleton />
  }

  if (!profile) {
    return <div className={styles.notFound}>User not found</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.profileHeader}>
        <div className={styles.avatar}>
          {profile.full_name?.charAt(0).toUpperCase()}
        </div>
        <div className={styles.profileInfo}>
          <h1 className={styles.name}>{profile.full_name}</h1>
          <p className={styles.username}>@{profile.username}</p>
          {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
          <div className={styles.stats}>
            <span>{events.length} events</span>
            <span>·</span>
            <span>Member since {formatDate(profile.joined_date)}</span>
          </div>
        </div>
        {isOwnProfile && (
          <div className={styles.actions}>
            <Link to="/create" className={styles.createButton}>
              Create Event
            </Link>
          </div>
        )}
      </div>

      <div className={styles.eventsSection}>
        <h2 className={styles.sectionTitle}>
          {isOwnProfile ? 'Your Events' : 'Events'}
        </h2>

        {events.length === 0 ? (
          <div className={styles.noEvents}>
            {isOwnProfile ? (
              <>
                <p>You haven't created any events yet.</p>
                <Link to="/create" className={styles.createLink}>
                  Create your first event
                </Link>
              </>
            ) : (
              <p>No events to show.</p>
            )}
          </div>
        ) : (
          <div className={styles.eventsGrid}>
            {events.map(event => (
              <Link
                key={event.id}
                to={`/event/${event.id}`}
                className={styles.eventCard}
              >
                <div
                  className={styles.eventImage}
                  style={{ backgroundImage: `url(${event.cover_image_url})` }}
                >
                  <div className={styles.eventOverlay}>
                    <h3 className={styles.eventTitle}>{event.title}</h3>
                    <p className={styles.eventDate}>
                      {formatDate(event.start_date)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile