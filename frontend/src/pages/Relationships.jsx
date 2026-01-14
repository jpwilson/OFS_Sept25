import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import apiService from '../services/api'
import styles from './Relationships.module.css'

export default function Relationships() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [acceptedRelationships, setAcceptedRelationships] = useState([])
  const [relationshipRequestsToYou, setRelationshipRequestsToYou] = useState([])
  const [relationshipRequestsByYou, setRelationshipRequestsByYou] = useState([])
  const [processingRelationship, setProcessingRelationship] = useState(null)
  const [showArchive, setShowArchive] = useState(false)

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadRelationshipData()
  }, [user])

  async function loadRelationshipData() {
    setLoading(true)
    try {
      const [toYou, byYou, accepted] = await Promise.all([
        apiService.getPendingRelationshipRequests(),
        apiService.getSentRelationshipRequests(),
        apiService.getRelationships()
      ])
      setRelationshipRequestsToYou(toYou || [])
      setRelationshipRequestsByYou(byYou || [])
      setAcceptedRelationships(accepted || [])
    } catch (error) {
      console.error('Failed to load relationship data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteRelationship(relationshipId, relationshipName) {
    if (!window.confirm(`Remove ${relationshipName} from your verified relationships?`)) {
      return
    }

    setProcessingRelationship(relationshipId)
    try {
      await apiService.deleteRelationship(relationshipId)
      setAcceptedRelationships(prev => prev.filter(r => r.id !== relationshipId))
      setRelationshipRequestsByYou(prev => prev.filter(r => r.id !== relationshipId))
      showToast('Relationship removed', 'success')
    } catch (error) {
      showToast('Failed to remove relationship', 'error')
    } finally {
      setProcessingRelationship(null)
    }
  }

  // Helper to capitalize relationship type
  function capitalizeRelationship(rel) {
    if (!rel) return ''
    return rel.charAt(0).toUpperCase() + rel.slice(1)
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(`/profile/${user?.username}`)}>
            ← Back to Profile
          </button>
          <h1 className={styles.title}>Relationships</h1>
          <p className={styles.subtitle}>Your verified family and friend connections</p>
        </div>

        {/* Verified Relationships */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Verified Relationships</h2>
            <span className={styles.count}>{acceptedRelationships.length}</span>
          </div>

          {acceptedRelationships.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>👨‍👩‍👧‍👦</span>
              <p>No verified relationships yet</p>
              <p className={styles.emptySubtext}>
                Follow someone and have them follow you back to propose a relationship
              </p>
            </div>
          ) : (
            <div className={styles.relationshipsList}>
              {acceptedRelationships.map(relationship => (
                <div key={relationship.id} className={styles.relationshipItem}>
                  <Link to={`/profile/${relationship.other_user_username}`} className={styles.relationshipInfo}>
                    {relationship.other_user_avatar_url ? (
                      <img src={relationship.other_user_avatar_url} alt="" className={styles.avatar} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {relationship.other_user_username?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className={styles.relationshipDetails}>
                      <strong>{relationship.other_user_display_name || relationship.other_user_username}</strong>
                      <p>Your <span className={styles.relationType}>{capitalizeRelationship(relationship.my_relationship_to_them)}</span></p>
                    </div>
                  </Link>
                  <button
                    className={styles.removeButton}
                    onClick={() => handleDeleteRelationship(
                      relationship.id,
                      relationship.other_user_display_name || relationship.other_user_username
                    )}
                    disabled={processingRelationship === relationship.id}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Archive Toggle */}
        {(relationshipRequestsToYou.length > 0 || relationshipRequestsByYou.length > 0) && (
          <button
            className={styles.archiveToggle}
            onClick={() => setShowArchive(!showArchive)}
          >
            {showArchive ? '▼' : '▶'} Request History ({relationshipRequestsToYou.length + relationshipRequestsByYou.length})
          </button>
        )}

        {/* Request Archive */}
        {showArchive && (
          <div className={styles.archiveSection}>
            {/* Requests TO You */}
            {relationshipRequestsToYou.length > 0 && (
              <div className={styles.subsection}>
                <h3 className={styles.subsectionTitle}>Pending Requests to You</h3>
                <p className={styles.subsectionDescription}>
                  Go to <Link to="/notifications" className={styles.inlineLink}>Notifications</Link> to accept or decline
                </p>
                <div className={styles.requestsList}>
                  {relationshipRequestsToYou.map(request => (
                    <div key={request.id} className={styles.requestItem}>
                      <Link to={`/profile/${request.proposer_username}`} className={styles.requestInfo}>
                        {request.proposer_avatar_url ? (
                          <img src={request.proposer_avatar_url} alt="" className={styles.smallAvatar} />
                        ) : (
                          <div className={styles.smallAvatarPlaceholder}>
                            {request.proposer_username?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div>
                          <strong>{request.proposer_display_name || request.proposer_username}</strong>
                          <p>Wants to be your {capitalizeRelationship(request.i_would_call_them)}</p>
                        </div>
                      </Link>
                      <span className={`${styles.statusBadge} ${styles.pending}`}>Pending</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requests BY You */}
            {relationshipRequestsByYou.length > 0 && (
              <div className={styles.subsection}>
                <h3 className={styles.subsectionTitle}>Requests by You</h3>
                <div className={styles.requestsList}>
                  {relationshipRequestsByYou.map(request => (
                    <div key={request.id} className={styles.requestItem}>
                      <Link to={`/profile/${request.recipient_username}`} className={styles.requestInfo}>
                        {request.recipient_avatar_url ? (
                          <img src={request.recipient_avatar_url} alt="" className={styles.smallAvatar} />
                        ) : (
                          <div className={styles.smallAvatarPlaceholder}>
                            {request.recipient_username?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div>
                          <strong>{request.recipient_display_name || request.recipient_username}</strong>
                          <p>Proposed as your {capitalizeRelationship(request.i_call_them)}</p>
                        </div>
                      </Link>
                      <span className={`${styles.statusBadge} ${styles.pending}`}>Pending</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
