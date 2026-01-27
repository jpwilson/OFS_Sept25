import { useState, useEffect } from 'react'
import { useToast } from './Toast'
import apiService from '../services/api'
import InviteViewerForm from './InviteViewerForm'
import styles from './ShareEventModal.module.css'

/**
 * Share Event Modal
 *
 * Allows users to:
 * 1. Create temporary shareable links for their events
 * 2. Send events directly via email with personal message
 * 3. Manage existing share links (when isManageMode=true)
 */
function ShareEventModal({ isOpen, onClose, event, isManageMode = false }) {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('link') // 'link' or 'email'
  const [shareLink, setShareLink] = useState(null)
  const [expiresInDays, setExpiresInDays] = useState(3)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [extendDays, setExtendDays] = useState(3)
  const [extending, setExtending] = useState(false)
  const [checkingLink, setCheckingLink] = useState(false)

  // Email form state
  const [recipientEmail, setRecipientEmail] = useState('')
  const [personalMessage, setPersonalMessage] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    if (isOpen && event) {
      loadExistingShareLink()
      // Reset email form when modal opens
      setRecipientEmail('')
      setPersonalMessage('')
      setEmailSent(false)
    }
  }, [isOpen, event])

  async function loadExistingShareLink() {
    setCheckingLink(true)
    try {
      const link = await apiService.getShareLink(event.id)
      if (link) {
        setShareLink(link)
      }
    } catch (error) {
      // 404 means no active link - this is normal
      if (!error.message?.includes('404')) {
        console.error('Failed to load share link:', error)
      }
    } finally {
      setCheckingLink(false)
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

  async function handleExtendLink() {
    setExtending(true)
    try {
      const link = await apiService.updateShareLink(event.id, extendDays)
      setShareLink(link)
      showToast(`Link extended by ${extendDays} day${extendDays > 1 ? 's' : ''}`, 'success')
    } catch (error) {
      console.error('Failed to extend share link:', error)
      showToast('Failed to extend share link', 'error')
    } finally {
      setExtending(false)
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

  async function handleSendEmail(e) {
    e.preventDefault()

    if (!recipientEmail.trim()) {
      showToast('Please enter an email address', 'error')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      showToast('Please enter a valid email address', 'error')
      return
    }

    setLoading(true)
    try {
      await apiService.shareEventViaEmail(
        event.id,
        recipientEmail.trim(),
        personalMessage.trim() || null
      )
      setEmailSent(true)
      showToast(`Event shared with ${recipientEmail}!`, 'success')
    } catch (error) {
      console.error('Failed to send email:', error)
      showToast(error.message || 'Failed to send email', 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleSendAnother() {
    setRecipientEmail('')
    setPersonalMessage('')
    setEmailSent(false)
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
          <h3 className={styles.title}>{isManageMode ? 'Shared Event' : 'Share Event'}</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabNav}>
          <button
            className={`${styles.tab} ${activeTab === 'link' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('link')}
          >
            🔗 Copy Link
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'email' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('email')}
          >
            ✉️ Send Email
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'invite' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('invite')}
          >
            👤 Invite
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === 'link' ? (
            // Link Tab Content
            <>
              {checkingLink ? (
                <p className={styles.description}>Checking for existing share link...</p>
              ) : shareLink && !isExpired(shareLink.expires_at) ? (
                <div className={styles.activeLinkSection}>
                  <div className={styles.activeLinkBanner}>
                    This event has an active share link
                  </div>
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
                    {shareLink.shared_on && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Shared:</span>
                        <span className={styles.infoValue}>
                          {new Date(shareLink.shared_on).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
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

                  {/* Extend Section */}
                  <div className={styles.extendSection}>
                    <label className={styles.label}>Extend by:</label>
                    <div className={styles.extendRow}>
                      <div className={styles.daysSelector}>
                        {[1, 2, 3, 4, 5].map(days => (
                          <button
                            key={days}
                            type="button"
                            className={`${styles.dayButton} ${extendDays === days ? styles.selected : ''}`}
                            onClick={() => setExtendDays(days)}
                          >
                            {days}d
                          </button>
                        ))}
                      </div>
                      <button
                        className={styles.extendButton}
                        onClick={handleExtendLink}
                        disabled={extending}
                      >
                        {extending ? 'Extending...' : 'Extend'}
                      </button>
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
                  <p className={styles.description}>
                    Create a temporary public link to share this event. Anyone with the link can view it, even if they're not signed in.
                  </p>
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
            </>
          ) : activeTab === 'email' ? (
            // Email Tab Content
            <>
              <p className={styles.description}>
                Send this event directly to someone's inbox with a personal message. They'll receive a link that expires in 7 days.
              </p>

              {emailSent ? (
                <div className={styles.emailSentSection}>
                  <div className={styles.successIcon}>✓</div>
                  <h4>Email Sent!</h4>
                  <p>We've sent "{event?.title}" to {recipientEmail}</p>
                  <button
                    className={styles.sendAnotherButton}
                    onClick={handleSendAnother}
                  >
                    Send to Another Person
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendEmail} className={styles.emailForm}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Recipient's Email</label>
                    <input
                      type="email"
                      className={styles.emailInput}
                      placeholder="friend@example.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Personal Message <span className={styles.optional}>(optional)</span>
                    </label>
                    <textarea
                      className={styles.messageInput}
                      placeholder="Add a personal note to your invitation..."
                      value={personalMessage}
                      onChange={(e) => setPersonalMessage(e.target.value)}
                      rows={3}
                      maxLength={500}
                    />
                    <span className={styles.charCount}>{personalMessage.length}/500</span>
                  </div>

                  <button
                    type="submit"
                    className={styles.sendButton}
                    disabled={loading || !recipientEmail.trim()}
                  >
                    {loading ? 'Sending...' : 'Send Invitation'}
                  </button>

                  <p className={styles.emailNote}>
                    Email will be sent from notifications@ourfamilysocials.com
                  </p>
                </form>
              )}
            </>
          ) : (
            // Invite Tab Content
            <>
              <p className={styles.description}>
                Invite someone who isn't on Our Family Socials yet. They'll receive an email to sign up and will automatically follow you.
              </p>

              <InviteViewerForm
                onInviteSent={() => {
                  showToast('Invitation sent!', 'success')
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShareEventModal
