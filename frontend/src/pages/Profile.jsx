import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmModal'
import apiService from '../services/api'
import FollowListModal from '../components/FollowListModal'
import FollowRequestsModal from '../components/FollowRequestsModal'
import UpgradeRibbon from '../components/UpgradeRibbon'
import PremiumBadge from '../components/PremiumBadge'
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
  const [sharedLinks, setSharedLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'published') // published, drafts, trash, or shared
  const [showFollowModal, setShowFollowModal] = useState(false)
  const [followModalType, setFollowModalType] = useState('followers') // 'followers' or 'following'
  const [showRequestsModal, setShowRequestsModal] = useState(false)
  const [followStatus, setFollowStatus] = useState(null) // null, 'pending', 'accepted'
  const [requestCount, setRequestCount] = useState(0)
  const [editingExpiry, setEditingExpiry] = useState(null) // event_id being edited
  const [sharedSubTab, setSharedSubTab] = useState('active') // 'active' or 'expired'
  const [theme, setTheme] = useState(() => {
    // Get theme from localStorage, default to 'dark'
    return localStorage.getItem('theme') || 'dark'
  })

  const isOwnProfile = currentUser && currentUser.username === username

  // Apply theme globally
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  useEffect(() => {
    loadProfile()
    loadUserEvents()
    if (isOwnProfile) {
      loadDrafts()
      loadTrash()
      loadSharedLinks()
      loadRequestCount()
    }
    if (currentUser && !isOwnProfile) {
      checkFollowStatus()
    }
  }, [username, currentUser])

  async function loadProfile() {
    const profileData = await apiService.getUserProfile(username)
    setProfile(profileData)
    setLoading(false)  // Set loading false only after profile loads
  }

  async function loadUserEvents() {
    try {
      const allEvents = await apiService.getEvents()
      const userEvents = allEvents.filter(event => event.author_username === username)
      setEvents(userEvents)
    } catch (error) {
      console.error('Failed to load events:', error)
    }
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

  async function loadSharedLinks() {
    try {
      const links = await apiService.getAllShareLinks()
      setSharedLinks(links)
    } catch (error) {
      console.error('Failed to load shared links:', error)
    }
  }

  async function checkFollowStatus() {
    try {
      const result = await apiService.checkIfFollowing(username)
      setIsFollowing(result.is_following)
      setFollowStatus(result.status) // 'pending', 'accepted', or null
    } catch (error) {
      console.error('Failed to check follow status:', error)
    }
  }

  async function handleFollowToggle() {
    if (followLoading) return

    setFollowLoading(true)
    try {
      if (isFollowing || followStatus === 'pending') {
        // Unfollow or cancel pending request
        await apiService.unfollowUser(username)
        setIsFollowing(false)
        setFollowStatus(null)
        showToast(`Unfollowed ${profile?.full_name || username}`, 'success')
      } else {
        // Send follow request
        const result = await apiService.followUser(username)
        setFollowStatus('pending')
        showToast(`Follow request sent to ${profile?.full_name || username}`, 'success')
      }
      // Reload profile to update counts
      await loadProfile()
    } catch (error) {
      console.error('Failed to toggle follow:', error)
      showToast('Failed to update follow status', 'error')
    }
    setFollowLoading(false)
  }

  function handleShowFollowers() {
    setFollowModalType('followers')
    setShowFollowModal(true)
  }

  function handleShowFollowing() {
    setFollowModalType('following')
    setShowFollowModal(true)
  }

  function handleShowRequests() {
    setShowRequestsModal(true)
  }

  async function loadRequestCount() {
    try {
      const data = await apiService.getFollowRequestCount()
      setRequestCount(data.count || 0)
    } catch (error) {
      console.error('Failed to load follow request count:', error)
    }
  }

  async function handleRequestHandled() {
    // Reload profile to update follower counts and request count
    await loadProfile()
    await loadRequestCount()
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

  async function handlePublish(eventId) {
    const confirmed = await confirm({
      title: 'Publish Event',
      message: 'Make this event visible to your followers?',
      confirmText: 'Publish',
      cancelText: 'Cancel',
      danger: false
    })

    if (!confirmed) return

    try {
      await apiService.publishEvent(eventId)
      showToast('Event published successfully', 'success')
      loadDrafts() // Reload drafts to remove published event
      loadUserEvents() // Reload published events to show newly published event
    } catch (error) {
      console.error('Failed to publish event:', error)
      showToast(error.message || 'Failed to publish event', 'error')
    }
  }

  async function handleUpdateExpiry(eventId, newDays) {
    try {
      await apiService.updateShareLink(eventId, newDays)
      showToast('Share link expiry updated', 'success')
      setEditingExpiry(null)
      loadSharedLinks() // Reload shared links
    } catch (error) {
      console.error('Failed to update expiry:', error)
      showToast('Failed to update expiry', 'error')
    }
  }

  async function handleDisableShareLink(eventId, eventTitle) {
    const confirmed = await confirm({
      title: 'Disable Share Link',
      message: `Disable public sharing for "${eventTitle}"? The link will no longer work.`,
      confirmText: 'Disable',
      cancelText: 'Cancel',
      danger: true
    })

    if (!confirmed) return

    try {
      await apiService.deleteShareLink(eventId)
      showToast('Share link disabled', 'success')
      loadSharedLinks() // Reload shared links
    } catch (error) {
      console.error('Failed to disable share link:', error)
      showToast('Failed to disable share link', 'error')
    }
  }

  function copyToClipboard(text, label = 'Link') {
    navigator.clipboard.writeText(text)
      .then(() => showToast(`${label} copied to clipboard`, 'success'))
      .catch(() => showToast('Failed to copy to clipboard', 'error'))
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
      {/* Banner Section */}
      {profile.banner_url && (
        <div className={styles.bannerContainer}>
          <img src={profile.banner_url} alt="Profile banner" className={styles.bannerImage} />
        </div>
      )}

      <div className={styles.profileHeader}>
        <div className={styles.avatarContainer}>
          <PremiumBadge subscriptionTier={profile.subscription_tier || currentUser?.subscription_tier}>
            <div className={styles.avatar}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className={styles.avatarImage} />
              ) : (
                profile.full_name?.charAt(0).toUpperCase()
              )}
            </div>
          </PremiumBadge>
          {isOwnProfile && (
            <div className={styles.tierBadge}>
              {profile.subscription_tier === 'free' && <span className={styles.freeTier}>Free Plan</span>}
              {profile.subscription_tier === 'premium' && <span className={styles.premiumTier}>Premium</span>}
              {profile.subscription_tier === 'family' && <span className={styles.familyTier}>Family</span>}
            </div>
          )}
        </div>
        <div className={styles.profileInfo}>
          <h1 className={styles.name}>{profile.full_name}</h1>
          <p className={styles.username}>@{profile.username}</p>
          {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
          <div className={styles.stats}>
            <span>{profile.event_count || events.length} events</span>
            <span>·</span>
            <button
              className={styles.statButton}
              onClick={handleShowFollowers}
            >
              {profile.follower_count || 0} followers
            </button>
            <span>·</span>
            <button
              className={styles.statButton}
              onClick={handleShowFollowing}
            >
              {profile.following_count || 0} following
            </button>
          </div>
        </div>
        <div className={styles.actions}>
          {isOwnProfile ? (
            <>
              <Link to={`/profile/${username}/edit`} className={styles.editButton}>
                Edit Profile
              </Link>
              <button
                onClick={handleShowRequests}
                className={styles.requestsButton}
              >
                Follow Requests
                {requestCount > 0 && (
                  <span className={styles.requestsBadge}>{requestCount}</span>
                )}
              </button>
              <button
                onClick={() => copyToClipboard(`https://www.ourfamilysocials.com/profile/${username}`, 'Profile link')}
                className={styles.shareButton}
                title="Share your profile link"
              >
                Share Profile
              </button>
              <Link to="/create" className={styles.createButton}>
                Create Event
              </Link>
            </>
          ) : currentUser ? (
            <button
              className={`${styles.followButton} ${
                isFollowing ? styles.following :
                followStatus === 'pending' ? styles.requested : ''
              }`}
              onClick={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? '...' :
               isFollowing ? 'Following' :
               followStatus === 'pending' ? 'Requested' : 'Request to Follow'}
            </button>
          ) : null}
        </div>

        {/* Theme Toggle - positioned to the right */}
        <button
          onClick={toggleTheme}
          className={styles.themeToggle}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Show upgrade ribbon if user is at limit (5/5 events) */}
      {isOwnProfile && currentUser?.subscription_tier === 'free' && events.length >= 5 && (
        <UpgradeRibbon eventCount={events.length} limit={5} />
      )}

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
                className={`${styles.tab} ${activeTab === 'shared' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('shared')}
              >
                Shared Links ({sharedLinks.length})
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
          !isOwnProfile && followStatus !== 'accepted' && !isFollowing ? (
            <div className={styles.noEvents}>
              <p>Follow @{username} to see their events.</p>
              {currentUser && (
                <button
                  className={`${styles.followButton} ${
                    followStatus === 'pending' ? styles.requested : ''
                  }`}
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  style={{ margin: '16px auto', display: 'block' }}
                >
                  {followLoading ? '...' :
                   followStatus === 'pending' ? 'Requested' : 'Request to Follow'}
                </button>
              )}
            </div>
          ) : events.length === 0 ? (
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
                <div key={event.id} className={`${styles.eventCard} ${styles.draftCard}`}>
                  <Link
                    to={`/event/${event.id}`}
                    className={styles.eventCardLink}
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
                  <div className={styles.draftActions}>
                    <button
                      className={styles.publishButton}
                      onClick={() => handlePublish(event.id)}
                    >
                      ✓ Publish
                    </button>
                    <Link
                      to={`/event/${event.id}/edit`}
                      className={styles.editLinkButton}
                    >
                      ✎ Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'shared' && (
          <>
            <div className={styles.subTabs}>
              <button
                className={`${styles.subTab} ${sharedSubTab === 'active' ? styles.activeSubTab : ''}`}
                onClick={() => setSharedSubTab('active')}
              >
                Active ({sharedLinks.filter(l => !l.is_expired).length})
              </button>
              <button
                className={`${styles.subTab} ${sharedSubTab === 'expired' ? styles.activeSubTab : ''}`}
                onClick={() => setSharedSubTab('expired')}
              >
                Expired ({sharedLinks.filter(l => l.is_expired).length})
              </button>
            </div>

            {sharedLinks.filter(l => sharedSubTab === 'active' ? !l.is_expired : l.is_expired).length === 0 ? (
              <div className={styles.noEvents}>
                <p>No {sharedSubTab} share links.</p>
                {sharedSubTab === 'active' && (
                  <p className={styles.hint}>Share events with temporary public links from the event page.</p>
                )}
              </div>
            ) : (
              <div className={styles.sharedLinksList}>
                {sharedLinks
                  .filter(l => sharedSubTab === 'active' ? !l.is_expired : l.is_expired)
                  .map(link => {
                    const fullUrl = `${window.location.origin}${link.share_url}`
                    const expiresAt = new Date(link.expires_at)
                    const isExpired = link.is_expired

                    return (
                      <div key={link.event_id} className={styles.sharedLinkCard}>
                        <div className={styles.sharedLinkInfo}>
                          <h3 className={styles.sharedLinkTitle}>
                            {link.event_title}
                            {isExpired && <span className={styles.expiredBadge}>EXPIRED</span>}
                          </h3>
                      <div className={styles.sharedLinkUrl}>
                        <input
                          type="text"
                          value={fullUrl}
                          readOnly
                          className={styles.urlInput}
                        />
                        <button
                          onClick={() => copyToClipboard(fullUrl, 'Share link')}
                          className={styles.copyButton}
                          title="Copy to clipboard"
                        >
                          📋 Copy
                        </button>
                      </div>
                      <div className={styles.sharedLinkMeta}>
                        <span>👁 {link.view_count} views</span>
                        <span>·</span>
                        <span>
                          {isExpired ? 'Expired' : 'Expires'} {expiresAt.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {editingExpiry === link.event_id ? (
                        <div className={styles.expiryEditor}>
                          <label htmlFor={`expiry-${link.event_id}`} className={styles.expiryLabel}>
                            Extend link for:
                          </label>
                          <select
                            id={`expiry-${link.event_id}`}
                            className={styles.expirySelect}
                            onChange={(e) => handleUpdateExpiry(link.event_id, parseInt(e.target.value))}
                          >
                            <option value="">Select days...</option>
                            <option value="1">1 day</option>
                            <option value="2">2 days</option>
                            <option value="3">3 days</option>
                            <option value="4">4 days</option>
                            <option value="5">5 days</option>
                          </select>
                          <button
                            className={styles.cancelEdit}
                            onClick={() => setEditingExpiry(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <div className={styles.sharedLinkActions}>
                      {!isExpired && (
                        <>
                          <button
                            className={styles.editExpiryButton}
                            onClick={() => setEditingExpiry(link.event_id)}
                          >
                            📅 Edit Expiry
                          </button>
                          <button
                            className={styles.disableButton}
                            onClick={() => handleDisableShareLink(link.event_id, link.event_title)}
                          >
                            🔗 Disable Link
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                    )
                  })}
              </div>
            )}
          </>
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

      <FollowListModal
        isOpen={showFollowModal}
        onClose={() => setShowFollowModal(false)}
        username={username}
        type={followModalType}
      />

      <FollowRequestsModal
        isOpen={showRequestsModal}
        onClose={() => setShowRequestsModal(false)}
        onRequestHandled={handleRequestHandled}
      />

      {/* Logout at bottom - only for own profile */}
      {isOwnProfile && (
        <div className={styles.footer}>
          <button onClick={handleLogout} className={styles.footerLogoutButton}>
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

export default Profile