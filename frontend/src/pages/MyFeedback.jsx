import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import apiService from '../services/api'
import { useToast } from '../components/Toast'
import styles from './MyFeedback.module.css'

const STATUS_LABELS = {
  new: 'Submitted',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed'
}

function MyFeedback() {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    loadFeedback()
  }, [])

  async function loadFeedback() {
    try {
      setLoading(true)
      const data = await apiService.getMyFeedback()
      setFeedback(data.feedback || [])
    } catch (err) {
      console.error('Failed to load feedback:', err)
      showToast('Failed to load feedback', 'error')
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/feed" className={styles.backLink}>← Back</Link>
        <h1 className={styles.title}>My Feedback</h1>
        <p className={styles.subtitle}>
          View your submitted feedback and replies from our team
        </p>
      </header>

      {loading ? (
        <div className={styles.loading}>Loading your feedback...</div>
      ) : feedback.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>💬</div>
          <h3>No feedback yet</h3>
          <p>When you submit feedback using the feedback button, it will appear here along with any replies from our team.</p>
        </div>
      ) : (
        <div className={styles.feedbackList}>
          {feedback.map(item => (
            <div key={item.id} className={styles.feedbackCard}>
              <div className={styles.cardHeader}>
                <span className={`${styles.typeBadge} ${styles[item.feedback_type]}`}>
                  {item.feedback_type}
                </span>
                <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                  {STATUS_LABELS[item.status] || item.status}
                </span>
                <span className={styles.date}>{formatDate(item.created_at)}</span>
              </div>

              <div className={styles.message}>
                {item.message}
              </div>

              {item.attachment_url && (
                <div className={styles.attachment}>
                  {item.attachment_url.includes('video') ? (
                    <video src={item.attachment_url} controls className={styles.attachmentMedia} />
                  ) : (
                    <img src={item.attachment_url} alt="Attachment" className={styles.attachmentMedia} />
                  )}
                </div>
              )}

              {item.admin_reply && (
                <div className={styles.replySection}>
                  <div className={styles.replyHeader}>
                    <span className={styles.replyIcon}>💬</span>
                    <span className={styles.replyLabel}>Reply from Our Family Socials</span>
                    {item.admin_reply_at && (
                      <span className={styles.replyDate}>{formatDate(item.admin_reply_at)}</span>
                    )}
                  </div>
                  <div className={styles.replyContent}>
                    {item.admin_reply}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MyFeedback
