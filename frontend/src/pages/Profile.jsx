import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmModal'
import apiService from '../services/api'
import FollowListModal from '../components/FollowListModal'
import UpgradeRibbon from '../components/UpgradeRibbon'
import PremiumBadge from '../components/PremiumBadge'
import NotificationDot from '../components/NotificationDot'
import RelationshipProposalModal from '../components/RelationshipProposalModal'
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
  const [showFollowModal, setShowFollowModal] = useState(false)
  const [followModalType, setFollowModalType] = useState('followers') // 'followers' or 'following'
  const [followStatus, setFollowStatus] = useState(null) // null, 'pending', 'accepted'
  const [notificationCounts, setNotificationCounts] = useState({
    total: 0,
    follow_requests: 0,
    tag_requests: 0,
    profile_claims: 0
  })
  const [isMutualFollow, setIsMutualFollow] = useState(false)
  const [theyFollowMe, setTheyFollowMe] = useState(false) // Whether they follow the current user
  const [existingRelationship, setExistingRelationship] = useState(null)
  const [relationshipLoading, setRelationshipLoading] = useState(true) // Start as loading
  const [showRelationshipModal, setShowRelationshipModal] = useState(false)

  const isOwnProfile = currentUser && currentUser.username === username

  // Require login to view any profile
  useEffect(() => {
    if (!currentUser && !loading) {
      navigate('/login', { state: { from: `/profile/${username}`, message: 'Please sign in to view profiles' } })
    }
  }, [currentUser, loading, navigate, username])

  useEffect(() => {
    loadProfile()
    loadUserEvents()
    if (isOwnProfile) {
      loadDrafts()
      loadTrash()
      loadNotificationCounts()
    }
    if (currentUser && !isOwnProfile) {
      checkFollowStatus()
    }
  }, [username, currentUser])

  async function checkMutualFollowAndRelationship(profileId) {
    setRelationshipLoading(true)
    try {
      // Check if this is a mutual follow
      // Note: Backend returns is_following=true only when status='accepted'
      const followCheck = await apiService.checkIfFollowing(username)
      const theyFollowMeCheck = await apiService.checkIfFollowingMe(username)

      // Both must be true for mutual follow
      const iFollow = followCheck.is_following
      const theyFollow = theyFollowMeCheck.is_following
      const mutual = iFollow && theyFollow

      setIsMutualFollow(mutual)
      setTheyFollowMe(theyFollow) // Track if they follow me (independent of mutual)

      // Check for existing relationship (only if mutual follow)
      if (mutual && profileId) {
        const relationship = await apiService.getRelationshipWith(profileId)
        setExistingRelationship(relationship)
      } else {
        setExistingRelationship(null)
      }
    } catch (error) {
      console.error('Error checking relationship status:', error)
      setIsMutualFollow(false)
      setTheyFollowMe(false)
      setExistingRelationship(null)
    } finally {
      setRelationshipLoading(false)
    }
  }

  async function loadNotificationCounts() {
    try {
      const counts = await apiService.getNotificationCounts()
      setNotificationCounts(counts)
    } catch (error) {
      console.error('Failed to load notification counts:', error)
    }
  }

  async function loadProfile() {
    const profileData = await apiService.getUserProfile(username)
    setProfile(profileData)
    setLoading(false)  // Set loading false only after profile loads

    // Check relationship status after profile loads (needs profile.id)
    if (currentUser && currentUser.username !== username && profileData?.id) {
      checkMutualFollowAndRelationship(profileData.id)
    }
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

          {/* Inactive member message - show when viewing someone else's profile */}
          {!isOwnProfile && profile.is_active_member === false && (
            <div className={styles.inactiveMemberBanner}>
              <span className={styles.inactiveIcon}>ℹ️</span>
              <span>This member's subscription is currently inactive. Their events are not visible at this time.</span>
            </div>
          )}
        </div>
        <div className={styles.actions}>
          {isOwnProfile ? (
            <>
              <Link to={`/profile/${username}/edit`} className={styles.editButton}>
                Edit Profile
              </Link>
              <Link to="/billing" className={styles.membershipButton}>
                Membership
              </Link>
              <Link to="/settings/notifications" className={styles.notificationsButton}>
                Notifications
                {notificationCounts.total > 0 && (
                  <NotificationDot
                    count={notificationCounts.total}
                    dismissable={false}
                    size="small"
                  />
                )}
              </Link>
              <Link to="/create" className={styles.createButton}>
                Create Event
              </Link>
            </>
          ) : currentUser ? (
            <>
              {/* "Follows you" badge - shows when they follow you, independent of your follow status */}
              {!relationshipLoading && theyFollowMe && (
                <span className={styles.followsYouBadge}>Follows you</span>
              )}
              {/* Show different UI based on follow status */}
              {isFollowing ? (
                // Just a label when already following (unfollow moved to bottom)
                <span className={styles.followingLabel}>Following</span>
              ) : (
                // Interactive button for follow/request
                <button
                  className={`${styles.followButton} ${
                    followStatus === 'pending' ? styles.requested : ''
                  }`}
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                >
                  {followLoading ? '...' :
                   followStatus === 'pending' ? 'Requested' : 'Request to Follow'}
                </button>
              )}
              {/* Show Add Relationship button for mutual followers when no accepted/pending relationship exists */}
              {!relationshipLoading && isMutualFollow &&
               (!existingRelationship || existingRelationship.status === 'rejected') && (
                <button
                  className={styles.relationshipButton}
                  onClick={() => setShowRelationshipModal(true)}
                >
                  Add Relationship
                </button>
              )}
              {/* Show relationship type label if exists and has a value */}
              {!relationshipLoading && existingRelationship?.status === 'accepted' && existingRelationship.my_relationship_to_them && (
                <span className={styles.relationshipLabel}>
                  {existingRelationship.my_relationship_to_them}
                </span>
              )}
              {!relationshipLoading && existingRelationship?.status === 'pending' && (
                <span className={styles.relationshipPending}>
                  Relationship pending
                </span>
              )}
            </>
          ) : null}
        </div>
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

      <RelationshipProposalModal
        isOpen={showRelationshipModal}
        onClose={() => setShowRelationshipModal(false)}
        otherUser={profile}
        onSuccess={() => {
          setShowRelationshipModal(false)
          // Refresh relationship status
          if (profile?.id) {
            checkMutualFollowAndRelationship(profile.id)
          }
        }}
      />

      {/* Footer actions */}
      {isOwnProfile ? (
        <div className={styles.footer}>
          <button onClick={handleLogout} className={styles.footerLogoutButton}>
            Logout
          </button>
        </div>
      ) : isFollowing && (
        <div className={styles.footer}>
          <button
            onClick={handleFollowToggle}
            className={styles.footerUnfollowButton}
            disabled={followLoading}
          >
            {followLoading ? 'Unfollowing...' : 'Unfollow'}
          </button>
        </div>
      )}
    </div>
  )
}

export default Profile