import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import apiService from '../services/api'
import styles from './NotificationSettings.module.css'

export default function NotificationSettings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState({
    email_notifications_enabled: true,
    notify_new_follower: true,
    notify_new_comment: true,
    notify_trial_reminder: true,
    notify_event_shared: true
  })

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadPreferences()
  }, [user])

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
      notify_event_shared: true
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
      notify_event_shared: false
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
                     preferences.notify_event_shared

  const allDisabled = !preferences.notify_new_follower &&
                      !preferences.notify_new_comment &&
                      !preferences.notify_trial_reminder &&
                      !preferences.notify_event_shared

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1 className={styles.title}>Notification Settings</h1>
        </div>

        {/* Tabs */}
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
      </div>
    </div>
  )
}
