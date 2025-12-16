import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import apiService from '../services/api'
import styles from './Invitations.module.css'

export default function Invitations() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, pending, signed_up

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadInvitations()
  }, [user, navigate])

  async function loadInvitations() {
    setLoading(true)
    const status = filter === 'all' ? null : filter
    const data = await apiService.getInvitations(status)
    setInvitations(data.invitations || [])
    setLoading(false)
  }

  useEffect(() => {
    if (user) {
      loadInvitations()
    }
  }, [filter])

  async function handleResend(invitationId) {
    try {
      const result = await apiService.resendInvitation(invitationId)
      showToast(result.message || 'Invitation resent!', 'success')
      loadInvitations() // Refresh to update resend count
    } catch (error) {
      const detail = error.response?.data?.detail || error.message || 'Failed to resend invitation'
      showToast(detail, 'error')
    }
  }

  async function handleCancel(invitationId) {
    if (!confirm('Are you sure you want to cancel this invitation?')) return

    try {
      await apiService.cancelInvitation(invitationId)
      showToast('Invitation cancelled', 'success')
      loadInvitations()
    } catch (error) {
      showToast('Failed to cancel invitation', 'error')
    }
  }

  function formatDate(dateString) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  function formatDateTime(dateString) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  // Separate email invites from link invites
  const emailInvitations = invitations.filter(inv => inv.invited_email)
  const linkInvitation = invitations.find(inv => !inv.invited_email)

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading invitations...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <Link to={`/profile/${user?.username}`} className={styles.backLink}>
            ← Back to Profile
          </Link>
        </div>
        <h1 className={styles.title}>My Invitations</h1>
        <p className={styles.subtitle}>
          Track who you've invited to join Our Family Socials
        </p>
      </div>

      {/* Shareable Link Section */}
      {linkInvitation && (
        <div className={styles.linkSection}>
          <h2 className={styles.sectionTitle}>Your Shareable Invite Link</h2>
          <div className={styles.linkCard}>
            <div className={styles.linkInfo}>
              <span className={styles.linkIcon}>🔗</span>
              <div>
                <p className={styles.linkText}>
                  Share this link via text, WhatsApp, or any messaging app
                </p>
                <code className={styles.linkUrl}>
                  ourfamilysocials.com/join/{linkInvitation.id ? '...' : 'loading'}
                </code>
              </div>
            </div>
            <span className={`${styles.badge} ${styles.active}`}>Active</span>
          </div>
        </div>
      )}

      {/* Email Invitations Section */}
      <div className={styles.emailSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Email Invitations</h2>
          <div className={styles.filterButtons}>
            <button
              className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({invitations.length})
            </button>
            <button
              className={`${styles.filterBtn} ${filter === 'pending' ? styles.active : ''}`}
              onClick={() => setFilter('pending')}
            >
              Pending
            </button>
            <button
              className={`${styles.filterBtn} ${filter === 'signed_up' ? styles.active : ''}`}
              onClick={() => setFilter('signed_up')}
            >
              Signed Up
            </button>
          </div>
        </div>

        {emailInvitations.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📧</span>
            <p>No email invitations yet</p>
            <p className={styles.emptyHint}>
              Use the Invite button on your profile to send email invitations
            </p>
          </div>
        ) : (
          <div className={styles.invitationsList}>
            {emailInvitations.map(invitation => (
              <div key={invitation.id} className={styles.invitationCard}>
                <div className={styles.invitationMain}>
                  <div className={styles.invitationAvatar}>
                    {invitation.resulting_user?.avatar_url ? (
                      <img
                        src={invitation.resulting_user.avatar_url}
                        alt=""
                        className={styles.avatarImage}
                      />
                    ) : (
                      <span className={styles.avatarPlaceholder}>
                        {(invitation.invited_name || invitation.invited_email || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className={styles.invitationDetails}>
                    <div className={styles.invitationName}>
                      {invitation.resulting_user ? (
                        <Link
                          to={`/profile/${invitation.resulting_user.username}`}
                          className={styles.userLink}
                        >
                          {invitation.resulting_user.display_name || invitation.resulting_user.username}
                        </Link>
                      ) : (
                        invitation.invited_name || 'No name provided'
                      )}
                    </div>
                    <div className={styles.invitationEmail}>
                      {invitation.invited_email}
                    </div>
                    <div className={styles.invitationMeta}>
                      <span>Sent {formatDate(invitation.created_at)}</span>
                      {invitation.signed_up_at && (
                        <>
                          <span className={styles.separator}>•</span>
                          <span className={styles.signedUpText}>
                            Joined {formatDate(invitation.signed_up_at)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.invitationActions}>
                  <span
                    className={`${styles.statusBadge} ${
                      invitation.status === 'signed_up' ? styles.signedUp : styles.pending
                    }`}
                  >
                    {invitation.status === 'signed_up' ? 'Joined' : 'Pending'}
                  </span>

                  {invitation.status === 'pending' && (
                    <div className={styles.actionButtons}>
                      {invitation.resends_remaining > 0 ? (
                        <button
                          className={styles.resendBtn}
                          onClick={() => handleResend(invitation.id)}
                          title={`Resend invitation (${invitation.resends_remaining} remaining)`}
                        >
                          Resend ({invitation.resends_remaining})
                        </button>
                      ) : (
                        <span className={styles.noResendsLeft} title="Maximum resends reached">
                          No resends left
                        </span>
                      )}
                      <button
                        className={styles.cancelBtn}
                        onClick={() => handleCancel(invitation.id)}
                        title="Cancel invitation"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {invitation.resulting_user && (
                    <Link
                      to={`/profile/${invitation.resulting_user.username}`}
                      className={styles.viewProfileBtn}
                    >
                      View Profile
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
