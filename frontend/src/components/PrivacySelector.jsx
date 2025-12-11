import { useState, useEffect } from 'react'
import apiService from '../services/api'
import styles from './PrivacySelector.module.css'

/**
 * Privacy Selector Component
 *
 * Allows users to select privacy level for events:
 * - Public: Everyone can see
 * - Followers: Only followers
 * - Close Family: Only close family members
 * - Custom Group: Specific group of people
 * - Private: Only author
 */
function PrivacySelector({ value, onChange, customGroupId, onCustomGroupChange }) {
  const [customGroups, setCustomGroups] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load custom groups when user selects custom_group privacy
    if (value === 'custom_group') {
      loadCustomGroups()
    }
  }, [value])

  async function loadCustomGroups() {
    setLoading(true)
    try {
      const groups = await apiService.getCustomGroups()
      setCustomGroups(groups)
    } catch (error) {
      console.error('Failed to load custom groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const privacyOptions = [
    {
      value: 'followers',
      label: 'Followers',
      icon: '👥',
      description: 'Only your followers can see this'
    },
    {
      value: 'public',
      label: 'Public',
      icon: '🌍',
      description: 'Anyone can see this event'
    },
    {
      value: 'close_family',
      label: 'Close Family',
      icon: '❤️',
      description: 'Only close family members'
    },
    {
      value: 'custom_group',
      label: 'Custom Group',
      icon: '👨‍👩‍👧‍👦',
      description: 'Select a specific group'
    },
    {
      value: 'private',
      label: 'Private',
      icon: '🔒',
      description: 'Only you can see this'
    }
  ]

  return (
    <div className={styles.container}>
      <label className={styles.label}>Who can see this event?</label>

      <div className={styles.options}>
        {privacyOptions.map(option => (
          <button
            key={option.value}
            type="button"
            className={`${styles.option} ${value === option.value ? styles.selected : ''}`}
            onClick={() => onChange(option.value)}
          >
            <span className={styles.icon}>{option.icon}</span>
            <div className={styles.optionContent}>
              <span className={styles.optionLabel}>{option.label}</span>
              <span className={styles.optionDescription}>{option.description}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Custom Group Selector */}
      {value === 'custom_group' && (
        <div className={styles.groupSelector}>
          {loading ? (
            <p className={styles.loadingText}>Loading groups...</p>
          ) : customGroups.length === 0 ? (
            <div className={styles.noGroups}>
              <p>You haven't created any custom groups yet.</p>
              <a href="/groups/new" className={styles.createLink}>
                Create a group
              </a>
            </div>
          ) : (
            <select
              className={styles.groupSelect}
              value={customGroupId || ''}
              onChange={(e) => onCustomGroupChange(parseInt(e.target.value))}
              required
            >
              <option value="">Select a group...</option>
              {customGroups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.member_count} members)
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  )
}

export default PrivacySelector
