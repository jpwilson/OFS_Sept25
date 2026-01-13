import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import CreateTagProfileModal from '../components/CreateTagProfileModal'
import apiService from '../services/api'
import styles from './Preferences.module.css'

export default function Preferences() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('appearance') // 'appearance', 'email', 'push', 'tag-profiles'

  // Theme state
  const [theme, setTheme] = useState('dark')

  // Email preferences state
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

  // Tag profiles state
  const [myTagProfiles, setMyTagProfiles] = useState([])
  const [tagProfilesLoading, setTagProfilesLoading] = useState(false)
  const [showCreateTagModal, setShowCreateTagModal] = useState(false)

  // Per-user event notification state
  const [followingList, setFollowingList] = useState([])
  const [followingExpanded, setFollowingExpanded] = useState(false)
  const [updatingNotifyUser, setUpdatingNotifyUser] = useState(null)

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    // Initialize theme from user data or localStorage
    const savedTheme = user.theme_preference || localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)

    loadAllData()
  }, [user])

  async function loadAllData() {
    setLoading(true)
    await Promise.all([
      loadPreferences(),
      loadTagProfiles(),
      loadFollowingList()
    ])
    setLoading(false)
  }

  async function loadPreferences() {
    try {
      const data = await apiService.getNotificationPreferences()
      setPreferences(data)
    } catch (error) {
      console.error('Failed to load preferences:', error)
      showToast('Failed to load notification settings', 'error')
    }
  }

  async function loadTagProfiles() {
    setTagProfilesLoading(true)
    try {
      const profiles = await apiService.getMyTagProfiles()
      setMyTagProfiles(profiles || [])
    } catch (error) {
      console.error('Failed to load tag profiles:', error)
    } finally {
      setTagProfilesLoading(false)
    }
  }

  async function loadFollowingList() {
    try {
      const data = await apiService.getFollowing()
      setFollowingList(data || [])
    } catch (error) {
      console.error('Failed to load following list:', error)
    }
  }

  // --- Theme Handler ---

  async function handleThemeChange(newTheme) {
    setTheme(newTheme)

    // Apply theme immediately
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)

    // Save to database
    try {
      await apiService.updateProfile({ theme_preference: newTheme })
      if (updateUser) {
        updateUser({ ...user, theme_preference: newTheme })
      }
      showToast(`Theme changed to ${newTheme} mode`, 'success')
    } catch (error) {
      console.error('Failed to save theme preference:', error)
      showToast('Theme changed locally (sync failed)', 'warning')
    }
  }

  // --- Per-user Notification Handler ---

  async function handleToggleUserNotifications(userId, notify) {
    setUpdatingNotifyUser(userId)
    try {
      await apiService.toggleEventNotifications(userId, notify)
      setFollowingList(prev => prev.map(f =>
        f.user_id === userId ? { ...f, notify_new_events: notify } : f
      ))
      showToast(notify ? 'Notifications enabled' : 'Notifications disabled', 'success')
    } catch (error) {
      console.error('Failed to update notification preference:', error)
      showToast('Failed to update notification preference', 'error')
    } finally {
      setUpdatingNotifyUser(null)
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

  function handleTagProfileCreated(profile) {
    setMyTagProfiles(prev => [profile, ...prev])
    showToast('Tag profile created', 'success')
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(`/profile/${user?.username}`)}>
            ← Back to Profile
          </button>
          <h1 className={styles.title}>Preferences</h1>
          <p className={styles.subtitle}>Customize your experience</p>
        </div>

        {/* Navigation */}
        <div className={styles.nav}>
          <button
            className={`${styles.navItem} ${activeSection === 'appearance' ? styles.activeNavItem : ''}`}
            onClick={() => setActiveSection('appearance')}
          >
            Appearance
          </button>
          <button
            className={`${styles.navItem} ${activeSection === 'email' ? styles.activeNavItem : ''}`}
            onClick={() => setActiveSection('email')}
          >
            Email Notifications
          </button>
          <button
            className={`${styles.navItem} ${activeSection === 'push' ? styles.activeNavItem : ''}`}
            onClick={() => setActiveSection('push')}
          >
            Push Notifications
          </button>
          <button
            className={`${styles.navItem} ${activeSection === 'tag-profiles' ? styles.activeNavItem : ''}`}
            onClick={() => setActiveSection('tag-profiles')}
          >
            Tag Profiles
          </button>
        </div>

        {/* ============ APPEARANCE SECTION ============ */}
        {activeSection === 'appearance' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Theme</h2>
            <p className={styles.sectionDescription}>
              Choose how Our Family Socials looks for you
            </p>

            <div className={styles.themeOptions}>
              <button
                className={`${styles.themeOption} ${theme === 'dark' ? styles.activeTheme : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <div className={styles.themePreview} data-theme="dark">
                  <div className={styles.previewHeader} />
                  <div className={styles.previewContent}>
                    <div className={styles.previewLine} />
                    <div className={styles.previewLine} style={{ width: '60%' }} />
                  </div>
                </div>
                <span className={styles.themeName}>Dark</span>
                {theme === 'dark' && <span className={styles.themeCheck}>✓</span>}
              </button>

              <button
                className={`${styles.themeOption} ${theme === 'light' ? styles.activeTheme : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <div className={styles.themePreview} data-theme="light">
                  <div className={styles.previewHeader} />
                  <div className={styles.previewContent}>
                    <div className={styles.previewLine} />
                    <div className={styles.previewLine} style={{ width: '60%' }} />
                  </div>
                </div>
                <span className={styles.themeName}>Light</span>
                {theme === 'light' && <span className={styles.themeCheck}>✓</span>}
              </button>
            </div>
          </div>
        )}

        {/* ============ EMAIL NOTIFICATIONS SECTION ============ */}
        {activeSection === 'email' && (
          <>
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

            {/* Activity Section */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Activity</h2>

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

              {/* New Events from Following - Expandable */}
              <div className={styles.notificationItemExpandable}>
                <div
                  className={styles.notificationItemHeader}
                  onClick={() => setFollowingExpanded(!followingExpanded)}
                >
                  <div className={styles.notificationInfo}>
                    <span className={styles.notificationIcon}>📸</span>
                    <div>
                      <h4>New Events from Following</h4>
                      <p>When someone you follow shares a new event</p>
                    </div>
                  </div>
                  <div className={styles.expandToggle}>
                    <label className={styles.switch} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={preferences.notify_new_event_from_followed}
                        onChange={() => handleToggle('notify_new_event_from_followed')}
                        disabled={!preferences.email_notifications_enabled}
                      />
                      <span className={styles.slider}></span>
                    </label>
                    <span className={`${styles.expandArrow} ${followingExpanded ? styles.expanded : ''}`}>
                      ▼
                    </span>
                  </div>
                </div>

                {followingExpanded && preferences.notify_new_event_from_followed && (
                  <div className={styles.expandedContent}>
                    {followingList.length === 0 ? (
                      <p className={styles.noFollowing}>You're not following anyone yet</p>
                    ) : (
                      <div className={styles.followingNotifyList}>
                        {followingList.map(follow => (
                          <div key={follow.user_id} className={styles.followingNotifyItem}>
                            <div className={styles.followingUser}>
                              {follow.avatar_url ? (
                                <img src={follow.avatar_url} alt="" className={styles.followingAvatar} />
                              ) : (
                                <div className={styles.followingAvatarPlaceholder}>
                                  {(follow.full_name || follow.username)?.[0]?.toUpperCase() || '?'}
                                </div>
                              )}
                              <span className={styles.followingName}>
                                {follow.full_name || follow.username}
                              </span>
                            </div>
                            <label className={styles.switch} onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={follow.notify_new_events !== false}
                                onChange={() => handleToggleUserNotifications(follow.user_id, !follow.notify_new_events)}
                                disabled={updatingNotifyUser === follow.user_id}
                              />
                              <span className={styles.slider}></span>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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

            {/* Account Section */}
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

        {/* ============ PUSH NOTIFICATIONS SECTION ============ */}
        {activeSection === 'push' && (
          <div className={styles.comingSoonSection}>
            <span className={styles.comingSoonIcon}>🔔</span>
            <h2>Push Notifications</h2>
            <p>Coming soon! We're working on push notifications to keep you updated in real-time.</p>
          </div>
        )}

        {/* ============ TAG PROFILES SECTION ============ */}
        {activeSection === 'tag-profiles' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Your Tag Profiles</h2>
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

            {tagProfilesLoading ? (
              <div className={styles.loading}>Loading...</div>
            ) : myTagProfiles.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>👤</span>
                <p>No tag profiles created yet</p>
                <p className={styles.emptySubtext}>
                  Create tag profiles for family members or pets who don't have accounts
                </p>
                <button
                  className={styles.createButtonLarge}
                  onClick={() => setShowCreateTagModal(true)}
                >
                  + Create Tag Profile
                </button>
              </div>
            ) : (
              <div className={styles.tagProfilesList}>
                {myTagProfiles.map(profile => (
                  <Link
                    key={profile.id}
                    to={`/tag-profile/${profile.id}`}
                    className={styles.tagProfileItem}
                  >
                    <div className={styles.tagProfileInfo}>
                      {profile.photo_url ? (
                        <img src={profile.photo_url} alt="" className={styles.tagProfileAvatar} />
                      ) : (
                        <div className={styles.tagProfileAvatarPlaceholder}>
                          {profile.name?.[0]?.toUpperCase() || '#'}
                        </div>
                      )}
                      <div className={styles.tagProfileDetails}>
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
        )}

        {/* Create Tag Profile Modal */}
        <CreateTagProfileModal
          isOpen={showCreateTagModal}
          onClose={() => setShowCreateTagModal(false)}
          onCreated={handleTagProfileCreated}
        />
      </div>
    </div>
  )
}
