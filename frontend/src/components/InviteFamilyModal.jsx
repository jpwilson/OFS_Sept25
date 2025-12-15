import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import apiService from '../services/api'
import styles from './InviteFamilyModal.module.css'

export default function InviteFamilyModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('link') // 'link' or 'email'
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  if (!isOpen) return null

  const displayName = user?.display_name || user?.full_name || user?.username
  const profileUrl = `https://www.ourfamilysocials.com/profile/${user?.username}`

  const inviteMessage = `Hi! I'd love for you to join me on Our Family Socials - it's a private space where I share family memories, photos, and life events with the people I care about.

Click this link to sign up and see my family moments:
${profileUrl}

Looking forward to sharing our memories together!
- ${displayName}`

  const copyInviteMessage = () => {
    navigator.clipboard.writeText(inviteMessage)
      .then(() => showToast('Invite message copied!', 'success'))
      .catch(() => showToast('Failed to copy', 'error'))
  }

  const copyProfileLink = () => {
    navigator.clipboard.writeText(profileUrl)
      .then(() => showToast('Profile link copied!', 'success'))
      .catch(() => showToast('Failed to copy', 'error'))
  }

  const handleSendEmail = async (e) => {
    e.preventDefault()
    if (!email) {
      showToast('Please enter an email address', 'error')
      return
    }

    setSending(true)
    try {
      await apiService.createInvitation(
        email,
        name || null,
        message || null
      )
      showToast(`Invitation sent to ${email}!`, 'success')
      setEmail('')
      setName('')
      setMessage('')
      onClose()
    } catch (error) {
      const detail = error.response?.data?.detail
      if (detail?.code === 'USER_EXISTS') {
        showToast(`${email} already has an account (@${detail.username})`, 'info')
      } else if (detail?.code === 'ALREADY_INVITED') {
        showToast('You\'ve already invited this person', 'info')
      } else {
        showToast(error.message || 'Failed to send invitation', 'error')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>x</button>

        <div className={styles.header}>
          <h2>Invite Family & Friends</h2>
          <p>Share your family moments with the people you love</p>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'link' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('link')}
          >
            Copy Invite
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'email' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('email')}
          >
            Send Email
          </button>
        </div>

        {activeTab === 'link' && (
          <div className={styles.linkSection}>
            <p className={styles.instructions}>
              Copy this message and share it via text, WhatsApp, or any messaging app:
            </p>

            <div className={styles.messagePreview}>
              <pre>{inviteMessage}</pre>
            </div>

            <div className={styles.buttonRow}>
              <button className={styles.primaryButton} onClick={copyInviteMessage}>
                Copy Full Message
              </button>
              <button className={styles.secondaryButton} onClick={copyProfileLink}>
                Copy Link Only
              </button>
            </div>

            <div className={styles.howItWorks}>
              <h4>How it works:</h4>
              <ol>
                <li>They click your link and sign up</li>
                <li>You both automatically follow each other</li>
                <li>They see all your events in their feed</li>
              </ol>
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <form className={styles.emailSection} onSubmit={handleSendEmail}>
            <p className={styles.instructions}>
              We'll send them a personalized invitation email with your profile link.
            </p>

            <div className={styles.formGroup}>
              <label htmlFor="invite-email">Their Email *</label>
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="family@example.com"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="invite-name">Their Name (optional)</label>
              <input
                id="invite-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mom, Dad, Grandma..."
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="invite-message">Personal Message (optional)</label>
              <textarea
                id="invite-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal note..."
                rows={3}
              />
            </div>

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={sending}
            >
              {sending ? 'Sending...' : 'Send Invitation'}
            </button>

            <div className={styles.howItWorks}>
              <h4>What happens next:</h4>
              <ol>
                <li>They receive your invitation email</li>
                <li>They click the link and create an account</li>
                <li>You both automatically follow each other</li>
              </ol>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
