import { useState } from 'react'
import { useToast } from './Toast'
import apiService from '../services/api'
import styles from './InviteViewerForm.module.css'

export default function InviteViewerForm({ onInviteSent, onClose }) {
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailStatus, setEmailStatus] = useState(null)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)

  // Check email when user finishes typing
  async function handleEmailBlur() {
    if (!email || !email.includes('@')) return

    setIsCheckingEmail(true)
    try {
      const status = await apiService.checkInvitationEmail(email)
      setEmailStatus(status)
    } catch (error) {
      console.error('Error checking email:', error)
    } finally {
      setIsCheckingEmail(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!email) {
      showToast('Please enter an email address', 'error')
      return
    }

    // Warn if already invited
    if (emailStatus?.already_invited_by_me) {
      showToast('You\'ve already invited this person. Use "Resend" from your Invited list.', 'warning')
      return
    }

    // Warn if exists as user
    if (emailStatus?.exists_as_user) {
      showToast(`This person already has an account (@${emailStatus.existing_user_username}). Send them a follow request instead.`, 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      await apiService.createInvitation(email, name || null, message || null)
      showToast(`Invitation sent to ${name || email}!`, 'success')

      // Clear form
      setEmail('')
      setName('')
      setMessage('')
      setEmailStatus(null)

      if (onInviteSent) {
        onInviteSent()
      }
    } catch (error) {
      console.error('Error sending invitation:', error)

      // Handle specific error codes
      if (error?.detail?.code === 'USER_EXISTS') {
        showToast(`This person already has an account (@${error.detail.username})`, 'error')
      } else if (error?.detail?.code === 'ALREADY_INVITED') {
        showToast('You\'ve already invited this person', 'error')
      } else {
        showToast(error.message || 'Failed to send invitation', 'error')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.description}>
        <p>Invite family or friends who aren't on Our Family Socials yet. They'll get an email to sign up and will automatically follow you.</p>
      </div>

      <div className={styles.field}>
        <label htmlFor="invite-email">Email address *</label>
        <input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setEmailStatus(null)
          }}
          onBlur={handleEmailBlur}
          placeholder="grandma@email.com"
          required
        />
        {isCheckingEmail && (
          <span className={styles.checking}>Checking...</span>
        )}
        {emailStatus?.exists_as_user && (
          <span className={styles.warning}>
            This person already has an account (@{emailStatus.existing_user_username})
          </span>
        )}
        {emailStatus?.already_invited_by_me && (
          <span className={styles.warning}>
            You've already invited this person
          </span>
        )}
        {emailStatus?.invited_by_others?.length > 0 && (
          <span className={styles.info}>
            Also invited by: {emailStatus.invited_by_others.join(', ')}
          </span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="invite-name">Their name (optional)</label>
        <input
          id="invite-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Grandma Sue"
        />
        <span className={styles.hint}>Helps personalize the invitation email</span>
      </div>

      <div className={styles.field}>
        <label htmlFor="invite-message">Personal message (optional)</label>
        <textarea
          id="invite-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hi! I'd love to share our family photos with you..."
          rows={3}
          maxLength={500}
        />
        <span className={styles.hint}>{message.length}/500</span>
      </div>

      <div className={styles.actions}>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={styles.cancelButton}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !email || emailStatus?.exists_as_user || emailStatus?.already_invited_by_me}
          className={styles.submitButton}
        >
          {isSubmitting ? 'Sending...' : 'Send Invitation'}
        </button>
      </div>
    </form>
  )
}
