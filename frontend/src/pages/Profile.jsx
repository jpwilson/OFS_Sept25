import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import apiService from '../services/api'
import styles from './Profile.module.css'
import { ProfileSkeleton } from '../components/Skeleton'

function Profile() {
  const { username } = useParams()
  const { user: currentUser } = useAuth()
  const { showToast } = useToast()
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  const isOwnProfile = currentUser && currentUser.username === username

  useEffect(() => {
    loadProfile()
    loadUserEvents()
    if (currentUser && !isOwnProfile) {
      checkFollowStatus()
    }
  }, [username, currentUser])

  async function loadProfile() {
    const profileData = await apiService.getUserProfile(username)
    setProfile(profileData)
  }

  async function loadUserEvents() {
    try {
      const allEvents = await apiService.getEvents()
      const userEvents = allEvents.filter(event => event.author_username === username)
      setEvents(userEvents)
    } catch (error) {
      console.error('Failed to load events:', error)
    }
    setLoading(false)
  }

  async function checkFollowStatus() {
    try {
      const result = await apiService.checkIfFollowing(username)
      setIsFollowing(result.is_following)
    } catch (error) {
      console.error('Failed to check follow status:', error)
    }
  }

  async function handleFollowToggle() {
    if (followLoading) return

    setFollowLoading(true)
    try {
      if (isFollowing) {
        await apiService.unfollowUser(username)
        setIsFollowing(false)
        showToast(`Unfollowed ${profile?.full_name || username}`, 'success')
      } else {
        await apiService.followUser(username)
        setIsFollowing(true)
        showToast(`Following ${profile?.full_name || username}`, 'success')
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error)
      showToast('Failed to update follow status', 'error')
    }
    setFollowLoading(false)
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
            <span>{profile.event_count || events.length} events</span>
            <span>·</span>
            <span>{profile.follower_count || 0} followers</span>
            <span>·</span>
            <span>{profile.following_count || 0} following</span>
          </div>
        </div>
        <div className={styles.actions}>
          {isOwnProfile ? (
            <Link to="/create" className={styles.createButton}>
              Create Event
            </Link>
          ) : currentUser ? (
            <button
              className={`${styles.followButton} ${isFollowing ? styles.following : ''}`}
              onClick={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
            </button>
          ) : null}
        </div>
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