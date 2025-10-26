import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmModal'
import apiService from '../services/api'
import styles from './Profile.module.css'
import { ProfileSkeleton } from '../components/Skeleton'

function Profile() {
  const { username } = useParams()
  const location = useLocation()
  const { user: currentUser, logout } = useAuth()
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [drafts, setDrafts] = useState([])
  const [trash, setTrash] = useState([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'published') // published, drafts, or trash

  const isOwnProfile = currentUser && currentUser.username === username

  useEffect(() => {
    loadProfile()
    loadUserEvents()
    if (isOwnProfile) {
      loadDrafts()
      loadTrash()
    }
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

  async function loadDrafts() {
    try {
      const draftEvents = await apiService.getDrafts()
      setDrafts(draftEvents)
    } catch (error) {
      console.error('Failed to load drafts:', error)
    }
  }

  async function loadTrash() {
    try {
      const trashEvents = await apiService.getTrash()
      setTrash(trashEvents)
    } catch (error) {
      console.error('Failed to load trash:', error)
    }
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

  async function handleRestore(eventId) {
    const confirmed = await confirm({
      title: 'Restore Event',
      message: 'Restore this event from trash? It will be moved back to your drafts.',
      confirmText: 'Restore',
      cancelText: 'Cancel',
      danger: false
    })

    if (!confirmed) return

    try {
      await apiService.restoreEvent(eventId)
      showToast('Event restored successfully', 'success')
      loadTrash()
      loadDrafts() // Restored items go back to drafts
    } catch (error) {
      console.error('Failed to restore event:', error)
      showToast('Failed to restore event', 'error')
    }
  }

  async function handlePermanentDelete(eventId) {
    const confirmed = await confirm({
      title: 'Permanently Delete',
      message: 'Permanently delete this event? This action cannot be undone!',
      confirmText: 'Delete Forever',
      cancelText: 'Cancel',
      danger: true
    })

    if (!confirmed) return

    try {
      await apiService.permanentlyDeleteEvent(eventId)
      showToast('Event permanently deleted', 'success')
      loadTrash()
    } catch (error) {
      console.error('Failed to permanently delete event:', error)
      showToast('Failed to permanently delete event', 'error')
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
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
            <>
              <Link to="/create" className={styles.createButton}>
                Create Event
              </Link>
              <button
                onClick={handleLogout}
                className={styles.logoutButton}
              >
                Logout
              </button>
            </>
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
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {isOwnProfile ? 'Your Events' : 'Events'}
          </h2>
          {isOwnProfile && (
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'published' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('published')}
              >
                Published ({events.length})
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'drafts' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('drafts')}
              >
                Drafts ({drafts.length})
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'trash' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('trash')}
              >
                Trash ({trash.length})
              </button>
            </div>
          )}
        </div>

        {activeTab === 'published' && (
          events.length === 0 ? (
            <div className={styles.noEvents}>
              {isOwnProfile ? (
                <>
                  <p>You haven't published any events yet.</p>
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
          )
        )}

        {activeTab === 'drafts' && (
          drafts.length === 0 ? (
            <div className={styles.noEvents}>
              <p>No drafts yet.</p>
              <p className={styles.hint}>Save events as drafts to finish them later.</p>
            </div>
          ) : (
            <div className={styles.eventsGrid}>
              {drafts.map(event => (
                <Link
                  key={event.id}
                  to={`/event/${event.id}`}
                  className={`${styles.eventCard} ${styles.draftCard}`}
                >
                  <div
                    className={styles.eventImage}
                    style={{ backgroundImage: `url(${event.cover_image_url})` }}
                  >
                    <div className={styles.draftBadge}>DRAFT</div>
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
          )
        )}

        {activeTab === 'trash' && (
          trash.length === 0 ? (
            <div className={styles.noEvents}>
              <p>Trash is empty.</p>
              <p className={styles.hint}>Deleted events will appear here for 30 days before permanent deletion.</p>
            </div>
          ) : (
            <div className={styles.eventsGrid}>
              {trash.map(event => (
                <div key={event.id} className={`${styles.eventCard} ${styles.trashCard}`}>
                  <div
                    className={styles.eventImage}
                    style={{ backgroundImage: `url(${event.cover_image_url})` }}
                  >
                    <div className={styles.trashBadge}>TRASH</div>
                    <div className={styles.eventOverlay}>
                      <h3 className={styles.eventTitle}>{event.title}</h3>
                      <p className={styles.eventDate}>
                        {formatDate(event.start_date)}
                      </p>
                    </div>
                  </div>
                  <div className={styles.trashActions}>
                    <button
                      className={styles.restoreButton}
                      onClick={() => handleRestore(event.id)}
                    >
                      ↶ Restore
                    </button>
                    <button
                      className={styles.permanentDeleteButton}
                      onClick={() => handlePermanentDelete(event.id)}
                    >
                      🗑 Delete Forever
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default Profile