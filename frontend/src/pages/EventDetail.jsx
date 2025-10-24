import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './EventDetail.module.css'
import apiService from '../services/api'
import { mockEventDetails } from '../data/mockEvents'

function EventDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [likeStats, setLikeStats] = useState({ like_count: 0, is_liked: false, recent_likes: [] })
  const [showAllLikes, setShowAllLikes] = useState(false)
  const [allLikes, setAllLikes] = useState([])

  useEffect(() => {
    loadEvent()
    loadComments()
    if (user) {
      loadLikes()
    }
  }, [id, user])

  async function loadEvent() {
    const data = await apiService.getEvent(id)
    if (!data) {
      // Use mock data if API fails
      setEvent(getMockEvent(id))
    } else {
      setEvent(data)
    }
    setLoading(false)
  }

  function getMockEvent(eventId) {
    return mockEventDetails[eventId] || mockEventDetails[1]
  }

  function formatDateRange(start, end) {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const options = { month: 'long', day: 'numeric', year: 'numeric' }

    if (start === end || !end) {
      return startDate.toLocaleDateString('en-US', options)
    }

    const startMonth = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    return `${startMonth} - ${endDate.toLocaleDateString('en-US', options)}`
  }

  async function loadComments() {
    const data = await apiService.getComments(id)
    setComments(data)
  }

  async function loadLikes() {
    const data = await apiService.getLikes(id)
    setLikeStats(data)
  }

  async function handleLikeToggle() {
    if (!user) return

    try {
      if (likeStats.is_liked) {
        await apiService.unlikeEvent(id)
      } else {
        await apiService.likeEvent(id)
      }
      loadLikes()
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  async function handleCommentSubmit(e) {
    e.preventDefault()
    if (!newComment.trim() || commentLoading) return

    setCommentLoading(true)
    try {
      await apiService.createComment(id, newComment.trim())
      setNewComment('')
      loadComments()
    } catch (error) {
      console.error('Error creating comment:', error)
    }
    setCommentLoading(false)
  }

  async function handleDeleteComment(commentId) {
    if (!confirm('Delete this comment?')) return

    try {
      await apiService.deleteComment(id, commentId)
      loadComments()
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  async function handleShowAllLikes() {
    if (!showAllLikes) {
      const data = await apiService.getAllLikes(id)
      setAllLikes(data)
    }
    setShowAllLikes(!showAllLikes)
  }

  function formatCommentDate(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  if (!event) {
    return <div className={styles.notFound}>Event not found</div>
  }

  return (
    <div className={styles.container}>
      <div
        className={styles.heroImage}
        style={{ backgroundImage: `url(${event.cover_image_url})` }}
      >
        <div className={styles.heroOverlay}>
          <h1 className={styles.title}>{event.title}</h1>
          <div className={styles.meta}>
            <Link to={`/profile/${event.author_username}`} className={styles.author}>
              <div className={styles.avatar}></div>
              <span>{event.author_full_name || event.author_username}</span>
            </Link>
            <span>·</span>
            <span>{formatDateRange(event.start_date, event.end_date)}</span>
            <span>·</span>
            <span>{event.location_name}</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {event.content_blocks && event.content_blocks.map((block, index) => {
          if (block.type === 'text') {
            return (
              <p key={index} className={styles.text}>
                {block.content}
              </p>
            )
          }
          if (block.type === 'image') {
            return (
              <div key={index} className={styles.imageBlock}>
                <div
                  className={styles.image}
                  style={{ backgroundImage: `url(${block.media_url})` }}
                ></div>
                {block.caption && (
                  <div className={styles.caption}>{block.caption}</div>
                )}
              </div>
            )
          }
          return null
        })}

        {(!event.content_blocks || event.content_blocks.length === 0) && (
          <p className={styles.text}>{event.description}</p>
        )}
      </div>

      <div className={styles.interactions}>
        <div className={styles.likeSection}>
          <button
            className={`${styles.likeButton} ${likeStats.is_liked ? styles.liked : ''}`}
            onClick={handleLikeToggle}
            disabled={!user}
          >
            <span className={styles.heartIcon}>{likeStats.is_liked ? '♥' : '♡'}</span>
            <span>{likeStats.like_count} {likeStats.like_count === 1 ? 'like' : 'likes'}</span>
          </button>

          {likeStats.like_count > 0 && (
            <div className={styles.likesPreview}>
              <span>
                Liked by{' '}
                {likeStats.recent_likes.slice(0, 3).map((like, index) => (
                  <span key={like.id}>
                    {index > 0 && ', '}
                    <Link to={`/profile/${like.username}`} className={styles.likerLink}>
                      {like.full_name || like.username}
                    </Link>
                  </span>
                ))}
                {likeStats.like_count > 3 && (
                  <span>
                    {' '}and{' '}
                    <button onClick={handleShowAllLikes} className={styles.showMoreLink}>
                      {likeStats.like_count - 3} others
                    </button>
                  </span>
                )}
              </span>
            </div>
          )}

          {showAllLikes && (
            <div className={styles.likesModal}>
              <div className={styles.likesModalContent}>
                <div className={styles.likesModalHeader}>
                  <h3>Likes</h3>
                  <button onClick={() => setShowAllLikes(false)} className={styles.closeButton}>×</button>
                </div>
                <div className={styles.likesList}>
                  {allLikes.map(like => (
                    <Link
                      key={like.id}
                      to={`/profile/${like.username}`}
                      className={styles.likeItem}
                      onClick={() => setShowAllLikes(false)}
                    >
                      <div className={styles.likeAvatar}>
                        {(like.full_name || like.username).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.likeName}>{like.full_name || like.username}</div>
                        <div className={styles.likeUsername}>@{like.username}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.commentsSection}>
        <h3 className={styles.commentsTitle}>Comments ({comments.length})</h3>

        {user ? (
          <form className={styles.commentForm} onSubmit={handleCommentSubmit}>
            <textarea
              className={styles.commentInput}
              placeholder="Share your thoughts..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            <button
              type="submit"
              className={styles.commentSubmit}
              disabled={!newComment.trim() || commentLoading}
            >
              {commentLoading ? 'Posting...' : 'Post Comment'}
            </button>
          </form>
        ) : (
          <div className={styles.loginPrompt}>
            <Link to="/login">Log in</Link> to leave a comment
          </div>
        )}

        <div className={styles.commentsList}>
          {comments.length === 0 ? (
            <p className={styles.noComments}>No comments yet. Be the first to share your thoughts!</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className={styles.comment}>
                <Link to={`/profile/${comment.author_username}`} className={styles.commentAvatar}>
                  {(comment.author_full_name || comment.author_username).charAt(0).toUpperCase()}
                </Link>
                <div className={styles.commentContent}>
                  <div className={styles.commentHeader}>
                    <Link to={`/profile/${comment.author_username}`} className={styles.commentAuthor}>
                      {comment.author_full_name || comment.author_username}
                    </Link>
                    <span className={styles.commentDate}>{formatCommentDate(comment.created_at)}</span>
                  </div>
                  <p className={styles.commentText}>{comment.content}</p>
                  {user && (user.id === comment.author_id || user.id === event.author_id) && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className={styles.deleteComment}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default EventDetail