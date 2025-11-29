import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmModal'
import apiService from '../services/api'
import styles from './Groups.module.css'

function Groups() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [groups, setGroups] = useState([])
  const [followers, setFollowers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [selectedMembers, setSelectedMembers] = useState([])
  const [expandedGroup, setExpandedGroup] = useState(null)

  useEffect(() => {
    loadGroups()
    loadFollowers()
  }, [])

  async function loadGroups() {
    try {
      const data = await apiService.getCustomGroups()
      setGroups(data)
      setLoading(false)
    } catch (error) {
      console.error('Error loading groups:', error)
      showToast('Failed to load groups', 'error')
      setLoading(false)
    }
  }

  async function loadFollowers() {
    try {
      const data = await apiService.getFollowers()
      // Only get accepted followers
      setFollowers(data.filter(f => f.status === 'accepted'))
    } catch (error) {
      console.error('Error loading followers:', error)
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

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading groups...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Custom Groups</h1>
        <button className={styles.createButton} onClick={handleCreateClick}>
          + Create Group
        </button>
      </div>

      <div className={styles.description}>
        Create custom groups of people to share specific events with. Use these groups when setting event privacy to "Custom Group".
      </div>

      {groups.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>👥</div>
          <h2>No Groups Yet</h2>
          <p>Create your first custom group to organize who you share events with.</p>
          <button className={styles.createButton} onClick={handleCreateClick}>
            Create Your First Group
          </button>
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
                    {expandedGroup === group.id ? '▲ Hide' : '▼ Show'} Members
                  </button>
                  <button
                    className={styles.editButton}
                    onClick={() => handleEditClick(group)}
                  >
                    ✎ Edit
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDeleteClick(group)}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>

              {expandedGroup === group.id && group.members && (
                <div className={styles.membersList}>
                  {group.members.length === 0 ? (
                    <p className={styles.noMembers}>No members yet. Edit this group to add members.</p>
                  ) : (
                    <div className={styles.members}>
                      {group.members.map(member => (
                        <div key={member.id} className={styles.memberChip}>
                          <div className={styles.memberAvatar}>
                            {member.full_name?.charAt(0) || member.username.charAt(0)}
                          </div>
                          <span className={styles.memberName}>
                            {member.full_name || member.username}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
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
