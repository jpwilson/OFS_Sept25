import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Lightbox, { useLightboxState } from "yet-another-react-lightbox"
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails"
import Slideshow from "yet-another-react-lightbox/plugins/slideshow"
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen"
import Zoom from "yet-another-react-lightbox/plugins/zoom"
import Captions from "yet-another-react-lightbox/plugins/captions"
import Video from "yet-another-react-lightbox/plugins/video"
import "yet-another-react-lightbox/styles.css"
import "yet-another-react-lightbox/plugins/thumbnails.css"
import "yet-another-react-lightbox/plugins/captions.css"
import styles from './ImageGallery.module.css'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

// Custom engagement toolbar component - must be rendered inside lightbox
function EngagementToolbar({
  images,
  mediaStats,
  onLike,
  onToggleComments,
  showComments,
  user,
  likingMedia
}) {
  const { currentIndex } = useLightboxState()
  const currentMedia = images[currentIndex]
  const currentMediaId = currentMedia?.id
  const stats = currentMediaId ? (mediaStats[currentMediaId] || { like_count: 0, comment_count: 0, is_liked: false }) : null

  if (!currentMediaId) return null

  return (
    <div className={styles.engagementToolbar}>
      <button
        type="button"
        className={`${styles.toolbarLikeBtn} ${stats?.is_liked ? styles.liked : ''}`}
        onClick={() => onLike(currentMediaId)}
        disabled={!user || likingMedia === currentMediaId}
        title={user ? (stats?.is_liked ? 'Unlike' : 'Like') : 'Login to like'}
      >
        <span className={styles.toolbarHeart}>{stats?.is_liked ? '♥' : '♡'}</span>
        {stats?.like_count > 0 && <span className={styles.toolbarCount}>{stats.like_count}</span>}
      </button>
      <button
        type="button"
        className={`${styles.toolbarBtn} ${showComments ? styles.active : ''}`}
        onClick={onToggleComments}
        title="Comments"
      >
        <span>💬</span>
        {stats?.comment_count > 0 && <span className={styles.toolbarCount}>{stats.comment_count}</span>}
      </button>
    </div>
  )
}

// Comments Panel Component
function CommentsPanel({
  comments,
  loading,
  user,
  newComment,
  setNewComment,
  onSubmit,
  onDelete,
  submitting,
  onClose
}) {
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return createPortal(
    <div className={styles.commentsOverlay}>
      <div className={styles.commentsPanel}>
        <div className={styles.commentsHeader}>
          <span>Comments</span>
          <button className={styles.closeComments} onClick={onClose}>✕</button>
        </div>

        <div className={styles.commentsList}>
          {loading ? (
            <div className={styles.loadingComments}>Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className={styles.noComments}>No comments yet. Be the first!</div>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className={styles.comment}>
                <div className={styles.commentHeader}>
                  <span className={styles.commentAuthor}>{comment.author_display_name || comment.author_username || 'User'}</span>
                  <span className={styles.commentDate}>{formatDate(comment.created_at)}</span>
                  {user && comment.author_id === user.id && (
                    <button
                      className={styles.deleteComment}
                      onClick={() => onDelete(comment.id)}
                      title="Delete comment"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className={styles.commentContent}>{comment.content}</div>
              </div>
            ))
          )}
        </div>

        {user ? (
          <form className={styles.commentForm} onSubmit={onSubmit}>
            <input
              type="text"
              className={styles.commentInput}
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={submitting}
            />
            <button
              type="submit"
              className={styles.submitComment}
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? '...' : 'Post'}
            </button>
          </form>
        ) : (
          <div className={styles.loginPrompt}>
            Log in to comment
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

function ImageGallery({
  images,
  initialIndex = 0,
  viewMode: controlledViewMode,
  onViewModeChange,
  lightboxOpen,
  lightboxIndex,
  onLightboxChange,
  showCaptions = false,
  enableEngagement = false  // New prop to enable per-media likes/comments
}) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(initialIndex)

  // Use external lightbox control if provided
  const actualOpen = lightboxOpen !== undefined ? lightboxOpen : open
  const actualIndex = lightboxIndex !== undefined ? lightboxIndex : index
  const [internalViewMode, setInternalViewMode] = useState('single') // 'single' or 'grid'

  // Use controlled viewMode if provided, otherwise use internal state
  const viewMode = controlledViewMode !== undefined ? controlledViewMode : internalViewMode
  const setViewMode = onViewModeChange || setInternalViewMode

  // Media engagement state
  const [mediaStats, setMediaStats] = useState({}) // { mediaId: { like_count, comment_count, is_liked } }
  const [likingMedia, setLikingMedia] = useState(null) // mediaId currently being liked/unliked

  // Comment state
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  // Get current media info for lightbox (moved up so it can be used in useEffect)
  const currentMedia = images[actualIndex]
  const currentMediaId = currentMedia?.id
  const currentMediaStats = currentMediaId ? (mediaStats[currentMediaId] || { like_count: 0, comment_count: 0, is_liked: false }) : null


  // Load batch media stats when component mounts or images change
  useEffect(() => {
    if (enableEngagement && images.length > 0) {
      loadBatchMediaStats()
    }
  }, [enableEngagement, images])

  const loadBatchMediaStats = async () => {
    const mediaIds = images
      .filter(img => img.id)
      .map(img => img.id)

    if (mediaIds.length === 0) return

    try {
      const stats = await api.getBatchMediaStats(mediaIds)
      const statsMap = {}
      stats.forEach(stat => {
        statsMap[stat.media_id] = {
          like_count: stat.like_count,
          comment_count: stat.comment_count,
          is_liked: stat.is_liked
        }
      })
      setMediaStats(statsMap)
    } catch (error) {
      console.error('Failed to load media stats:', error)
    }
  }

  const handleLikeMedia = async (mediaId) => {
    if (!user || likingMedia) return

    setLikingMedia(mediaId)
    const currentStats = mediaStats[mediaId] || { like_count: 0, comment_count: 0, is_liked: false }

    try {
      if (currentStats.is_liked) {
        await api.unlikeMedia(mediaId)
        setMediaStats(prev => ({
          ...prev,
          [mediaId]: {
            ...currentStats,
            like_count: Math.max(0, currentStats.like_count - 1),
            is_liked: false
          }
        }))
      } else {
        await api.likeMedia(mediaId)
        setMediaStats(prev => ({
          ...prev,
          [mediaId]: {
            ...currentStats,
            like_count: currentStats.like_count + 1,
            is_liked: true
          }
        }))
      }
    } catch (error) {
      console.error('Failed to toggle media like:', error)
    } finally {
      setLikingMedia(null)
    }
  }

  // Load comments for current media
  const loadComments = async (mediaId) => {
    if (!mediaId) return
    setLoadingComments(true)
    try {
      const commentsData = await api.getMediaComments(mediaId)
      setComments(commentsData || [])
    } catch (error) {
      console.error('Failed to load comments:', error)
      setComments([])
    } finally {
      setLoadingComments(false)
    }
  }

  // Handle toggling comments panel
  const handleToggleComments = () => {
    if (!showComments && currentMediaId) {
      loadComments(currentMediaId)
    }
    setShowComments(!showComments)
  }

  // Handle submitting a new comment
  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || !currentMediaId || submittingComment) return

    setSubmittingComment(true)
    try {
      const comment = await api.createMediaComment(currentMediaId, newComment.trim())
      if (comment) {
        setComments(prev => [...prev, comment])
        setNewComment('')
        // Update comment count in stats
        setMediaStats(prev => ({
          ...prev,
          [currentMediaId]: {
            ...prev[currentMediaId],
            comment_count: (prev[currentMediaId]?.comment_count || 0) + 1
          }
        }))
      }
    } catch (error) {
      console.error('Failed to create comment:', error)
    } finally {
      setSubmittingComment(false)
    }
  }

  // Handle deleting a comment
  const handleDeleteComment = async (commentId) => {
    if (!currentMediaId) return

    try {
      await api.deleteMediaComment(currentMediaId, commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
      // Update comment count in stats
      setMediaStats(prev => ({
        ...prev,
        [currentMediaId]: {
          ...prev[currentMediaId],
          comment_count: Math.max(0, (prev[currentMediaId]?.comment_count || 0) - 1)
        }
      }))
    } catch (error) {
      console.error('Failed to delete comment:', error)
    }
  }

  // Close comments panel when lightbox closes
  useEffect(() => {
    if (!actualOpen) {
      setShowComments(false)
      setComments([])
      setNewComment('')
    }
  }, [actualOpen])

  // Reload comments when switching images (if comments panel is open)
  useEffect(() => {
    if (showComments && currentMediaId) {
      loadComments(currentMediaId)
    }
  }, [currentMediaId, showComments])

  // Helper to get full URL or extract full size from image object
  const getFullUrl = (img) => {
    if (typeof img === 'string') {
      // If it's already a string URL, try to convert medium/thumbnail to full
      return img.replace('/medium/', '/full/').replace('/thumbnails/', '/full/')
    }
    // New format: { src, caption, id, alt }
    if (img.src) {
      return img.src.replace('/medium/', '/full/').replace('/thumbnails/', '/full/')
    }
    return img.urls?.full || img.url || img
  }

  // Helper to get thumbnail URL
  const getThumbnailUrl = (img) => {
    if (typeof img === 'string') {
      // If it's already a string URL, try to convert to thumbnail
      return img.replace('/medium/', '/thumbnails/').replace('/full/', '/thumbnails/')
    }
    // New format: { src, caption, id, alt }
    if (img.src) {
      return img.src.replace('/medium/', '/thumbnails/').replace('/full/', '/thumbnails/')
    }
    return img.urls?.thumbnail || img.url || img
  }

  // Check if any images have captions
  const hasCaptions = images.some(img => img.caption)

  // Convert images and videos to lightbox format (use full size for lightbox)
  const slides = images.map(item => {
    const isVideo = item.type === 'video'

    if (isVideo) {
      // Video slide
      return {
        type: 'video',
        width: 1920,
        height: 1080,
        sources: [
          {
            src: item.src,
            type: 'video/mp4'
          }
        ],
        description: item.caption || undefined
      }
    } else {
      // Image slide
      return {
        src: getFullUrl(item),
        alt: typeof item === 'object' ? (item.alt || item.caption || '') : '',
        description: typeof item === 'object' && item.caption ? item.caption : undefined
      }
    }
  })

  const openLightbox = (imageIndex) => {
    if (onLightboxChange) {
      onLightboxChange({ open: true, index: imageIndex })
    } else {
      setIndex(imageIndex)
      setOpen(true)
    }
  }

  const closeLightbox = () => {
    if (onLightboxChange) {
      onLightboxChange({ open: false, index: 0 })
    } else {
      setOpen(false)
    }
  }

  if (images.length === 0) {
    return null
  }

  return (
    <>
      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className={styles.grid}>
          {images.map((item, idx) => {
            const isVideo = item.type === 'video'
            const mediaId = item.id
            const stats = mediaId ? (mediaStats[mediaId] || { like_count: 0, comment_count: 0, is_liked: false }) : null

            return (
              <div
                key={idx}
                className={styles.gridItem}
                onClick={() => openLightbox(idx)}
                style={{
                  backgroundImage: `url(${getThumbnailUrl(item)})`
                }}
              >
                {/* Stats overlay - only shows when there's actual engagement */}
                {enableEngagement && stats && mediaId && (stats.like_count > 0 || stats.comment_count > 0) && (
                  <div className={styles.statsOverlay}>
                    {stats.like_count > 0 && (
                      <span className={styles.statItem}>
                        <span className={styles.statIcon}>♥</span>
                        <span className={styles.statCount}>{stats.like_count}</span>
                      </span>
                    )}
                    {stats.comment_count > 0 && (
                      <span className={styles.statItem}>
                        <span className={styles.statIcon}>💬</span>
                        <span className={styles.statCount}>{stats.comment_count}</span>
                      </span>
                    )}
                  </div>
                )}

                <div className={styles.gridOverlay}>
                  {isVideo ? (
                    // Video play icon
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  ) : (
                    // Image icon
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                    </svg>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Lightbox */}
      <Lightbox
        open={actualOpen}
        close={closeLightbox}
        slides={slides}
        index={actualIndex}
        plugins={[Video, Captions, Thumbnails, Slideshow, Fullscreen, Zoom]}
        video={{
          autoPlay: false,
          controls: true,
          playsInline: true
        }}
        captions={{
          showToggle: false,
          descriptionTextAlign: 'center',
          descriptionMaxLines: 3
        }}
        thumbnails={{
          position: "bottom",
          width: 120,
          height: 80,
          border: 0,
          gap: 16,
          padding: 0,
          showToggle: true
        }}
        slideshow={{
          autoplay: false,
          delay: 3000
        }}
        zoom={{
          maxZoomPixelRatio: 3,
          scrollToZoom: true
        }}
        carousel={{
          finite: false
        }}
        animation={{
          fade: 300
        }}
        controller={{
          closeOnBackdropClick: !enableEngagement
        }}
        on={{
          view: ({ index: currentIndex }) => {
            if (onLightboxChange) {
              onLightboxChange({ open: true, index: currentIndex })
            } else {
              setIndex(currentIndex)
            }
          }
        }}
        toolbar={{
          buttons: enableEngagement ? [
            <EngagementToolbar
              key="engagement"
              images={images}
              mediaStats={mediaStats}
              onLike={handleLikeMedia}
              onToggleComments={handleToggleComments}
              showComments={showComments}
              user={user}
              likingMedia={likingMedia}
            />,
            "slideshow",
            "fullscreen",
            "thumbnails",
            "zoom",
            "close"
          ] : undefined
        }}
        render={{
          buttonPrev: slides.length <= 1 ? () => null : undefined,
          buttonNext: slides.length <= 1 ? () => null : undefined
        }}
        styles={{
          container: { backgroundColor: "rgba(0, 0, 0, 0.95)" },
          thumbnailsContainer: { backgroundColor: "rgba(0, 0, 0, 0.8)" },
          captionsContainer: showCaptions ? {} : { display: 'none' }
        }}
      />

      {/* Comments Panel - rendered via portal above lightbox */}
      {actualOpen && showComments && enableEngagement && (
        <CommentsPanel
          comments={comments}
          loading={loadingComments}
          user={user}
          newComment={newComment}
          setNewComment={setNewComment}
          onSubmit={handleSubmitComment}
          onDelete={handleDeleteComment}
          submitting={submittingComment}
          onClose={() => setShowComments(false)}
        />
      )}
    </>
  )
}

export default ImageGallery
