import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import api from '../services/api'
import FeedView from '../components/FeedView'
import styles from './TagProfilePage.module.css'

function TagProfilePage() {
  const { profileId } = useParams()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [claimMessage, setClaimMessage] = useState('')
  const [claimSubmitting, setClaimSubmitting] = useState(false)
  const [existingClaim, setExistingClaim] = useState(null)

  useEffect(() => {
    loadProfile()
    loadEvents()
    if (user) {
      checkExistingClaim()
    }
  }, [profileId, user])

  async function loadProfile() {
    try {
      const data = await api.getTagProfile(profileId)
      if (!data) {
        setError('Tag profile not found')
      } else {
        setProfile(data)
      }
    } catch (err) {
      setError('Failed to load profile')
    }
  }

  async function loadEvents() {
    try {
      const data = await api.getTagProfileEvents(profileId)
      setEvents(data)
    } catch (err) {
      console.error('Failed to load events:', err)
    } finally {
      setLoading(false)
    }
  }

  async function checkExistingClaim() {
    try {
      const claims = await api.getSentTagProfileClaims()
      const myClaim = claims.find(c => c.tag_profile_id === parseInt(profileId))
      setExistingClaim(myClaim || null)
    } catch (err) {
      console.error('Failed to check existing claims:', err)
    }
  }

  async function handleSubmitClaim() {
    if (claimSubmitting) return
    setClaimSubmitting(true)
    try {
      const claim = await api.claimTagProfile(profileId, claimMessage || null)
      setExistingClaim(claim)
      setShowClaimModal(false)
      setClaimMessage('')
      showToast('Claim request sent!', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to submit claim', 'error')
    } finally {
      setClaimSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Profile Not Found</h2>
          <p>{error || 'This tag profile does not exist.'}</p>
          <Link to="/" className={styles.homeLink}>Back to Feed</Link>
        </div>
      </div>
    )
  }

  const isOwner = user && user.id === profile.created_by_id
  const canClaim = user && !isOwner && !profile.is_merged

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.avatarSection}>
          {profile.photo_url ? (
            <img
              src={profile.photo_url}
              alt={profile.name}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              #
            </div>
          )}
        </div>

        <div className={styles.info}>
          <h1 className={styles.name}>{profile.name}</h1>

          {profile.relationship_to_creator && profile.created_by_username && (
            <p className={styles.relationship}>
              <Link to={`/profile/${profile.created_by_username}`}>
                {profile.created_by_display_name || profile.created_by_username}
              </Link>
              's {profile.relationship_to_creator}
            </p>
          )}

          <p className={styles.taggedCount}>
            Tagged in {events.length} event{events.length !== 1 ? 's' : ''}
          </p>

          {isOwner && (
            <p className={styles.ownerNote}>
              You created this tag profile
            </p>
          )}

          {/* Claim button for logged-in users who aren't the owner */}
          {canClaim && (
            <div className={styles.claimSection}>
              {existingClaim ? (
                <div className={styles.claimStatus}>
                  <span className={`${styles.claimBadge} ${styles[existingClaim.status]}`}>
                    Claim {existingClaim.status}
                  </span>
                </div>
              ) : (
                <button
                  className={styles.claimButton}
                  onClick={() => setShowClaimModal(true)}
                >
                  This is me
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.eventsSection}>
        <h2 className={styles.sectionTitle}>Events</h2>

        {events.length === 0 ? (
          <p className={styles.noEvents}>
            {profile.name} hasn't been tagged in any events yet.
          </p>
        ) : (
          <FeedView events={events} />
        )}
      </div>

      {/* Claim Modal */}
      {showClaimModal && (
        <div className={styles.modalOverlay} onClick={() => setShowClaimModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Claim This Profile</h2>
            <p className={styles.modalDescription}>
              If this tag profile represents you, you can request to claim it.
              Once approved by {profile.created_by_display_name || profile.created_by_username},
              all events tagged with this profile will be linked to your account.
            </p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Message (optional)</label>
              <textarea
                className={styles.textarea}
                placeholder="Explain why you're claiming this profile..."
                value={claimMessage}
                onChange={e => setClaimMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowClaimModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.submitButton}
                onClick={handleSubmitClaim}
                disabled={claimSubmitting}
              >
                {claimSubmitting ? 'Sending...' : 'Send Claim Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TagProfilePage
