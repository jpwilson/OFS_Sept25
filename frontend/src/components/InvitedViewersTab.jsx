import { useState, useEffect } from 'react'
import { useToast } from './Toast'
import apiService from '../services/api'
import styles from './InvitedViewersTab.module.css'

export default function InvitedViewersTab() {
  const { showToast } = useToast()
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    loadInvitations()
  }, [])

  async function loadInvitations() {
    try {
      const data = await apiService.getInvitations()
      setInvitations(data)
    } catch (error) {
      console.error('Failed to load invitations:', error)
      showToast('Failed to load invitations', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend(invitation) {
    setActionLoading(invitation.id)
    try {
      await apiService.resendInvitation(invitation.id)
      showToast(`Invitation resent to ${invitation.invited_name || invitation.invited_email}`, 'success')
    } catch (error) {
      console.error('Failed to resend invitation:', error)
      showToast('Failed to resend invitation', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCancel(invitation) {
    if (!confirm(`Remove invitation for ${invitation.invited_name || invitation.invited_email}?`)) {
      return
    }

    setActionLoading(invitation.id)
    try {
      await apiService.cancelInvitation(invitation.id)
      setInvitations(invitations.filter(inv => inv.id !== invitation.id))
      showToast('Invitation removed', 'success')
    } catch (error) {
      console.error('Failed to cancel invitation:', error)
      showToast('Failed to remove invitation', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        Loading invitations...
      </div>
    )
  }

  if (invitations.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>👥</div>
        <h3>No invitations sent yet</h3>
        <p>Invite family and friends who aren't on Our Family Socials yet. They'll automatically follow you when they sign up.</p>
        <p className={styles.tip}>You can invite people from the Create Event page or when sharing an event.</p>
      </div>
    )
  }

  const pending = invitations.filter(inv => inv.status === 'pending')
  const signedUp = invitations.filter(inv => inv.status === 'signed_up')

  return (
    <div className={styles.container}>
      {pending.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Pending Invitations ({pending.length})
          </h3>
          <div className={styles.list}>
            {pending.map(invitation => (
              <div key={invitation.id} className={styles.card}>
                <div className={styles.cardInfo}>
                  <div className={styles.name}>
                    {invitation.invited_name || 'No name'}
                  </div>
                  <div className={styles.email}>
                    {invitation.invited_email}
                  </div>
                  <div className={styles.date}>
                    Invited {formatDate(invitation.created_at)}
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className={styles.resendButton}
                    onClick={() => handleResend(invitation)}
                    disabled={actionLoading === invitation.id}
                  >
                    {actionLoading === invitation.id ? '...' : 'Resend'}
                  </button>
                  <button
                    className={styles.removeButton}
                    onClick={() => handleCancel(invitation)}
                    disabled={actionLoading === invitation.id}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {signedUp.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Signed Up ({signedUp.length})
          </h3>
          <div className={styles.list}>
            {signedUp.map(invitation => (
              <div key={invitation.id} className={`${styles.card} ${styles.signedUp}`}>
                <div className={styles.cardInfo}>
                  <div className={styles.name}>
                    {invitation.invited_name || 'No name'}
                    <span className={styles.badge}>Signed Up</span>
                  </div>
                  <div className={styles.email}>
                    {invitation.invited_email}
                  </div>
                  {invitation.signed_up_at && (
                    <div className={styles.date}>
                      Joined {formatDate(invitation.signed_up_at)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
