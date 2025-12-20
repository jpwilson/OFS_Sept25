import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import CreateTagProfileModal from '../components/CreateTagProfileModal'
import apiService from '../services/api'
import styles from './NotificationSettings.module.css'

export default function NotificationSettings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('settings') // 'settings', 'follows', 'tags'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState({
    email_notifications_enabled: true,
    notify_new_follower: true,
    notify_new_comment: true,
    notify_trial_reminder: true,
    notify_event_shared: true,
    notify_new_event_from_followed: true,
    notify_invitee_new_event: true,
    notify_tag_request: true
  })

  // Follow state
  const [followRequestsToYou, setFollowRequestsToYou] = useState([])
  const [followRequestsByYou, setFollowRequestsByYou] = useState([])
  const [followsLoading, setFollowsLoading] = useState(false)
  const [processingFollow, setProcessingFollow] = useState(null)
  const [showFollowHistory, setShowFollowHistory] = useState(false)

  // Tag state
  const [tagRequestsToYou, setTagRequestsToYou] = useState([])
  const [tagRequestsByYou, setTagRequestsByYou] = useState([])
  const [myTagProfiles, setMyTagProfiles] = useState([])
  const [tagsLoading, setTagsLoading] = useState(false)
  const [processingTag, setProcessingTag] = useState(null)
  const [showTagHistory, setShowTagHistory] = useState(false)
  const [showCreateTagModal, setShowCreateTagModal] = useState(false)

  // Profile claim state
  const [profileClaimsToYou, setProfileClaimsToYou] = useState([])
  const [profileClaimsByYou, setProfileClaimsByYou] = useState([])
  const [processingClaim, setProcessingClaim] = useState(null)

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadPreferences()
    loadFollowData()
    loadTagData()
  }, [user])

  // --- Data Loading ---

  async function loadPreferences() {
    try {
      const data = await apiService.getNotificationPreferences()
      setPreferences(data)
    } catch (error) {
      console.error('Failed to load preferences:', error)
      showToast('Failed to load notification settings', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadFollowData() {
    setFollowsLoading(true)
    try {
      const [toYou, byYou] = await Promise.all([
        apiService.getFollowRequests(),
        apiService.getSentFollowRequests()
      ])
      setFollowRequestsToYou(toYou || [])
      setFollowRequestsByYou(byYou || [])
    } catch (error) {
      console.error('Failed to load follow data:', error)
    } finally {
      setFollowsLoading(false)
    }
  }

  async function loadTagData() {
    setTagsLoading(true)
    try {
      const [toYou, byYou, profiles, claimsToYou, claimsByYou] = await Promise.all([
        apiService.getTagRequests(),
        apiService.getSentTagRequests(),
        apiService.getMyTagProfiles(),
        apiService.getTagProfileClaimsToMe(),
        apiService.getSentTagProfileClaims()
      ])
      setTagRequestsToYou(toYou || [])
      setTagRequestsByYou(byYou || [])
      setMyTagProfiles(profiles || [])
      setProfileClaimsToYou(claimsToYou || [])
      setProfileClaimsByYou(claimsByYou || [])
    } catch (error) {
      console.error('Failed to load tag data:', error)
    } finally {
      setTagsLoading(false)
    }
  }

  // --- Follow Handlers ---

  async function handleAcceptFollow(followerId) {
    setProcessingFollow(followerId)
    try {
      await apiService.acceptFollowRequest(followerId)
      setFollowRequestsToYou(prev => prev.filter(r => r.id !== followerId))
      showToast('Follow request accepted', 'success')
    } catch (error) {
      showToast('Failed to accept follow request', 'error')
    } finally {
      setProcessingFollow(null)
    }
  }

  async function handleRejectFollow(followerId) {
    setProcessingFollow(followerId)
    try {
      await apiService.rejectFollowRequest(followerId)
      setFollowRequestsToYou(prev => prev.filter(r => r.id !== followerId))
      showToast('Follow request rejected', 'success')
    } catch (error) {
      showToast('Failed to reject follow request', 'error')
    } finally {
      setProcessingFollow(null)
    }
  }

  // --- Tag Handlers ---

  async function handleAcceptTag(tagId) {
    setProcessingTag(tagId)
    try {
      await apiService.acceptTagRequest(tagId)
      setTagRequestsToYou(prev => prev.filter(r => r.id !== tagId))
      showToast('Tag accepted', 'success')
    } catch (error) {
      showToast('Failed to accept tag', 'error')
    } finally {
      setProcessingTag(null)
    }
  }

  async function handleRejectTag(tagId) {
    setProcessingTag(tagId)
    try {
      await apiService.rejectTagRequest(tagId)
      setTagRequestsToYou(prev => prev.filter(r => r.id !== tagId))
      showToast('Tag rejected', 'success')
    } catch (error) {
      showToast('Failed to reject tag', 'error')
    } finally {
      setProcessingTag(null)
    }
  }

  function handleTagProfileCreated(profile) {
    setMyTagProfiles(prev => [profile, ...prev])
    showToast('Tag profile created', 'success')
  }

  // --- Profile Claim Handlers ---

  async function handleApproveClaim(claimId) {
    setProcessingClaim(claimId)
    try {
      await apiService.approveTagProfileClaim(claimId)
      setProfileClaimsToYou(prev => prev.filter(c => c.id !== claimId))
      // Also remove the merged profile from myTagProfiles
      const claim = profileClaimsToYou.find(c => c.id === claimId)
      if (claim) {
        setMyTagProfiles(prev => prev.filter(p => p.id !== claim.tag_profile_id))
      }
      showToast('Profile claim approved and merged', 'success')
    } catch (error) {
      showToast('Failed to approve claim', 'error')
    } finally {
      setProcessingClaim(null)
    }
  }

  async function handleRejectClaim(claimId) {
    setProcessingClaim(claimId)
    try {
      await apiService.rejectTagProfileClaim(claimId)
      setProfileClaimsToYou(prev => prev.filter(c => c.id !== claimId))
      showToast('Profile claim rejected', 'success')
    } catch (error) {
      showToast('Failed to reject claim', 'error')
    } finally {
      setProcessingClaim(null)
    }
  }

  // --- Preferences Handlers ---

  async function handleToggle(key) {
    const newValue = !preferences[key]
    const newPreferences = { ...preferences, [key]: newValue }

    if (key === 'email_notifications_enabled' && !newValue) {
      newPreferences.notify_new_follower = false
      newPreferences.notify_new_comment = false
      newPreferences.notify_trial_reminder = false
      newPreferences.notify_event_shared = false
      newPreferences.notify_new_event_from_followed = false
      newPreferences.notify_invitee_new_event = false
      newPreferences.notify_tag_request = false
    }

    if (key !== 'email_notifications_enabled' && newValue) {
      newPreferences.email_notifications_enabled = true
    }

    setPreferences(newPreferences)
    await savePreferences(newPreferences)
  }

  async function savePreferences(prefs) {
    setSaving(true)
    try {
      await apiService.updateNotificationPreferences(prefs)
      showToast('Settings saved', 'success')
    } catch (error) {
      console.error('Failed to save preferences:', error)
      showToast('Failed to save settings', 'error')
      loadPreferences()
    } finally {
      setSaving(false)
    }
  }

  async function handleEnableAll() {
    const newPreferences = {
      email_notifications_enabled: true,
      notify_new_follower: true,
      notify_new_comment: true,
      notify_trial_reminder: true,
      notify_event_shared: true,
      notify_new_event_from_followed: true,
      notify_invitee_new_event: true,
      notify_tag_request: true
    }
    setPreferences(newPreferences)
    await savePreferences(newPreferences)
  }

  async function handleDisableAll() {
    const newPreferences = {
      email_notifications_enabled: false,
      notify_new_follower: false,
      notify_new_comment: false,
      notify_trial_reminder: false,
      notify_event_shared: false,
      notify_new_event_from_followed: false,
      notify_invitee_new_event: false,
      notify_tag_request: false
    }
    setPreferences(newPreferences)
    await savePreferences(newPreferences)
  }

  // --- Helpers ---

  const getBackDestination = () => {
    // If we came from somewhere, try to determine context
    if (location.state?.from) {
      return location.state.from
    }
    return `/profile/${user?.username}`
  }

  const getBackLabel = () => {
    if (location.state?.from?.includes('/profile')) {
      return '← Back to Profile'
    }
    return '← Back to Profile'
  }

  // Counts for badges
  const pendingFollowsToYou = followRequestsToYou.filter(r => r.status === 'pending' || !r.status).length
  const pendingTagsToYou = tagRequestsToYou.filter(r => r.status === 'pending').length
  const pendingClaimsToYou = profileClaimsToYou.filter(c => c.status === 'pending').length
  const totalPendingTags = pendingTagsToYou + pendingClaimsToYou

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  const allEnabled = preferences.notify_new_follower &&
                     preferences.notify_new_comment &&
                     preferences.notify_trial_reminder &&
                     preferences.notify_event_shared &&
                     preferences.notify_new_event_from_followed &&
                     preferences.notify_invitee_new_event &&
                     preferences.notify_tag_request

  const allDisabled = !preferences.notify_new_follower &&
                      !preferences.notify_new_comment &&
                      !preferences.notify_trial_reminder &&
                      !preferences.notify_event_shared &&
                      !preferences.notify_new_event_from_followed &&
                      !preferences.notify_invitee_new_event &&
                      !preferences.notify_tag_request

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(getBackDestination())}>
            {getBackLabel()}
          </button>
          <h1 className={styles.title}>Notifications</h1>
        </div>

        {/* Main Tabs */}
        <div className={styles.mainTabs}>
          <button
            className={`${styles.mainTab} ${activeTab === 'settings' ? styles.activeMainTab : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
          <button
            className={`${styles.mainTab} ${activeTab === 'follows' ? styles.activeMainTab : ''}`}
            onClick={() => setActiveTab('follows')}
          >
            Follows
            {pendingFollowsToYou > 0 && (
              <span className={styles.badge}>{pendingFollowsToYou}</span>
            )}
          </button>
          <button
            className={`${styles.mainTab} ${activeTab === 'tags' ? styles.activeMainTab : ''}`}
            onClick={() => setActiveTab('tags')}
          >
            Tags
            {totalPendingTags > 0 && (
              <span className={styles.badge}>{totalPendingTags}</span>
            )}
          </button>
        </div>

        {/* ============ FOLLOWS TAB ============ */}
        {activeTab === 'follows' && (
          <div className={styles.requestsSection}>
            {followsLoading ? (
              <div className={styles.loading}>Loading...</div>
            ) : (
              <>
                {/* Requests TO You */}
                <div className={styles.subsection}>
                  <h2 className={styles.subsectionTitle}>Requests to You</h2>
                  <p className={styles.sectionDescription}>
                    People who want to follow you
                  </p>

                  {followRequestsToYou.filter(r => r.status === 'pending' || !r.status).length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>👥</span>
                      <p>No pending follow requests</p>
                    </div>
                  ) : (
                    <div className={styles.requestsList}>
                      {followRequestsToYou.filter(r => r.status === 'pending' || !r.status).map(request => (
                        <div key={request.id} className={styles.requestItem}>
                          <Link to={`/profile/${request.follower_username}`} className={styles.requestInfo}>
                            {request.avatar_url ? (
                              <img src={request.avatar_url} alt="" className={styles.requestAvatar} />
                            ) : (
                              <div className={styles.requestAvatarPlaceholder}>
                                {request.follower_username?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div className={styles.requestDetails}>
                              <strong>{request.display_name || request.follower_username}</strong>
                              <p>@{request.follower_username}</p>
                            </div>
                          </Link>
                          <div className={styles.requestActions}>
                            <button
                              className={styles.acceptButton}
                              onClick={() => handleAcceptFollow(request.id)}
                              disabled={processingFollow === request.id}
                            >
                              Accept
                            </button>
                            <button
                              className={styles.rejectButton}
                              onClick={() => handleRejectFollow(request.id)}
                              disabled={processingFollow === request.id}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Requests BY You */}
                <div className={styles.subsection}>
                  <h2 className={styles.subsectionTitle}>Requests by You</h2>
                  <p className={styles.sectionDescription}>
                    People you've requested to follow
                  </p>

                  {followRequestsByYou.length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>📤</span>
                      <p>No sent follow requests</p>
                    </div>
                  ) : (
                    <div className={styles.requestsList}>
                      {followRequestsByYou.map(request => (
                        <div key={request.id} className={styles.requestItem}>
                          <Link to={`/profile/${request.following_username}`} className={styles.requestInfo}>
                            {request.avatar_url ? (
                              <img src={request.avatar_url} alt="" className={styles.requestAvatar} />
                            ) : (
                              <div className={styles.requestAvatarPlaceholder}>
                                {request.following_username?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div className={styles.requestDetails}>
                              <strong>{request.display_name || request.following_username}</strong>
                              <p>@{request.following_username}</p>
                            </div>
                          </Link>
                          <div className={styles.statusBadge}>
                            <span className={`${styles.status} ${styles[request.status || 'pending']}`}>
                              {request.status || 'Pending'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ============ TAGS TAB ============ */}
        {activeTab === 'tags' && (
          <div className={styles.requestsSection}>
            {tagsLoading ? (
              <div className={styles.loading}>Loading...</div>
            ) : (
              <>
                {/* Tag Requests TO You */}
                <div className={styles.subsection}>
                  <h2 className={styles.subsectionTitle}>Requests to You</h2>
                  <p className={styles.sectionDescription}>
                    People who want to tag you in their events
                  </p>

                  {tagRequestsToYou.filter(r => r.status === 'pending').length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>🏷️</span>
                      <p>No pending tag requests</p>
                    </div>
                  ) : (
                    <div className={styles.requestsList}>
                      {tagRequestsToYou.filter(r => r.status === 'pending').map(request => (
                        <div key={request.id} className={styles.requestItem}>
                          <Link to={`/event/${request.event_id}`} className={styles.requestInfo}>
                            {request.event_cover_image_url && (
                              <img src={request.event_cover_image_url} alt="" className={styles.requestImage} />
                            )}
                            <div className={styles.requestDetails}>
                              <strong>{request.event_title}</strong>
                              <p>
                                <Link to={`/profile/${request.tagged_by_username}`} onClick={e => e.stopPropagation()}>
                                  {request.tagged_by_display_name || request.tagged_by_username}
                                </Link>
                                {' wants to tag you'}
                              </p>
                            </div>
                          </Link>
                          <div className={styles.requestActions}>
                            <button
                              className={styles.acceptButton}
                              onClick={() => handleAcceptTag(request.id)}
                              disabled={processingTag === request.id}
                            >
                              Accept
                            </button>
                            <button
                              className={styles.rejectButton}
                              onClick={() => handleRejectTag(request.id)}
                              disabled={processingTag === request.id}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tag Requests BY You */}
                <div className={styles.subsection}>
                  <h2 className={styles.subsectionTitle}>Requests by You</h2>
                  <p className={styles.sectionDescription}>
                    People you've tagged in your events
                  </p>

                  {tagRequestsByYou.length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>📤</span>
                      <p>No sent tag requests</p>
                    </div>
                  ) : (
                    <div className={styles.requestsList}>
                      {tagRequestsByYou.map(request => (
                        <div key={request.id} className={styles.requestItem}>
                          <Link to={`/event/${request.event_id}`} className={styles.requestInfo}>
                            {request.event_cover_image_url && (
                              <img src={request.event_cover_image_url} alt="" className={styles.requestImage} />
                            )}
                            <div className={styles.requestDetails}>
                              <strong>{request.event_title}</strong>
                              <p>
                                Tagged{' '}
                                <Link to={`/profile/${request.tagged_user_username}`} onClick={e => e.stopPropagation()}>
                                  {request.tagged_user_display_name || request.tagged_user_username}
                                </Link>
                              </p>
                            </div>
                          </Link>
                          <div className={styles.statusBadge}>
                            <span className={`${styles.status} ${styles[request.status]}`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* My Tag Profiles */}
                <div className={styles.subsection}>
                  <div className={styles.subsectionHeader}>
                    <div>
                      <h2 className={styles.subsectionTitle}>Your Tag Profiles</h2>
                      <p className={styles.sectionDescription}>
                        People without accounts that you've created for tagging (pets, kids, relatives)
                      </p>
                    </div>
                    <button
                      className={styles.createButton}
                      onClick={() => setShowCreateTagModal(true)}
                    >
                      + Create
                    </button>
                  </div>

                  {myTagProfiles.length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>👤</span>
                      <p>No tag profiles created yet</p>
                      <button
                        className={styles.createButtonLarge}
                        onClick={() => setShowCreateTagModal(true)}
                      >
                        + Create Tag Profile
                      </button>
                    </div>
                  ) : (
                    <div className={styles.requestsList}>
                      {myTagProfiles.map(profile => (
                        <Link
                          key={profile.id}
                          to={`/tag-profile/${profile.id}`}
                          className={`${styles.requestItem} ${styles.clickableItem}`}
                        >
                          <div className={styles.requestInfo}>
                            {profile.photo_url ? (
                              <img src={profile.photo_url} alt="" className={styles.requestAvatar} />
                            ) : (
                              <div className={styles.requestAvatarPlaceholder}>
                                {profile.name?.[0]?.toUpperCase() || '#'}
                              </div>
                            )}
                            <div className={styles.requestDetails}>
                              <strong>{profile.name}</strong>
                              {profile.relationship_to_creator && (
                                <p>Your {profile.relationship_to_creator}</p>
                              )}
                            </div>
                          </div>
                          <span className={styles.viewArrow}>→</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Profile Claim Requests TO You */}
                {profileClaimsToYou.filter(c => c.status === 'pending').length > 0 && (
                  <div className={styles.subsection}>
                    <h2 className={styles.subsectionTitle}>Profile Claim Requests</h2>
                    <p className={styles.sectionDescription}>
                      People claiming to be one of your tag profiles
                    </p>

                    <div className={styles.requestsList}>
                      {profileClaimsToYou.filter(c => c.status === 'pending').map(claim => (
                        <div key={claim.id} className={styles.requestItem}>
                          <div className={styles.requestInfo}>
                            {claim.claimant_avatar_url ? (
                              <img src={claim.claimant_avatar_url} alt="" className={styles.requestAvatar} />
                            ) : (
                              <div className={styles.requestAvatarPlaceholder}>
                                {claim.claimant_username?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div className={styles.requestDetails}>
                              <strong>
                                <Link to={`/profile/${claim.claimant_username}`}>
                                  {claim.claimant_display_name || claim.claimant_username}
                                </Link>
                              </strong>
                              <p>
                                wants to claim "{claim.tag_profile_name}"
                                {claim.tag_profile_relationship && ` (your ${claim.tag_profile_relationship})`}
                              </p>
                              {claim.message && (
                                <p className={styles.claimMessage}>"{claim.message}"</p>
                              )}
                            </div>
                          </div>
                          <div className={styles.requestActions}>
                            <button
                              className={styles.acceptButton}
                              onClick={() => handleApproveClaim(claim.id)}
                              disabled={processingClaim === claim.id}
                            >
                              Approve
                            </button>
                            <button
                              className={styles.rejectButton}
                              onClick={() => handleRejectClaim(claim.id)}
                              disabled={processingClaim === claim.id}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Profile Claims BY You */}
                {profileClaimsByYou.length > 0 && (
                  <div className={styles.subsection}>
                    <h2 className={styles.subsectionTitle}>Your Profile Claims</h2>
                    <p className={styles.sectionDescription}>
                      Tag profiles you've requested to claim as your identity
                    </p>

                    <div className={styles.requestsList}>
                      {profileClaimsByYou.map(claim => (
                        <div key={claim.id} className={styles.requestItem}>
                          <div className={styles.requestInfo}>
                            {claim.tag_profile_photo_url ? (
                              <img src={claim.tag_profile_photo_url} alt="" className={styles.requestAvatar} />
                            ) : (
                              <div className={styles.requestAvatarPlaceholder}>
                                {claim.tag_profile_name?.[0]?.toUpperCase() || '#'}
                              </div>
                            )}
                            <div className={styles.requestDetails}>
                              <strong>{claim.tag_profile_name}</strong>
                              <p>
                                Created by{' '}
                                <Link to={`/profile/${claim.profile_creator_username}`}>
                                  {claim.profile_creator_display_name || claim.profile_creator_username}
                                </Link>
                                {claim.tag_profile_relationship && ` (their ${claim.tag_profile_relationship})`}
                              </p>
                            </div>
                          </div>
                          <div className={styles.statusBadge}>
                            <span className={`${styles.status} ${styles[claim.status]}`}>
                              {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Create Tag Profile Modal */}
                <CreateTagProfileModal
                  isOpen={showCreateTagModal}
                  onClose={() => setShowCreateTagModal(false)}
                  onCreated={handleTagProfileCreated}
                />
              </>
            )}
          </div>
        )}

        {/* ============ SETTINGS TAB ============ */}
        {activeTab === 'settings' && (
          <>
            {/* Email/Push Tabs */}
            <div className={styles.tabs}>
              <button className={`${styles.tab} ${styles.activeTab}`}>
                ✉️ Email
              </button>
              <button className={`${styles.tab} ${styles.disabledTab}`} disabled title="Coming soon">
                🔔 Push
              </button>
            </div>

            {/* Master Toggle */}
            <div className={styles.masterSection}>
              <div className={styles.masterToggle}>
                <div className={styles.toggleInfo}>
                  <h3>Email Notifications</h3>
                  <p>Receive emails from Our Family Socials</p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={preferences.email_notifications_enabled}
                    onChange={() => handleToggle('email_notifications_enabled')}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={styles.quickActions}>
              <button
                className={styles.quickButton}
                onClick={handleEnableAll}
                disabled={allEnabled || saving}
              >
                Enable All
              </button>
              <button
                className={styles.quickButton}
                onClick={handleDisableAll}
                disabled={allDisabled || saving}
              >
                Disable All
              </button>
            </div>

            {/* Individual Notifications */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Activity</h2>

              <div className={styles.notificationItem}>
                <div className={styles.notificationInfo}>
                  <span className={styles.notificationIcon}>👤</span>
                  <div>
                    <h4>New Followers</h4>
                    <p>When someone starts following you</p>
                  </div>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={preferences.notify_new_follower}
                    onChange={() => handleToggle('notify_new_follower')}
                    disabled={!preferences.email_notifications_enabled}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.notificationItem}>
                <div className={styles.notificationInfo}>
                  <span className={styles.notificationIcon}>💬</span>
                  <div>
                    <h4>Comments</h4>
                    <p>When someone comments on your events</p>
                  </div>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={preferences.notify_new_comment}
                    onChange={() => handleToggle('notify_new_comment')}
                    disabled={!preferences.email_notifications_enabled}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.notificationItem}>
                <div className={styles.notificationInfo}>
                  <span className={styles.notificationIcon}>📸</span>
                  <div>
                    <h4>New Events from Following</h4>
                    <p>When someone you follow shares a new event</p>
                  </div>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={preferences.notify_new_event_from_followed}
                    onChange={() => handleToggle('notify_new_event_from_followed')}
                    disabled={!preferences.email_notifications_enabled}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.notificationItem}>
                <div className={styles.notificationInfo}>
                  <span className={styles.notificationIcon}>👁️</span>
                  <div>
                    <h4>Event Views</h4>
                    <p>When someone views your shared event link</p>
                  </div>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={preferences.notify_event_shared}
                    onChange={() => handleToggle('notify_event_shared')}
                    disabled={!preferences.email_notifications_enabled}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.notificationItem}>
                <div className={styles.notificationInfo}>
                  <span className={styles.notificationIcon}>✉️</span>
                  <div>
                    <h4>Notify Invited Viewers</h4>
                    <p>Email your invited viewers when you publish new events</p>
                  </div>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={preferences.notify_invitee_new_event}
                    onChange={() => handleToggle('notify_invitee_new_event')}
                    disabled={!preferences.email_notifications_enabled}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.notificationItem}>
                <div className={styles.notificationInfo}>
                  <span className={styles.notificationIcon}>🏷️</span>
                  <div>
                    <h4>Tag Requests</h4>
                    <p>When someone tags you in an event</p>
                  </div>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={preferences.notify_tag_request}
                    onChange={() => handleToggle('notify_tag_request')}
                    disabled={!preferences.email_notifications_enabled}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Account</h2>

              <div className={styles.notificationItem}>
                <div className={styles.notificationInfo}>
                  <span className={styles.notificationIcon}>⏰</span>
                  <div>
                    <h4>Trial Reminders</h4>
                    <p>Reminders before your free trial ends</p>
                  </div>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={preferences.notify_trial_reminder}
                    onChange={() => handleToggle('notify_trial_reminder')}
                    disabled={!preferences.email_notifications_enabled}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>

            <div className={styles.footer}>
              <p className={styles.footerNote}>
                Emails are sent from notifications@ourfamilysocials.com
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
