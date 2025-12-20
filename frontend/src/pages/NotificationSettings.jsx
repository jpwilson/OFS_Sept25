import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import apiService from '../services/api'
import styles from './NotificationSettings.module.css'

export default function NotificationSettings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('settings') // 'settings', 'tagRequests', 'followRequests'
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

  // Tag requests state
  const [tagRequests, setTagRequests] = useState([])
  const [tagRequestsLoading, setTagRequestsLoading] = useState(false)
  const [processingTag, setProcessingTag] = useState(null)

  // Follow requests state
  const [followRequests, setFollowRequests] = useState([])
  const [followRequestsLoading, setFollowRequestsLoading] = useState(false)
  const [processingFollow, setProcessingFollow] = useState(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadPreferences()
    loadTagRequests()
    loadFollowRequests()
  }, [user])

  async function loadTagRequests() {
    setTagRequestsLoading(true)
    try {
      const data = await apiService.getTagRequests()
      setTagRequests(data || [])
    } catch (error) {
      console.error('Failed to load tag requests:', error)
    } finally {
      setTagRequestsLoading(false)
    }
  }

  async function loadFollowRequests() {
    setFollowRequestsLoading(true)
    try {
      const data = await apiService.getFollowRequests()
      setFollowRequests(data || [])
    } catch (error) {
      console.error('Failed to load follow requests:', error)
    } finally {
      setFollowRequestsLoading(false)
    }
  }

  async function handleAcceptTag(tagId) {
    setProcessingTag(tagId)
    try {
      await apiService.acceptTagRequest(tagId)
      setTagRequests(prev => prev.filter(r => r.id !== tagId))
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
      setTagRequests(prev => prev.filter(r => r.id !== tagId))
      showToast('Tag rejected', 'success')
    } catch (error) {
      showToast('Failed to reject tag', 'error')
    } finally {
      setProcessingTag(null)
    }
  }

  async function handleAcceptFollow(followerId) {
    setProcessingFollow(followerId)
    try {
      await apiService.acceptFollowRequest(followerId)
      setFollowRequests(prev => prev.filter(r => r.id !== followerId))
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
      setFollowRequests(prev => prev.filter(r => r.id !== followerId))
      showToast('Follow request rejected', 'success')
    } catch (error) {
      showToast('Failed to reject follow request', 'error')
    } finally {
      setProcessingFollow(null)
    }
  }

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

  async function handleToggle(key) {
    const newValue = !preferences[key]
    const newPreferences = { ...preferences, [key]: newValue }

    // If turning off master toggle, turn off all
    if (key === 'email_notifications_enabled' && !newValue) {
      newPreferences.notify_new_follower = false
      newPreferences.notify_new_comment = false
      newPreferences.notify_trial_reminder = false
      newPreferences.notify_event_shared = false
      newPreferences.notify_new_event_from_followed = false
      newPreferences.notify_invitee_new_event = false
      newPreferences.notify_tag_request = false
    }

    // If turning on any individual notification, ensure master is on
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
      // Reload to get actual state
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
                     preferences.notify_invitee_new_event

  const allDisabled = !preferences.notify_new_follower &&
                      !preferences.notify_new_comment &&
                      !preferences.notify_trial_reminder &&
                      !preferences.notify_event_shared &&
                      !preferences.notify_new_event_from_followed &&
                      !preferences.notify_invitee_new_event

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1 className={styles.title}>Notification Settings</h1>
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
            className={`${styles.mainTab} ${activeTab === 'followRequests' ? styles.activeMainTab : ''}`}
            onClick={() => setActiveTab('followRequests')}
          >
            Follow Requests
            {followRequests.length > 0 && (
              <span className={styles.badge}>{followRequests.length}</span>
            )}
          </button>
          <button
            className={`${styles.mainTab} ${activeTab === 'tagRequests' ? styles.activeMainTab : ''}`}
            onClick={() => setActiveTab('tagRequests')}
          >
            Tag Requests
            {tagRequests.length > 0 && (
              <span className={styles.badge}>{tagRequests.length}</span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'tagRequests' && (
          <div className={styles.requestsSection}>
            <h2 className={styles.sectionTitle}>Pending Tag Requests</h2>
            <p className={styles.sectionDescription}>
              Review requests from people who want to tag you in their events.
            </p>

            {tagRequestsLoading ? (
              <div className={styles.loading}>Loading...</div>
            ) : tagRequests.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🏷️</span>
                <p>No pending tag requests</p>
              </div>
            ) : (
              <div className={styles.requestsList}>
                {tagRequests.map(request => (
                  <div key={request.id} className={styles.requestItem}>
                    <Link to={`/event/${request.event_id}`} className={styles.requestInfo}>
                      {request.event_cover_image_url && (
                        <img
                          src={request.event_cover_image_url}
                          alt=""
                          className={styles.requestImage}
                        />
                      )}
                      <div className={styles.requestDetails}>
                        <strong>{request.event_title}</strong>
                        <p>
                          <Link to={`/profile/${request.tagged_by_username}`}>
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
        )}

        {activeTab === 'followRequests' && (
          <div className={styles.requestsSection}>
            <h2 className={styles.sectionTitle}>Pending Follow Requests</h2>
            <p className={styles.sectionDescription}>
              Review requests from people who want to follow you.
            </p>

            {followRequestsLoading ? (
              <div className={styles.loading}>Loading...</div>
            ) : followRequests.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>👥</span>
                <p>No pending follow requests</p>
              </div>
            ) : (
              <div className={styles.requestsList}>
                {followRequests.map(request => (
                  <div key={request.id} className={styles.requestItem}>
                    <Link to={`/profile/${request.follower_username}`} className={styles.requestInfo}>
                      {request.avatar_url ? (
                        <img
                          src={request.avatar_url}
                          alt=""
                          className={styles.requestAvatar}
                        />
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
        )}

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
