import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmModal'
import apiService from '../services/api'
import InviteFamilyModal from '../components/InviteFamilyModal'
import styles from './Groups.module.css'

function Groups() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [groups, setGroups] = useState([])
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [sentInvitations, setSentInvitations] = useState([])
  const [shareLinks, setShareLinks] = useState([])
  const [inviteUrl, setInviteUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [selectedMembers, setSelectedMembers] = useState([])
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [shareLinkFilter, setShareLinkFilter] = useState('active') // active, expired

  useEffect(() => {
    loadAllData()
  }, [])

  async function loadAllData() {
    setLoading(true)
    await Promise.all([
      loadGroups(),
      loadFollowers(),
      loadFollowing(),
      loadPendingRequests(),
      loadInvitations(),
      loadShareLinks(),
      loadInviteLink()
    ])
    setLoading(false)
  }

  async function loadGroups() {
    try {
      const data = await apiService.getCustomGroups()
      setGroups(data)
    } catch (error) {
      console.error('Error loading groups:', error)
    }
  }

  async function loadFollowers() {
    try {
      const data = await apiService.getFollowers()
      setFollowers(data)
    } catch (error) {
      console.error('Error loading followers:', error)
    }
  }

  async function loadFollowing() {
    try {
      const data = await apiService.getFollowing()
      setFollowing(data)
    } catch (error) {
      console.error('Error loading following:', error)
    }
  }

  async function loadPendingRequests() {
    try {
      const data = await apiService.getFollowRequests()
      setPendingRequests(data)
    } catch (error) {
      console.error('Error loading pending requests:', error)
    }
  }

  async function loadInvitations() {
    try {
      const data = await apiService.getInvitations()
      // API returns { invitations: [...], total: N }
      const invitations = data.invitations || data || []
      // Filter to only email invitations (exclude link-based)
      const emailInvitations = invitations.filter(inv => inv.invited_email)
      setSentInvitations(emailInvitations)
    } catch (error) {
      console.error('Error loading invitations:', error)
    }
  }

  async function loadShareLinks() {
    try {
      const data = await apiService.getAllShareLinks()
      setShareLinks(data)
    } catch (error) {
      console.error('Error loading share links:', error)
    }
  }

  async function loadInviteLink() {
    try {
      const response = await apiService.createInviteLink()
      setInviteUrl(response.invite_url)
    } catch (error) {
      console.error('Error loading invite link:', error)
      // Fallback to profile URL
      if (user?.username) {
        setInviteUrl(`https://www.ourfamilysocials.com/profile/${user.username}`)
      }
    }
  }

  function handleCreateClick() {
    setEditingGroup(null)
    setFormData({ name: '', description: '' })
    setSelectedMembers([])
    setShowCreateModal(true)
  }

  async function handleEditClick(group) {
    // Load full group details with members
    try {
      const fullGroup = await apiService.getCustomGroup(group.id)
      setEditingGroup(fullGroup)
      setFormData({ name: fullGroup.name, description: fullGroup.description || '' })
      setSelectedMembers(fullGroup.members.map(m => m.id))
      setShowCreateModal(true)
    } catch (error) {
      console.error('Error loading group:', error)
      showToast('Failed to load group details', 'error')
    }
  }

  async function handleDeleteClick(group) {
    const confirmed = await confirm({
      title: 'Delete Group',
      message: `Are you sure you want to delete "${group.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      isDangerous: true
    })

    if (confirmed) {
      try {
        await apiService.deleteCustomGroup(group.id)
        showToast('Group deleted', 'success')
        loadGroups()
      } catch (error) {
        console.error('Error deleting group:', error)
        showToast('Failed to delete group', 'error')
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.name.trim()) {
      showToast('Please enter a group name', 'error')
      return
    }

    try {
      if (editingGroup) {
        // Update existing group
        await apiService.updateCustomGroup(editingGroup.id, {
          name: formData.name,
          description: formData.description
        })

        // Update members
        const currentMemberIds = editingGroup.members.map(m => m.id)
        const toAdd = selectedMembers.filter(id => !currentMemberIds.includes(id))
        const toRemove = currentMemberIds.filter(id => !selectedMembers.includes(id))

        for (const userId of toAdd) {
          await apiService.addGroupMember(editingGroup.id, userId)
        }
        for (const userId of toRemove) {
          await apiService.removeGroupMember(editingGroup.id, userId)
        }

        showToast('Group updated', 'success')
      } else {
        // Create new group
        const newGroup = await apiService.createCustomGroup({
          name: formData.name,
          description: formData.description,
          member_ids: selectedMembers
        })
        showToast('Group created', 'success')
      }

      setShowCreateModal(false)
      loadGroups()
    } catch (error) {
      console.error('Error saving group:', error)
      showToast(error.message || 'Failed to save group', 'error')
    }
  }

  function toggleMember(userId) {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== userId))
    } else {
      setSelectedMembers([...selectedMembers, userId])
    }
  }

  async function toggleGroupExpansion(groupId) {
    if (expandedGroup === groupId) {
      setExpandedGroup(null)
    } else {
      // Load full group details
      try {
        const fullGroup = await apiService.getCustomGroup(groupId)
        setGroups(groups.map(g => g.id === groupId ? fullGroup : g))
        setExpandedGroup(groupId)
      } catch (error) {
        console.error('Error loading group details:', error)
      }
    }
  }

  // Helper to get status label for a follower
  function getFollowerStatus(follower) {
    if (follower.status === 'pending') return 'Requested to follow you'
    if (follower.status === 'accepted') return 'Following you'
    return follower.status
  }

  async function handleToggleCloseFamily(userId, currentStatus) {
    try {
      await apiService.toggleCloseFamily(userId, !currentStatus)
      showToast(`Updated close family status`, 'success')
      loadFollowers()
    } catch (error) {
      console.error('Error toggling close family:', error)
      showToast('Failed to update close family status', 'error')
    }
  }

  async function handleAcceptRequest(userId) {
    try {
      await apiService.acceptFollowRequest(userId)
      showToast('Follow request accepted', 'success')
      loadAllData()
    } catch (error) {
      console.error('Error accepting request:', error)
      showToast('Failed to accept request', 'error')
    }
  }

  async function handleRejectRequest(userId) {
    try {
      await apiService.rejectFollowRequest(userId)
      showToast('Follow request rejected', 'success')
      loadAllData()
    } catch (error) {
      console.error('Error rejecting request:', error)
      showToast('Failed to reject request', 'error')
    }
  }

  async function handleCancelInvitation(invitationId) {
    try {
      await apiService.cancelInvitation(invitationId)
      showToast('Invitation cancelled', 'success')
      loadInvitations()
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      showToast('Failed to cancel invitation', 'error')
    }
  }

  async function handleResendInvitation(invitationId) {
    try {
      await apiService.resendInvitation(invitationId)
      showToast('Invitation resent', 'success')
      loadInvitations() // Reload to update resend count
    } catch (error) {
      console.error('Error resending invitation:', error)
      const errorMsg = error.message || 'Failed to resend invitation'
      showToast(errorMsg, 'error')
    }
  }

  function copyToClipboard(text, successMessage = 'Copied!') {
    navigator.clipboard.writeText(text)
      .then(() => showToast(successMessage, 'success'))
      .catch(() => showToast('Failed to copy', 'error'))
  }

  function copyInviteLink() {
    copyToClipboard(inviteUrl, 'Invite link copied!')
  }

  function copyInviteMessage() {
    const displayName = user?.display_name || user?.full_name || user?.username
    const message = `Hi! I'd love for you to join me on Our Family Socials - it's a private space where I share family memories, photos, and life events with the people I care about.

Click this link to see what I'm sharing and sign up:
${inviteUrl}

Looking forward to sharing our memories together!
- ${displayName}`
    copyToClipboard(message, 'Invite message copied!')
  }

  async function handleCopyShareLink(link) {
    const url = `https://www.ourfamilysocials.com/shared/${link.token}`
    copyToClipboard(url, 'Event link copied!')
  }

  async function handleExtendShareLink(link) {
    try {
      await apiService.extendShareLink(link.id)
      showToast('Link extended by 7 days', 'success')
      loadShareLinks()
    } catch (error) {
      console.error('Error extending link:', error)
      showToast('Failed to extend link', 'error')
    }
  }

  async function handleDisableShareLink(link) {
    const confirmed = await confirm({
      title: 'Disable Link',
      message: `Are you sure you want to disable the link for "${link.event_title}"? People won't be able to access the event via this link anymore.`,
      confirmText: 'Disable',
      isDangerous: true
    })

    if (confirmed) {
      try {
        await apiService.deleteShareLink(link.id)
        showToast('Link disabled', 'success')
        loadShareLinks()
      } catch (error) {
        console.error('Error disabling link:', error)
        showToast('Failed to disable link', 'error')
      }
    }
  }

  function formatExpiryDate(expiresAt) {
    if (!expiresAt) return 'No expiry'
    const expiry = new Date(expiresAt)
    const now = new Date()
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'Expired'
    if (diffDays === 0) return 'Expires today'
    if (diffDays === 1) return 'Expires tomorrow'
    return `Expires in ${diffDays} days`
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  const acceptedFollowers = followers.filter(f => f.status === 'accepted')
  const closeFamilyFollowers = acceptedFollowers.filter(f => f.is_close_family)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Sharing</h1>
        <button className={styles.inviteButton} onClick={() => setShowInviteModal(true)}>
          + Invite Someone
        </button>
      </div>

      <div className={styles.description}>
        Manage who can see your events and invite new people to follow you.
      </div>

      {/* Invite Link Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Your Invite Link</h2>
        </div>
        <div className={styles.inviteLinkCard}>
          <div className={styles.linkDisplay}>
            <span className={styles.linkIcon}>🔗</span>
            <span className={styles.linkText}>{inviteUrl || 'Loading...'}</span>
          </div>
          <div className={styles.linkButtons}>
            <button
              className={styles.copyButton}
              onClick={copyInviteLink}
              disabled={!inviteUrl}
            >
              Copy Link
            </button>
            <button
              className={styles.copyMessageButton}
              onClick={copyInviteMessage}
              disabled={!inviteUrl}
            >
              Copy Message
            </button>
          </div>
        </div>
        <p className={styles.linkHint}>
          Share this link via text, WhatsApp, or any messaging app. When they sign up, you'll automatically follow each other.
        </p>
      </div>

      {/* Email Invitations */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Email Invitations</h2>
          <span className={styles.count}>{sentInvitations.length}</span>
        </div>
        {sentInvitations.length === 0 ? (
          <div className={styles.emptyTable}>
            <p>No email invitations sent yet.</p>
            <p className={styles.emptyHint}>Use "+ Invite Someone" to send email invitations.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Sent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sentInvitations.map(invite => (
                  <tr key={invite.id}>
                    <td>{invite.invited_name || '—'}</td>
                    <td className={styles.emailCell}>{invite.invited_email}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${invite.status === 'signed_up' ? styles.success : styles.pending}`}>
                        {invite.status === 'signed_up' ? 'Signed Up' : 'Pending'}
                      </span>
                    </td>
                    <td className={styles.dateCell}>
                      {new Date(invite.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      {invite.status === 'pending' ? (
                        <div className={styles.actionButtons}>
                          {(invite.resends_remaining === undefined || invite.resends_remaining > 0) ? (
                            <button
                              className={styles.resendBtn}
                              onClick={() => handleResendInvitation(invite.id)}
                            >
                              Resend {invite.resends_remaining !== undefined ? `(${invite.resends_remaining})` : ''}
                            </button>
                          ) : (
                            <span className={styles.noResends}>No resends left</span>
                          )}
                          <button
                            className={styles.cancelBtn}
                            onClick={() => handleCancelInvitation(invite.id)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className={styles.signedUpNote}>Now following you</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Followers Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Your Followers</h2>
          <span className={styles.count}>{acceptedFollowers.length}</span>
        </div>

        {acceptedFollowers.length === 0 ? (
          <div className={styles.emptyTable}>
            <p>No followers yet. Invite people to follow you!</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Close Family</th>
                </tr>
              </thead>
              <tbody>
                {acceptedFollowers.map(follower => (
                  <tr key={follower.id}>
                    <td>
                      <Link to={`/profile/${follower.username}`} className={styles.userLink}>
                        @{follower.username}
                        {follower.full_name && <span className={styles.fullName}> ({follower.full_name})</span>}
                      </Link>
                    </td>
                    <td className={styles.emailCell}>{follower.email || '—'}</td>
                    <td><span className={styles.statusBadge}>{getFollowerStatus(follower)}</span></td>
                    <td>
                      <label className={styles.toggleLabel}>
                        <input
                          type="checkbox"
                          checked={follower.is_close_family}
                          onChange={() => handleToggleCloseFamily(follower.id, follower.is_close_family)}
                        />
                        <span className={styles.toggleSlider}></span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Pending Requests</h2>
            <span className={styles.count}>{pendingRequests.length}</span>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map(request => (
                  <tr key={request.id}>
                    <td>
                      <Link to={`/profile/${request.username}`} className={styles.userLink}>
                        @{request.username}
                        {request.full_name && <span className={styles.fullName}> ({request.full_name})</span>}
                      </Link>
                    </td>
                    <td className={styles.emailCell}>{request.email || '—'}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button className={styles.acceptBtn} onClick={() => handleAcceptRequest(request.id)}>Accept</button>
                        <button className={styles.rejectBtn} onClick={() => handleRejectRequest(request.id)}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shared Event Links Section */}
      {shareLinks.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Shared Event Links</h2>
            <div className={styles.shareLinkFilters}>
              <button
                className={`${styles.filterBtn} ${shareLinkFilter === 'active' ? styles.activeFilter : ''}`}
                onClick={() => setShareLinkFilter('active')}
              >
                Active ({shareLinks.filter(l => !l.expires_at || new Date(l.expires_at) > new Date()).length})
              </button>
              <button
                className={`${styles.filterBtn} ${shareLinkFilter === 'expired' ? styles.activeFilter : ''}`}
                onClick={() => setShareLinkFilter('expired')}
              >
                Expired ({shareLinks.filter(l => l.expires_at && new Date(l.expires_at) <= new Date()).length})
              </button>
            </div>
          </div>
          <div className={styles.shareLinksList}>
            {shareLinks
              .filter(link => {
                const isExpired = link.expires_at && new Date(link.expires_at) <= new Date()
                return shareLinkFilter === 'active' ? !isExpired : isExpired
              })
              .map(link => (
                <div key={link.id} className={styles.shareLinkCard}>
                  <div className={styles.shareLinkInfo}>
                    <Link to={`/events/${link.event_id}`} className={styles.shareLinkTitle}>
                      {link.event_title}
                    </Link>
                    <div className={styles.shareLinkMeta}>
                      <span className={link.expires_at && new Date(link.expires_at) <= new Date() ? styles.expired : ''}>
                        {formatExpiryDate(link.expires_at)}
                      </span>
                      <span className={styles.separator}>•</span>
                      <span>{link.view_count || 0} views</span>
                    </div>
                  </div>
                  <div className={styles.shareLinkActions}>
                    <button
                      className={styles.copyBtn}
                      onClick={() => handleCopyShareLink(link)}
                    >
                      Copy
                    </button>
                    {(!link.expires_at || new Date(link.expires_at) > new Date()) && (
                      <button
                        className={styles.extendBtn}
                        onClick={() => handleExtendShareLink(link)}
                      >
                        Extend
                      </button>
                    )}
                    <button
                      className={styles.disableBtn}
                      onClick={() => handleDisableShareLink(link)}
                    >
                      {link.expires_at && new Date(link.expires_at) <= new Date() ? 'Delete' : 'Disable'}
                    </button>
                  </div>
                </div>
              ))}
            {shareLinks.filter(link => {
              const isExpired = link.expires_at && new Date(link.expires_at) <= new Date()
              return shareLinkFilter === 'active' ? !isExpired : isExpired
            }).length === 0 && (
              <div className={styles.emptyTable}>
                <p>No {shareLinkFilter} event links</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Groups Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Custom Groups</h2>
          <button className={styles.createButton} onClick={handleCreateClick}>
            + Create Group
          </button>
        </div>

        {groups.length === 0 ? (
          <div className={styles.emptyTable}>
            <p>No custom groups yet. Create groups to organize who sees specific events.</p>
          </div>
        ) : (
          <div className={styles.groupsList}>
            {groups.map(group => (
              <div key={group.id} className={styles.groupCard}>
                <div className={styles.groupHeader}>
                  <div className={styles.groupInfo}>
                    <h3 className={styles.groupName}>{group.name}</h3>
                    {group.description && (
                      <p className={styles.groupDescription}>{group.description}</p>
                    )}
                    <div className={styles.groupMeta}>
                      {group.member_count || 0} {group.member_count === 1 ? 'member' : 'members'}
                    </div>
                  </div>
                  <div className={styles.groupActions}>
                    <button
                      className={styles.expandButton}
                      onClick={() => toggleGroupExpansion(group.id)}
                    >
                      {expandedGroup === group.id ? '▲' : '▼'}
                    </button>
                    <button
                      className={styles.editButton}
                      onClick={() => handleEditClick(group)}
                    >
                      Edit
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteClick(group)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {expandedGroup === group.id && group.members && (
                  <div className={styles.membersList}>
                    {group.members.length === 0 ? (
                      <p className={styles.noMembers}>No members yet.</p>
                    ) : (
                      <div className={styles.members}>
                        {group.members.map(member => (
                          <Link key={member.id} to={`/profile/${member.username}`} className={styles.memberChip}>
                            @{member.username}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <InviteFamilyModal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false)
          loadInvitations()
        }}
      />

      {/* Create/Edit Group Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingGroup ? 'Edit Group' : 'Create New Group'}
              </h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Group Name *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Close Friends, Family"
                  maxLength={50}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description">Description (Optional)</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What is this group for?"
                  maxLength={200}
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Members</label>
                <p className={styles.hint}>Select from your followers who should be in this group</p>

                {followers.length === 0 ? (
                  <p className={styles.noFollowers}>
                    You don't have any followers yet. People need to follow you before you can add them to groups.
                  </p>
                ) : (
                  <div className={styles.followersList}>
                    {followers.map(follower => (
                      <label key={follower.id} className={styles.followerItem}>
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(follower.id)}
                          onChange={() => toggleMember(follower.id)}
                        />
                        <div className={styles.followerInfo}>
                          <div className={styles.followerAvatar}>
                            {follower.full_name?.charAt(0) || follower.username.charAt(0)}
                          </div>
                          <div className={styles.followerDetails}>
                            <div className={styles.followerName}>
                              {follower.full_name || follower.username}
                            </div>
                            <div className={styles.followerUsername}>@{follower.username}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitButton}>
                  {editingGroup ? 'Update Group' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Groups
