import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import api from '../services/api'
import FeedView from '../components/FeedView'
import styles from './TagProfilePage.module.css'

const RELATIONSHIP_OPTIONS = [
  'wife', 'husband', 'daughter', 'son', 'mother', 'father',
  'sister', 'brother', 'grandmother', 'grandfather',
  'granddaughter', 'grandson', 'aunt', 'uncle', 'niece', 'nephew',
  'cousin', 'mother-in-law', 'father-in-law', 'daughter-in-law',
  'son-in-law', 'sister-in-law', 'brother-in-law',
  'stepmother', 'stepfather', 'stepdaughter', 'stepson',
  'friend', 'pet', 'pet owner', 'other'
]

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

  // Edit state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editRelationship, setEditRelationship] = useState('')
  const [editPhotoUrl, setEditPhotoUrl] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef(null)

  // Add relationship state (for owner)
  const [showAddRelModal, setShowAddRelModal] = useState(false)
  const [addRelUserId, setAddRelUserId] = useState('')
  const [addRelType, setAddRelType] = useState('')
  const [addRelSubmitting, setAddRelSubmitting] = useState(false)
  const [followingUsers, setFollowingUsers] = useState([])

  // Request relationship state (for non-owners)
  const [showRequestRelModal, setShowRequestRelModal] = useState(false)
  const [requestRelType, setRequestRelType] = useState('')
  const [requestRelMessage, setRequestRelMessage] = useState('')
  const [requestRelSubmitting, setRequestRelSubmitting] = useState(false)
  const [existingRelRequest, setExistingRelRequest] = useState(null)

  useEffect(() => {
    loadProfile()
    loadEvents()
    if (user) {
      checkExistingClaim()
      checkExistingRelRequest()
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

  async function checkExistingRelRequest() {
    try {
      const requests = await api.getSentTagProfileRelationshipRequests()
      const myRequest = requests.find(r => r.tag_profile_id === parseInt(profileId) && r.status === 'pending')
      setExistingRelRequest(myRequest || null)
    } catch (err) {
      console.error('Failed to check existing relationship requests:', err)
    }
  }

  async function loadFollowingUsers() {
    try {
      const following = await api.getFollowing(user.id)
      setFollowingUsers(following)
    } catch (err) {
      console.error('Failed to load following users:', err)
    }
  }

  async function handleAddRelationship() {
    if (addRelSubmitting || !addRelUserId || !addRelType) return
    setAddRelSubmitting(true)
    try {
      const result = await api.addTagProfileRelationship(profileId, parseInt(addRelUserId), addRelType)
      await loadProfile()
      setShowAddRelModal(false)
      setAddRelUserId('')
      setAddRelType('')
      // Check if it was a direct add (id > 0) or a request (id = 0, pending approval)
      if (result.id === 0 || result.relationship_type?.includes('pending')) {
        showToast('Relationship request sent for approval!', 'success')
      } else {
        showToast('Relationship added!', 'success')
      }
    } catch (err) {
      showToast(err.message || 'Failed to add relationship', 'error')
    } finally {
      setAddRelSubmitting(false)
    }
  }

  async function handleRemoveRelationship(relationshipId) {
    if (!window.confirm('Remove this relationship?')) return
    try {
      await api.removeTagProfileRelationship(profileId, relationshipId)
      await loadProfile()
      showToast('Relationship removed', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to remove relationship', 'error')
    }
  }

  async function handleRequestRelationship() {
    if (requestRelSubmitting || !requestRelType) return
    setRequestRelSubmitting(true)
    try {
      const request = await api.requestTagProfileRelationship(profileId, requestRelType, requestRelMessage || null)
      setExistingRelRequest(request)
      setShowRequestRelModal(false)
      setRequestRelType('')
      setRequestRelMessage('')
      showToast('Relationship request sent!', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to send request', 'error')
    } finally {
      setRequestRelSubmitting(false)
    }
  }

  function openAddRelModal() {
    loadFollowingUsers()
    setShowAddRelModal(true)
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

  function openEditModal() {
    setEditName(profile.name || '')
    setEditRelationship(profile.relationship_to_creator || '')
    setEditPhotoUrl(profile.photo_url || '')
    setShowEditModal(true)
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingPhoto(true)
    try {
      const url = await api.uploadImage(file)
      setEditPhotoUrl(url)
      showToast('Photo uploaded', 'success')
    } catch (err) {
      showToast('Failed to upload photo', 'error')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleSaveEdit() {
    if (editSubmitting) return
    setEditSubmitting(true)
    try {
      const updated = await api.updateTagProfile(profileId, {
        name: editName,
        relationship_to_creator: editRelationship || null,
        photo_url: editPhotoUrl || null
      })
      setProfile(updated)
      setShowEditModal(false)
      showToast('Profile updated', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error')
    } finally {
      setEditSubmitting(false)
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

  // Can this user request to add a relationship to this tag profile?
  // They can if: logged in, not the owner, profile not merged, and don't already have a relationship
  const hasExistingRelationship = profile.relationships?.some(r => r.user_id === user?.id) || false
  const canRequestRelationship = user && !isOwner && !profile.is_merged && !hasExistingRelationship

  // Check if user's name matches the tag profile name (first and last name)
  // This determines if they should see the "This is me" button
  const checkNameMatch = () => {
    if (!user || !profile) return false

    // Get user's first and last name from their full_name or display_name
    const userFullName = (user.full_name || user.display_name || '').toLowerCase().trim()
    const profileName = (profile.name || '').toLowerCase().trim()

    if (!userFullName || !profileName) return false

    // Split names into parts
    const userParts = userFullName.split(/\s+/)
    const profileParts = profileName.split(/\s+/)

    // Need at least first and last name
    if (userParts.length < 2 || profileParts.length < 2) return false

    // Compare first name
    const userFirstName = userParts[0]
    const profileFirstName = profileParts[0]

    // Compare last name (last word in each)
    const userLastName = userParts[userParts.length - 1]
    const profileLastName = profileParts[profileParts.length - 1]

    return userFirstName === profileFirstName && userLastName === profileLastName
  }

  const nameMatches = checkNameMatch()
  const canClaim = user && !isOwner && !profile.is_merged && nameMatches

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

          {/* Display all relationships */}
          {profile.relationships && profile.relationships.length > 0 && (
            <div className={styles.relationshipsSection}>
              {profile.relationships.map(rel => (
                <div key={rel.id} className={styles.relationshipItem}>
                  <Link to={`/profile/${rel.username}`}>
                    {rel.display_name || rel.username}
                  </Link>
                  's {rel.relationship_type}
                  {isOwner && (
                    <button
                      className={styles.removeRelButton}
                      onClick={() => handleRemoveRelationship(rel.id)}
                      title="Remove relationship"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Legacy fallback for relationship_to_creator if no relationships array */}
          {(!profile.relationships || profile.relationships.length === 0) &&
           profile.relationship_to_creator && profile.created_by_username && (
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
            <div className={styles.ownerSection}>
              <p className={styles.ownerNote}>
                You created this tag profile
              </p>
              <div className={styles.ownerActions}>
                <button className={styles.editButton} onClick={openEditModal}>
                  Edit Profile
                </button>
                <button className={styles.addRelButton} onClick={openAddRelModal}>
                  Add Relationship
                </button>
              </div>
            </div>
          )}

          {/* Request relationship button for non-owners who don't already have a relationship */}
          {canRequestRelationship && (
            <div className={styles.requestRelSection}>
              {existingRelRequest ? (
                <div className={styles.requestStatus}>
                  <span className={`${styles.requestBadge} ${styles.pending}`}>
                    Relationship request pending
                  </span>
                </div>
              ) : (
                <button
                  className={styles.requestRelButton}
                  onClick={() => setShowRequestRelModal(true)}
                >
                  Add My Relationship
                </button>
              )}
            </div>
          )}

          {/* Show current user's relationship if they have one */}
          {hasExistingRelationship && !isOwner && (
            <div className={styles.myRelSection}>
              <span className={styles.myRelBadge}>
                Your {profile.relationships?.find(r => r.user_id === user?.id)?.relationship_type}
              </span>
            </div>
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

      {/* Edit Modal */}
      {showEditModal && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Edit Tag Profile</h2>

            <div className={styles.editPhotoSection}>
              <div className={styles.editPhotoPreview}>
                {editPhotoUrl ? (
                  <img src={editPhotoUrl} alt="Preview" className={styles.editPhoto} />
                ) : (
                  <div className={styles.editPhotoPlaceholder}>#</div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className={styles.uploadButton}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
              </button>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Name</label>
              <input
                type="text"
                className={styles.input}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Enter name"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Relationship to you</label>
              <select
                className={styles.select}
                value={editRelationship}
                onChange={e => setEditRelationship(e.target.value)}
              >
                <option value="">Select relationship</option>
                {RELATIONSHIP_OPTIONS.map(rel => (
                  <option key={rel} value={rel}>
                    {rel.charAt(0).toUpperCase() + rel.slice(1).replace(/-/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.submitButton}
                onClick={handleSaveEdit}
                disabled={editSubmitting || !editName.trim()}
              >
                {editSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Relationship Modal (for owner) */}
      {showAddRelModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddRelModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Add Relationship</h2>
            <p className={styles.modalDescription}>
              Add a relationship between {profile.name} and another person.
            </p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Person</label>
              <select
                className={styles.select}
                value={addRelUserId}
                onChange={e => setAddRelUserId(e.target.value)}
              >
                <option value="">Select a person</option>
                {followingUsers
                  .filter(u => !profile.relationships?.some(r => r.user_id === u.id))
                  .map(u => (
                    <option key={u.id} value={u.id}>
                      {u.display_name || u.full_name || u.username}
                    </option>
                  ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Relationship</label>
              <select
                className={styles.select}
                value={addRelType}
                onChange={e => setAddRelType(e.target.value)}
              >
                <option value="">Select relationship</option>
                {RELATIONSHIP_OPTIONS.map(rel => (
                  <option key={rel} value={rel}>
                    {rel.charAt(0).toUpperCase() + rel.slice(1).replace(/-/g, ' ')}
                  </option>
                ))}
              </select>
              <p className={styles.fieldHint}>
                "{profile.name} is [person]'s {addRelType || '...'}"
              </p>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowAddRelModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.submitButton}
                onClick={handleAddRelationship}
                disabled={addRelSubmitting || !addRelUserId || !addRelType}
              >
                {addRelSubmitting ? 'Adding...' : 'Add Relationship'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Relationship Modal (for non-owners) */}
      {showRequestRelModal && (
        <div className={styles.modalOverlay} onClick={() => setShowRequestRelModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Request Relationship</h2>
            <p className={styles.modalDescription}>
              Request to add your relationship to {profile.name}.
              The profile creator will need to approve this.
            </p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Your relationship to {profile.name}</label>
              <select
                className={styles.select}
                value={requestRelType}
                onChange={e => setRequestRelType(e.target.value)}
              >
                <option value="">Select relationship</option>
                {RELATIONSHIP_OPTIONS.map(rel => (
                  <option key={rel} value={rel}>
                    {rel.charAt(0).toUpperCase() + rel.slice(1).replace(/-/g, ' ')}
                  </option>
                ))}
              </select>
              <p className={styles.fieldHint}>
                "{profile.name} is my {requestRelType || '...'}"
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Message (optional)</label>
              <textarea
                className={styles.textarea}
                placeholder="Add a note to the profile creator..."
                value={requestRelMessage}
                onChange={e => setRequestRelMessage(e.target.value)}
                rows={2}
              />
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowRequestRelModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.submitButton}
                onClick={handleRequestRelationship}
                disabled={requestRelSubmitting || !requestRelType}
              >
                {requestRelSubmitting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TagProfilePage
