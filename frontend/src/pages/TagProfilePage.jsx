import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import FeedView from '../components/FeedView'
import styles from './TagProfilePage.module.css'

function TagProfilePage() {
  const { profileId } = useParams()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadProfile()
    loadEvents()
  }, [profileId])

  async function loadProfile() {
    try {
      const data = await api.getTagProfile(profileId)
      if (!data) {
        setError('Tag profile not found')
      } else {
        setProfile(data)
      }
    } catch (err) {
      setError('Failed to load profile')
    }
  }

  async function loadEvents() {
    try {
      const data = await api.getTagProfileEvents(profileId)
      setEvents(data)
    } catch (err) {
      console.error('Failed to load events:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Profile Not Found</h2>
          <p>{error || 'This tag profile does not exist.'}</p>
          <Link to="/" className={styles.homeLink}>Back to Feed</Link>
        </div>
      </div>
    )
  }

  const isOwner = user && user.id === profile.created_by_id

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.avatarSection}>
          {profile.photo_url ? (
            <img
              src={profile.photo_url}
              alt={profile.name}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              #
            </div>
          )}
        </div>

        <div className={styles.info}>
          <h1 className={styles.name}>{profile.name}</h1>

          {profile.relationship_to_creator && profile.created_by_username && (
            <p className={styles.relationship}>
              <Link to={`/profile/${profile.created_by_username}`}>
                {profile.created_by_display_name || profile.created_by_username}
              </Link>
              's {profile.relationship_to_creator}
            </p>
          )}

          <p className={styles.taggedCount}>
            Tagged in {events.length} event{events.length !== 1 ? 's' : ''}
          </p>

          {isOwner && (
            <p className={styles.ownerNote}>
              You created this tag profile
            </p>
          )}
        </div>
      </div>

      <div className={styles.eventsSection}>
        <h2 className={styles.sectionTitle}>Events</h2>

        {events.length === 0 ? (
          <p className={styles.noEvents}>
            {profile.name} hasn't been tagged in any events yet.
          </p>
        ) : (
          <FeedView events={events} />
        )}
      </div>
    </div>
  )
}

export default TagProfilePage
