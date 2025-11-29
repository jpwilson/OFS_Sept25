import { useState, useEffect } from 'react'
import { useToast } from './Toast'
import apiService from '../services/api'
import styles from './ShareEventModal.module.css'

/**
 * Share Event Modal
 *
 * Allows users to create temporary shareable links for their events
 * Links expire after 1-5 days and show banners to encourage signup/follow
 */
function ShareEventModal({ isOpen, onClose, event }) {
  const { showToast } = useToast()
  const [shareLink, setShareLink] = useState(null)
  const [expiresInDays, setExpiresInDays] = useState(3) // Default 3 days
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen && event) {
      loadExistingShareLink()
    }
  }, [isOpen, event])

  async function loadExistingShareLink() {
    try {
      const link = await apiService.getShareLink(event.id)
      if (link) {
        setShareLink(link)
      }
    } catch (error) {
      console.error('Failed to load share link:', error)
    }
  }

  async function handleCreateLink() {
    setLoading(true)
    try {
      const link = await apiService.createShareLink(event.id, expiresInDays)
      setShareLink(link)
      showToast(`Share link created (expires in ${expiresInDays} days)`, 'success')
    } catch (error) {
      console.error('Failed to create share link:', error)
      showToast(error.message || 'Failed to create share link', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteLink() {
    setLoading(true)
    try {
      await apiService.deleteShareLink(event.id)
      setShareLink(null)
      showToast('Share link disabled', 'success')
    } catch (error) {
      console.error('Failed to delete share link:', error)
      showToast('Failed to disable share link', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyLink() {
    if (!shareLink) return

    const fullUrl = `${window.location.origin}${shareLink.share_url}`
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      showToast('Link copied to clipboard!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
      showToast('Failed to copy link', 'error')
    }
  }

  function formatExpiryDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  function isExpired(dateString) {
    return new Date(dateString) < new Date()
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Share Event</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.description}>
            Create a temporary public link to share this event. Anyone with the link can view it, even if they're not signed in.
          </p>

          {shareLink && !isExpired(shareLink.expires_at) ? (
            <div className={styles.activeLinkSection}>
              <div className={styles.linkBox}>
                <input
                  type="text"
                  className={styles.linkInput}
                  value={`${window.location.origin}${shareLink.share_url}`}
                  readOnly
                  onClick={(e) => e.target.select()}
                />
                <button
                  className={`${styles.copyButton} ${copied ? styles.copied : ''}`}
                  onClick={handleCopyLink}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              <div className={styles.linkInfo}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Expires:</span>
                  <span className={styles.infoValue}>
                    {formatExpiryDate(shareLink.expires_at)}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Views:</span>
                  <span className={styles.infoValue}>{shareLink.view_count}</span>
                </div>
              </div>

              <button
                className={styles.disableButton}
                onClick={handleDeleteLink}
                disabled={loading}
              >
                {loading ? 'Disabling...' : 'Disable Share Link'}
              </button>
            </div>
          ) : (
            <div className={styles.createLinkSection}>
              <label className={styles.label}>Link expires in:</label>
              <div className={styles.daysSelector}>
                {[1, 2, 3, 4, 5].map(days => (
                  <button
                    key={days}
                    type="button"
                    className={`${styles.dayButton} ${expiresInDays === days ? styles.selected : ''}`}
                    onClick={() => setExpiresInDays(days)}
                  >
                    {days} {days === 1 ? 'day' : 'days'}
                  </button>
                ))}
              </div>

              <button
                className={styles.createButton}
                onClick={handleCreateLink}
                disabled={loading}
              >
                {loading ? 'Creating Link...' : 'Create Share Link'}
              </button>

              <div className={styles.helpText}>
                <p>💡 <strong>What viewers will see:</strong></p>
                <ul>
                  <li>Not logged in → Encouraged to sign up</li>
                  <li>Logged in but not following → Encouraged to follow you</li>
                  <li>Already following → They can already see your events</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShareEventModal
