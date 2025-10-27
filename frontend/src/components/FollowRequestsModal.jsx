import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from './Toast'
import apiService from '../services/api'
import styles from './FollowRequestsModal.module.css'

function FollowRequestsModal({ isOpen, onClose, onRequestHandled }) {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('received') // 'received' or 'sent'
  const [receivedRequests, setReceivedRequests] = useState([])
  const [sentRequests, setSentRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState(new Set())

  useEffect(() => {
    if (isOpen) {
      loadRequests()
    }
  }, [isOpen])

  async function loadRequests() {
    setLoading(true)
    try {
      const [received, sent] = await Promise.all([
        apiService.getFollowRequests(),
        apiService.getSentFollowRequests()
      ])
      setReceivedRequests(received)
      setSentRequests(sent)
    } catch (error) {
      console.error('Failed to load follow requests:', error)
      showToast('Failed to load follow requests', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAccept(requestId, username) {
    if (processingIds.has(requestId)) return

    setProcessingIds(prev => new Set(prev).add(requestId))

    try {
      await apiService.acceptFollowRequest(requestId)
      showToast(`Accepted follow request from ${username}`, 'success')

      // Remove from received list
      setReceivedRequests(prev => prev.filter(r => r.request_id !== requestId))

      // Notify parent to refresh counts
      if (onRequestHandled) {
        onRequestHandled()
      }
    } catch (error) {
      console.error('Failed to accept follow request:', error)
      showToast('Failed to accept request', 'error')
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  async function handleReject(requestId, username) {
    if (processingIds.has(requestId)) return

    setProcessingIds(prev => new Set(prev).add(requestId))

    try {
      await apiService.rejectFollowRequest(requestId)
      showToast(`Rejected follow request from ${username}`, 'success')

      // Remove from received list
      setReceivedRequests(prev => prev.filter(r => r.request_id !== requestId))

      // Notify parent to refresh counts
      if (onRequestHandled) {
        onRequestHandled()
      }
    } catch (error) {
      console.error('Failed to reject follow request:', error)
      showToast('Failed to reject request', 'error')
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  async function handleCancel(username, fullName) {
    if (processingIds.has(username)) return

    setProcessingIds(prev => new Set(prev).add(username))

    try {
      await apiService.unfollowUser(username)
      showToast(`Cancelled follow request to ${fullName}`, 'success')

      // Remove from sent list
      setSentRequests(prev => prev.filter(r => r.username !== username))

      // Notify parent to refresh counts
      if (onRequestHandled) {
        onRequestHandled()
      }
    } catch (error) {
      console.error('Failed to cancel follow request:', error)
      showToast('Failed to cancel request', 'error')
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(username)
        return newSet
      })
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (!isOpen) return null

  const currentRequests = activeTab === 'received' ? receivedRequests : sentRequests

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Follow Requests</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'received' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('received')}
          >
            Received ({receivedRequests.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'sent' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            Sent ({sentRequests.length})
          </button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : currentRequests.length === 0 ? (
            <div className={styles.empty}>
              <p>
                {activeTab === 'received'
                  ? 'No pending follow requests'
                  : 'No pending outgoing requests'}
              </p>
            </div>
          ) : (
            <div className={styles.requestList}>
              {currentRequests.map(request => (
                <div key={activeTab === 'received' ? request.request_id : request.username} className={styles.requestItem}>
                  <Link
                    to={`/profile/${request.username}`}
                    className={styles.userInfo}
                    onClick={onClose}
                  >
                    <div className={styles.avatar}>
                      {request.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.userDetails}>
                      <span className={styles.fullName}>{request.full_name}</span>
                      <span className={styles.username}>@{request.username}</span>
                      <span className={styles.time}>{formatDate(request.created_at)}</span>
                    </div>
                  </Link>

                  <div className={styles.actions}>
                    {activeTab === 'received' ? (
                      <>
                        <button
                          className={styles.rejectButton}
                          onClick={() => handleReject(request.request_id, request.username)}
                          disabled={processingIds.has(request.request_id)}
                        >
                          {processingIds.has(request.request_id) ? '...' : 'Reject'}
                        </button>
                        <button
                          className={styles.acceptButton}
                          onClick={() => handleAccept(request.request_id, request.username)}
                          disabled={processingIds.has(request.request_id)}
                        >
                          {processingIds.has(request.request_id) ? '...' : 'Accept'}
                        </button>
                      </>
                    ) : (
                      <button
                        className={styles.cancelButton}
                        onClick={() => handleCancel(request.username, request.full_name)}
                        disabled={processingIds.has(request.username)}
                      >
                        {processingIds.has(request.username) ? '...' : 'Cancel Request'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FollowRequestsModal
