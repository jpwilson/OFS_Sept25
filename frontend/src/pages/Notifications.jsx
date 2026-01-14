import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import apiService from '../services/api'
import styles from './Notifications.module.css'

export default function Notifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('follows') // 'follows', 'tags', 'relationships'
  const [loading, setLoading] = useState(true)

  // Follow state
  const [followRequestsToYou, setFollowRequestsToYou] = useState([])
  const [followRequestsByYou, setFollowRequestsByYou] = useState([])
  const [followsLoading, setFollowsLoading] = useState(false)
  const [processingFollow, setProcessingFollow] = useState(null)

  // Tag state
  const [tagRequestsToYou, setTagRequestsToYou] = useState([])
  const [tagRequestsByYou, setTagRequestsByYou] = useState([])
  const [tagsLoading, setTagsLoading] = useState(false)
  const [processingTag, setProcessingTag] = useState(null)

  // Profile claim state
  const [profileClaimsToYou, setProfileClaimsToYou] = useState([])
  const [profileClaimsByYou, setProfileClaimsByYou] = useState([])
  const [processingClaim, setProcessingClaim] = useState(null)

  // Tag profile relationship request state
  const [tagProfileRelReqsToYou, setTagProfileRelReqsToYou] = useState([])
  const [tagProfileRelReqsByYou, setTagProfileRelReqsByYou] = useState([])
  const [processingTagProfileRelReq, setProcessingTagProfileRelReq] = useState(null)

  // Relationship state
  const [relationshipRequestsToYou, setRelationshipRequestsToYou] = useState([])
  const [relationshipRequestsByYou, setRelationshipRequestsByYou] = useState([])
  const [acceptedRelationships, setAcceptedRelationships] = useState([])
  const [relationshipsLoading, setRelationshipsLoading] = useState(false)
  const [processingRelationship, setProcessingRelationship] = useState(null)

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadAllData()
  }, [user])

  async function loadAllData() {
    setLoading(true)
    await Promise.all([
      loadFollowData(),
      loadTagData(),
      loadRelationshipData()
    ])
    setLoading(false)
  }

  async function loadFollowData() {
    setFollowsLoading(true)
    try {
      const [toYou, byYou] = await Promise.all([
        apiService.getFollowRequests(),
        apiService.getSentFollowRequests()
      ])
      setFollowRequestsToYou(toYou || [])
      setFollowRequestsByYou(byYou || [])
    } catch (error) {
      console.error('Failed to load follow data:', error)
    } finally {
      setFollowsLoading(false)
    }
  }

  async function loadTagData() {
    setTagsLoading(true)
    try {
      const [toYou, byYou, claimsToYou, claimsByYou, tagRelReqsToYou, tagRelReqsByYou] = await Promise.all([
        apiService.getTagRequests(),
        apiService.getSentTagRequests(),
        apiService.getTagProfileClaimsToMe(),
        apiService.getSentTagProfileClaims(),
        apiService.getTagProfileRelationshipRequestsToMe(),
        apiService.getSentTagProfileRelationshipRequests()
      ])
      setTagRequestsToYou(toYou || [])
      setTagRequestsByYou(byYou || [])
      setProfileClaimsToYou(claimsToYou || [])
      setProfileClaimsByYou(claimsByYou || [])
      setTagProfileRelReqsToYou(tagRelReqsToYou || [])
      setTagProfileRelReqsByYou(tagRelReqsByYou || [])
    } catch (error) {
      console.error('Failed to load tag data:', error)
    } finally {
      setTagsLoading(false)
    }
  }

  async function loadRelationshipData() {
    setRelationshipsLoading(true)
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
      setRelationshipsLoading(false)
    }
  }

  // --- Follow Handlers ---

  async function handleAcceptFollow(requestId) {
    setProcessingFollow(requestId)
    try {
      await apiService.acceptFollowRequest(requestId)
      setFollowRequestsToYou(prev => prev.filter(r => r.request_id !== requestId))
      showToast('Follow request accepted', 'success')
    } catch (error) {
      showToast('Failed to accept follow request', 'error')
    } finally {
      setProcessingFollow(null)
    }
  }

  async function handleRejectFollow(requestId) {
    setProcessingFollow(requestId)
    try {
      await apiService.rejectFollowRequest(requestId)
      setFollowRequestsToYou(prev => prev.filter(r => r.request_id !== requestId))
      showToast('Follow request rejected', 'success')
    } catch (error) {
      showToast('Failed to reject follow request', 'error')
    } finally {
      setProcessingFollow(null)
    }
  }

  async function handleCancelFollow(username, fullName) {
    setProcessingFollow(username)
    try {
      await apiService.unfollowUser(username)
      setFollowRequestsByYou(prev => prev.filter(r => r.username !== username))
      showToast(`Cancelled follow request to ${fullName || username}`, 'success')
    } catch (error) {
      showToast('Failed to cancel request', 'error')
    } finally {
      setProcessingFollow(null)
    }
  }

  // --- Tag Handlers ---

  async function handleAcceptTag(tagId) {
    setProcessingTag(tagId)
    try {
      await apiService.acceptTagRequest(tagId)
      setTagRequestsToYou(prev => prev.filter(r => r.id !== tagId))
      showToast('Tag accepted', 'success')
    } catch (error) {
      showToast('Failed to accept tag', 'error')
    } finally {
      setProcessingTag(null)
    }
  }

  async function handleRejectTag(tagId) {
    setProcessingTag(tagId)
    try {
      await apiService.rejectTagRequest(tagId)
      setTagRequestsToYou(prev => prev.filter(r => r.id !== tagId))
      showToast('Tag rejected', 'success')
    } catch (error) {
      showToast('Failed to reject tag', 'error')
    } finally {
      setProcessingTag(null)
    }
  }

  // --- Profile Claim Handlers ---

  async function handleApproveClaim(claimId) {
    setProcessingClaim(claimId)
    try {
      await apiService.approveTagProfileClaim(claimId)
      setProfileClaimsToYou(prev => prev.filter(c => c.id !== claimId))
      showToast('Profile claim approved and merged', 'success')
    } catch (error) {
      showToast('Failed to approve claim', 'error')
    } finally {
      setProcessingClaim(null)
    }
  }

  async function handleRejectClaim(claimId) {
    setProcessingClaim(claimId)
    try {
      await apiService.rejectTagProfileClaim(claimId)
      setProfileClaimsToYou(prev => prev.filter(c => c.id !== claimId))
      showToast('Profile claim rejected', 'success')
    } catch (error) {
      showToast('Failed to reject claim', 'error')
    } finally {
      setProcessingClaim(null)
    }
  }

  // --- Tag Profile Relationship Request Handlers ---

  async function handleApproveTagProfileRelReq(requestId) {
    setProcessingTagProfileRelReq(requestId)
    try {
      await apiService.approveTagProfileRelationshipRequest(requestId)
      setTagProfileRelReqsToYou(prev => prev.filter(r => r.id !== requestId))
      showToast('Relationship request approved!', 'success')
    } catch (error) {
      showToast('Failed to approve request', 'error')
    } finally {
      setProcessingTagProfileRelReq(null)
    }
  }

  async function handleRejectTagProfileRelReq(requestId) {
    setProcessingTagProfileRelReq(requestId)
    try {
      await apiService.rejectTagProfileRelationshipRequest(requestId)
      setTagProfileRelReqsToYou(prev => prev.filter(r => r.id !== requestId))
      showToast('Relationship request declined', 'success')
    } catch (error) {
      showToast('Failed to decline request', 'error')
    } finally {
      setProcessingTagProfileRelReq(null)
    }
  }

  // --- Relationship Handlers ---

  async function handleAcceptRelationship(relationshipId) {
    setProcessingRelationship(relationshipId)
    try {
      const result = await apiService.acceptRelationship(relationshipId)
      setRelationshipRequestsToYou(prev => prev.filter(r => r.id !== relationshipId))
      setAcceptedRelationships(prev => [result, ...prev])
      showToast('Relationship accepted!', 'success')
    } catch (error) {
      showToast(error.message || 'Failed to accept relationship', 'error')
    } finally {
      setProcessingRelationship(null)
    }
  }

  async function handleRejectRelationship(relationshipId) {
    setProcessingRelationship(relationshipId)
    try {
      await apiService.rejectRelationship(relationshipId)
      setRelationshipRequestsToYou(prev => prev.filter(r => r.id !== relationshipId))
      showToast('Relationship request declined', 'success')
    } catch (error) {
      showToast('Failed to decline relationship', 'error')
    } finally {
      setProcessingRelationship(null)
    }
  }

  async function handleDeleteRelationship(relationshipId) {
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

  // Counts for badges
  const pendingFollowsToYou = followRequestsToYou.length
  const pendingTagsToYou = tagRequestsToYou.filter(r => r.status === 'pending').length
  const pendingClaimsToYou = profileClaimsToYou.filter(c => c.status === 'pending').length
  const pendingTagRelReqsToYou = tagProfileRelReqsToYou.length
  const totalPendingTags = pendingTagsToYou + pendingClaimsToYou + pendingTagRelReqsToYou
  const pendingRelationshipsToYou = relationshipRequestsToYou.length

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
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtitle}>Manage your follow requests, tags, and relationships</p>
        </div>

        {/* Main Tabs */}
        <div className={styles.mainTabs}>
          <button
            className={`${styles.mainTab} ${activeTab === 'follows' ? styles.activeMainTab : ''}`}
            onClick={() => setActiveTab('follows')}
          >
            Follows
            {pendingFollowsToYou > 0 && (
              <span className={styles.badge}>{pendingFollowsToYou}</span>
            )}
          </button>
          <button
            className={`${styles.mainTab} ${activeTab === 'tags' ? styles.activeMainTab : ''}`}
            onClick={() => setActiveTab('tags')}
          >
            Tags
            {totalPendingTags > 0 && (
              <span className={styles.badge}>{totalPendingTags}</span>
            )}
          </button>
          <button
            className={`${styles.mainTab} ${activeTab === 'relationships' ? styles.activeMainTab : ''}`}
            onClick={() => setActiveTab('relationships')}
          >
            Relationships
            {pendingRelationshipsToYou > 0 && (
              <span className={styles.badge}>{pendingRelationshipsToYou}</span>
            )}
          </button>
        </div>

        {/* ============ FOLLOWS TAB ============ */}
        {activeTab === 'follows' && (
          <div className={styles.requestsSection}>
            {followsLoading ? (
              <div className={styles.loading}>Loading...</div>
            ) : (
              <>
                {/* Requests TO You */}
                <div className={styles.subsection}>
                  <h2 className={styles.subsectionTitle}>Requests to You</h2>
                  <p className={styles.sectionDescription}>
                    People who want to follow you
                  </p>

                  {followRequestsToYou.length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>👥</span>
                      <p>No pending follow requests</p>
                    </div>
                  ) : (
                    <div className={styles.requestsList}>
                      {followRequestsToYou.map(request => (
                        <div key={request.request_id} className={styles.requestItem}>
                          <Link to={`/profile/${request.username}`} className={styles.requestInfo}>
                            {request.avatar_url ? (
                              <img src={request.avatar_url} alt="" className={styles.requestAvatar} />
                            ) : (
                              <div className={styles.requestAvatarPlaceholder}>
                                {request.username?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div className={styles.requestDetails}>
                              <strong>{request.full_name || request.username}</strong>
                              <p>@{request.username}</p>
                            </div>
                          </Link>
                          <div className={styles.requestActions}>
                            <button
                              className={styles.acceptButton}
                              onClick={() => handleAcceptFollow(request.request_id)}
                              disabled={processingFollow === request.request_id}
                            >
                              Accept
                            </button>
                            <button
                              className={styles.rejectButton}
                              onClick={() => handleRejectFollow(request.request_id)}
                              disabled={processingFollow === request.request_id}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Requests BY You */}
                <div className={styles.subsection}>
                  <h2 className={styles.subsectionTitle}>Requests by You</h2>
                  <p className={styles.sectionDescription}>
                    People you've requested to follow
                  </p>

                  {followRequestsByYou.length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>📤</span>
                      <p>No sent follow requests</p>
                    </div>
                  ) : (
                    <div className={styles.requestsList}>
                      {followRequestsByYou.map(request => (
                        <div key={request.request_id} className={styles.requestItem}>
                          <Link to={`/profile/${request.username}`} className={styles.requestInfo}>
                            {request.avatar_url ? (
                              <img src={request.avatar_url} alt="" className={styles.requestAvatar} />
                            ) : (
                              <div className={styles.requestAvatarPlaceholder}>
                                {request.username?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div className={styles.requestDetails}>
                              <strong>{request.full_name || request.username}</strong>
                              <p>@{request.username}</p>
                            </div>
                          </Link>
                          <div className={styles.requestActions}>
                            <button
                              className={styles.rejectButton}
                              onClick={() => handleCancelFollow(request.username, request.full_name)}
                              disabled={processingFollow === request.username}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ============ TAGS TAB ============ */}
        {activeTab === 'tags' && (
          <div className={styles.requestsSection}>
            {tagsLoading ? (
              <div className={styles.loading}>Loading...</div>
            ) : (
              <>
                {/* Tag Requests TO You */}
                <div className={styles.subsection}>
                  <h2 className={styles.subsectionTitle}>Requests to You</h2>
                  <p className={styles.sectionDescription}>
                    People who want to tag you in their events
                  </p>

                  {tagRequestsToYou.filter(r => r.status === 'pending').length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>🏷️</span>
                      <p>No pending tag requests</p>
                    </div>
                  ) : (
                    <div className={styles.requestsList}>
                      {tagRequestsToYou.filter(r => r.status === 'pending').map(request => (
                        <div key={request.id} className={styles.requestItem}>
                          <Link to={`/event/${request.event_id}`} className={styles.requestInfo}>
                            {request.event_cover_image_url && (
                              <img src={request.event_cover_image_url} alt="" className={styles.requestImage} />
                            )}
                            <div className={styles.requestDetails}>
                              <strong>{request.event_title}</strong>
                              <p>
                                <Link to={`/profile/${request.tagged_by_username}`} onClick={e => e.stopPropagation()}>
                                  {request.tagged_by_display_name || request.tagged_by_username}
                                </Link>
                                {' wants to tag you'}
                              </p>
                            </div>
                          </Link>
                          <div className={styles.requestActions}>
                            <button
                              className={styles.acceptButton}
                              onClick={() => handleAcceptTag(request.id)}
                              disabled={processingTag === request.id}
                            >
                              Accept
                            </button>
                            <button
                              className={styles.rejectButton}
                              onClick={() => handleRejectTag(request.id)}
                              disabled={processingTag === request.id}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tag Requests BY You */}
                <div className={styles.subsection}>
                  <h2 className={styles.subsectionTitle}>Requests by You</h2>
                  <p className={styles.sectionDescription}>
                    People you've tagged in your events
                  </p>

                  {tagRequestsByYou.length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>📤</span>
                      <p>No sent tag requests</p>
                    </div>
                  ) : (
                    <div className={styles.requestsList}>
                      {tagRequestsByYou.map(request => (
                        <div key={request.id} className={styles.requestItem}>
                          <Link to={`/event/${request.event_id}`} className={styles.requestInfo}>
                            {request.event_cover_image_url && (
                              <img src={request.event_cover_image_url} alt="" className={styles.requestImage} />
                            )}
                            <div className={styles.requestDetails}>
                              <strong>{request.event_title}</strong>
                              <p>
                                Tagged{' '}
                                <Link to={`/profile/${request.tagged_user_username}`} onClick={e => e.stopPropagation()}>
                                  {request.tagged_user_display_name || request.tagged_user_username}
                                </Link>
                              </p>
                            </div>
                          </Link>
                          <div className={styles.statusBadge}>
                            <span className={`${styles.status} ${styles[request.status]}`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Profile Claim Requests TO You */}
                {profileClaimsToYou.filter(c => c.status === 'pending').length > 0 && (
                  <div className={styles.subsection}>
                    <h2 className={styles.subsectionTitle}>Profile Claim Requests</h2>
                    <p className={styles.sectionDescription}>
                      People claiming to be one of your tag profiles
                    </p>

                    <div className={styles.requestsList}>
                      {profileClaimsToYou.filter(c => c.status === 'pending').map(claim => (
                        <div key={claim.id} className={styles.requestItem}>
                          <div className={styles.requestInfo}>
                            {claim.claimant_avatar_url ? (
                              <img src={claim.claimant_avatar_url} alt="" className={styles.requestAvatar} />
                            ) : (
                              <div className={styles.requestAvatarPlaceholder}>
                                {claim.claimant_username?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div className={styles.requestDetails}>
                              <strong>
                                <Link to={`/profile/${claim.claimant_username}`}>
                                  {claim.claimant_display_name || claim.claimant_username}
                                </Link>
                              </strong>
                              <p>
                                wants to claim "{claim.tag_profile_name}"
                                {claim.tag_profile_relationship && ` (your ${claim.tag_profile_relationship})`}
                              </p>
                              {claim.message && (
                                <p className={styles.claimMessage}>"{claim.message}"</p>
                              )}
                            </div>
                          </div>
                          <div className={styles.requestActions}>
                            <button
                              className={styles.acceptButton}
                              onClick={() => handleApproveClaim(claim.id)}
                              disabled={processingClaim === claim.id}
                            >
                              Approve
                            </button>
                            <button
                              className={styles.rejectButton}
                              onClick={() => handleRejectClaim(claim.id)}
                              disabled={processingClaim === claim.id}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Profile Claims BY You */}
                {profileClaimsByYou.length > 0 && (
                  <div className={styles.subsection}>
                    <h2 className={styles.subsectionTitle}>Your Profile Claims</h2>
                    <p className={styles.sectionDescription}>
                      Tag profiles you've requested to claim as your identity
                    </p>

                    <div className={styles.requestsList}>
                      {profileClaimsByYou.map(claim => (
                        <div key={claim.id} className={styles.requestItem}>
                          <div className={styles.requestInfo}>
                            {claim.tag_profile_photo_url ? (
                              <img src={claim.tag_profile_photo_url} alt="" className={styles.requestAvatar} />
                            ) : (
                              <div className={styles.requestAvatarPlaceholder}>
                                {claim.tag_profile_name?.[0]?.toUpperCase() || '#'}
                              </div>
                            )}
                            <div className={styles.requestDetails}>
                              <strong>{claim.tag_profile_name}</strong>
                              <p>
                                Created by{' '}
                                <Link to={`/profile/${claim.profile_creator_username}`}>
                                  {claim.profile_creator_display_name || claim.profile_creator_username}
                                </Link>
                                {claim.tag_profile_relationship && ` (their ${claim.tag_profile_relationship})`}
                              </p>
                            </div>
                          </div>
                          <div className={styles.statusBadge}>
                            <span className={`${styles.status} ${styles[claim.status]}`}>
                              {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tag Profile Relationship Requests TO You */}
                {tagProfileRelReqsToYou.length > 0 && (
                  <div className={styles.subsection}>
                    <h2 className={styles.subsectionTitle}>Tag Profile Relationship Requests</h2>
                    <p className={styles.sectionDescription}>
                      People requesting to add their relationship to tag profiles you created
                    </p>

                    <div className={styles.requestsList}>
                      {tagProfileRelReqsToYou.map(req => (
                        <div key={req.id} className={styles.requestItem}>
                          <div className={styles.requestInfo}>
                            {req.tag_profile_photo_url ? (
                              <img src={req.tag_profile_photo_url} alt="" className={styles.requestAvatar} />
                            ) : (
                              <div className={styles.requestAvatarPlaceholder}>
                                {req.tag_profile_name?.[0]?.toUpperCase() || '#'}
                              </div>
                            )}
                            <div className={styles.requestDetails}>
                              <strong>
                                <Link to={`/profile/${req.proposer_username}`}>
                                  {req.proposer_display_name || req.proposer_username}
                                </Link>
                              </strong>
                              <p>
                                wants to add "{req.tag_profile_name}" as their <strong>{req.relationship_type}</strong>
                              </p>
                              {req.message && (
                                <p className={styles.claimMessage}>"{req.message}"</p>
                              )}
                            </div>
                          </div>
                          <div className={styles.requestActions}>
                            <button
                              className={styles.acceptButton}
                              onClick={() => handleApproveTagProfileRelReq(req.id)}
                              disabled={processingTagProfileRelReq === req.id}
                            >
                              Approve
                            </button>
                            <button
                              className={styles.rejectButton}
                              onClick={() => handleRejectTagProfileRelReq(req.id)}
                              disabled={processingTagProfileRelReq === req.id}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tag Profile Relationship Requests BY You */}
                {tagProfileRelReqsByYou.length > 0 && (
                  <div className={styles.subsection}>
                    <h2 className={styles.subsectionTitle}>Your Tag Profile Relationship Requests</h2>
                    <p className={styles.sectionDescription}>
                      Your requests to add relationships to tag profiles
                    </p>

                    <div className={styles.requestsList}>
                      {tagProfileRelReqsByYou.map(req => (
                        <div key={req.id} className={styles.requestItem}>
                          <div className={styles.requestInfo}>
                            {req.tag_profile_photo_url ? (
                              <img src={req.tag_profile_photo_url} alt="" className={styles.requestAvatar} />
                            ) : (
                              <div className={styles.requestAvatarPlaceholder}>
                                {req.tag_profile_name?.[0]?.toUpperCase() || '#'}
                              </div>
                            )}
                            <div className={styles.requestDetails}>
                              <strong>
                                <Link to={`/tag-profile/${req.tag_profile_id}`}>
                                  {req.tag_profile_name}
                                </Link>
                              </strong>
                              <p>
                                Your {req.relationship_type} · Created by{' '}
                                <Link to={`/profile/${req.profile_creator_username}`}>
                                  {req.profile_creator_display_name || req.profile_creator_username}
                                </Link>
                              </p>
                            </div>
                          </div>
                          <div className={styles.statusBadge}>
                            <span className={`${styles.status} ${styles[req.status]}`}>
                              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ============ RELATIONSHIPS TAB ============ */}
        {activeTab === 'relationships' && (
          <div className={styles.requestsSection}>
            {relationshipsLoading ? (
              <div className={styles.loading}>Loading...</div>
            ) : (
              <>
                {/* Relationship Requests TO You */}
                <div className={styles.subsection}>
                  <h2 className={styles.subsectionTitle}>Requests to You</h2>
                  <p className={styles.sectionDescription}>
                    People who want to establish a verified relationship with you
                  </p>

                  {relationshipRequestsToYou.length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>👨‍👩‍👧‍👦</span>
                      <p>No pending relationship requests</p>
                    </div>
                  ) : (
                    <div className={styles.requestsList}>
                      {relationshipRequestsToYou.map(request => (
                        <div key={request.id} className={styles.requestItem}>
                          <Link to={`/profile/${request.proposer_username}`} className={styles.requestInfo}>
                            {request.proposer_avatar_url ? (
                              <img src={request.proposer_avatar_url} alt="" className={styles.requestAvatar} />
                            ) : (
                              <div className={styles.requestAvatarPlaceholder}>
                                {request.proposer_username?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div className={styles.requestDetails}>
                              <strong>{request.proposer_display_name || request.proposer_username}</strong>
                              <p>
                                Wants to be your <strong>{request.i_would_call_them ? request.i_would_call_them.charAt(0).toUpperCase() + request.i_would_call_them.slice(1) : ''}</strong>
                              </p>
                            </div>
                          </Link>
                          <div className={styles.requestActions}>
                            <button
                              className={styles.acceptButton}
                              onClick={() => handleAcceptRelationship(request.id)}
                              disabled={processingRelationship === request.id}
                            >
                              Accept
                            </button>
                            <button
                              className={styles.rejectButton}
                              onClick={() => handleRejectRelationship(request.id)}
                              disabled={processingRelationship === request.id}
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Relationship Requests BY You */}
                <div className={styles.subsection}>
                  <h2 className={styles.subsectionTitle}>Requests by You</h2>
                  <p className={styles.sectionDescription}>
                    Relationship requests you've sent that are awaiting approval
                  </p>

                  {relationshipRequestsByYou.length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>📤</span>
                      <p>No pending requests sent</p>
                    </div>
                  ) : (
                    <div className={styles.requestsList}>
                      {relationshipRequestsByYou.map(request => (
                        <div key={request.id} className={styles.requestItem}>
                          <Link to={`/profile/${request.recipient_username}`} className={styles.requestInfo}>
                            {request.recipient_avatar_url ? (
                              <img src={request.recipient_avatar_url} alt="" className={styles.requestAvatar} />
                            ) : (
                              <div className={styles.requestAvatarPlaceholder}>
                                {request.recipient_username?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div className={styles.requestDetails}>
                              <strong>{request.recipient_display_name || request.recipient_username}</strong>
                              <p>
                                Proposed as your <strong>{request.i_call_them ? request.i_call_them.charAt(0).toUpperCase() + request.i_call_them.slice(1) : ''}</strong>
                              </p>
                            </div>
                          </Link>
                          <div className={styles.requestActions}>
                            <button
                              className={styles.rejectButton}
                              onClick={() => handleDeleteRelationship(request.id)}
                              disabled={processingRelationship === request.id}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Link to full Relationships page */}
                <div className={styles.viewAllSection}>
                  <Link to="/relationships" className={styles.viewAllLink}>
                    View all verified relationships →
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
