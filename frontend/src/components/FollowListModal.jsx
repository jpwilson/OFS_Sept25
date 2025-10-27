import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import apiService from '../services/api'
import styles from './FollowListModal.module.css'

function FollowListModal({ isOpen, onClose, username, type }) {
  const { user: currentUser } = useAuth()
  const { showToast } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState({})

  useEffect(() => {
    if (isOpen && username) {
      loadUsers()
    }
  }, [isOpen, username, type])

  async function loadUsers() {
    setLoading(true)
    try {
      let data
      if (type === 'followers') {
        data = await apiService.getUserFollowers(username)
      } else {
        data = await apiService.getUserFollowing(username)
      }
      setUsers(data)
    } catch (error) {
      console.error(`Failed to load ${type}:`, error)
      showToast(`Failed to load ${type}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleFollowToggle(targetUsername, isFollowing) {
    if (followLoading[targetUsername]) return

    setFollowLoading(prev => ({ ...prev, [targetUsername]: true }))

    try {
      if (isFollowing) {
        await apiService.unfollowUser(targetUsername)
        showToast(`Unfollowed ${targetUsername}`, 'success')
      } else {
        await apiService.followUser(targetUsername)
        showToast(`Following ${targetUsername}`, 'success')
      }

      // Reload the list to update follow states
      await loadUsers()
    } catch (error) {
      console.error('Failed to toggle follow:', error)
      showToast('Failed to update follow status', 'error')
    } finally {
      setFollowLoading(prev => ({ ...prev, [targetUsername]: false }))
    }
  }

  if (!isOpen) return null

  const title = type === 'followers' ? 'Followers' : 'Following'

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : users.length === 0 ? (
            <div className={styles.empty}>
              <p>No {type} yet</p>
            </div>
          ) : (
            <div className={styles.userList}>
              {users.map(user => (
                <div key={user.id} className={styles.userItem}>
                  <Link
                    to={`/profile/${user.username}`}
                    className={styles.userInfo}
                    onClick={onClose}
                  >
                    <div className={styles.avatar}>
                      {user.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.userDetails}>
                      <div className={styles.nameRow}>
                        <span className={styles.fullName}>{user.full_name}</span>
                        {user.follows_you && (
                          <span className={styles.badge}>Follows you</span>
                        )}
                      </div>
                      <span className={styles.username}>@{user.username}</span>
                    </div>
                  </Link>

                  {currentUser && currentUser.username !== user.username && (
                    <button
                      className={`${styles.followButton} ${user.is_following ? styles.following : ''}`}
                      onClick={() => handleFollowToggle(user.username, user.is_following)}
                      disabled={followLoading[user.username]}
                    >
                      {followLoading[user.username] ? '...' : user.is_following ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FollowListModal
