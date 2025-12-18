import { useState, useEffect } from 'react'
import Lightbox from "yet-another-react-lightbox"
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
  const [mediaLikes, setMediaLikes] = useState({}) // { mediaId: { like_count, is_liked } }
  const [showComments, setShowComments] = useState(false)
  const [mediaComments, setMediaComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [likingMedia, setLikingMedia] = useState(null) // mediaId currently being liked/unliked

  // Load batch media likes when component mounts or images change
  useEffect(() => {
    if (enableEngagement && images.length > 0) {
      loadBatchMediaLikes()
    }
  }, [enableEngagement, images])

  // Load comments when lightbox opens or index changes
  useEffect(() => {
    if (enableEngagement && actualOpen && showComments) {
      const currentMedia = images[actualIndex]
      if (currentMedia?.id) {
        loadMediaComments(currentMedia.id)
      }
    }
  }, [enableEngagement, actualOpen, actualIndex, showComments])

  const loadBatchMediaLikes = async () => {
    const mediaIds = images
      .filter(img => img.id)
      .map(img => img.id)

    if (mediaIds.length === 0) return

    try {
      const stats = await api.getBatchMediaLikes(mediaIds)
      const likesMap = {}
      stats.forEach(stat => {
        likesMap[stat.media_id] = {
          like_count: stat.like_count,
          is_liked: stat.is_liked
        }
      })
      setMediaLikes(likesMap)
    } catch (error) {
      console.error('Failed to load media likes:', error)
    }
  }

  const loadMediaComments = async (mediaId) => {
    setLoadingComments(true)
    try {
      const comments = await api.getMediaComments(mediaId)
      setMediaComments(comments)
    } catch (error) {
      console.error('Failed to load media comments:', error)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleLikeMedia = async (mediaId) => {
    if (!user || likingMedia) return

    setLikingMedia(mediaId)
    const currentLikes = mediaLikes[mediaId] || { like_count: 0, is_liked: false }

    try {
      if (currentLikes.is_liked) {
        await api.unlikeMedia(mediaId)
        setMediaLikes(prev => ({
          ...prev,
          [mediaId]: {
            like_count: Math.max(0, currentLikes.like_count - 1),
            is_liked: false
          }
        }))
      } else {
        await api.likeMedia(mediaId)
        setMediaLikes(prev => ({
          ...prev,
          [mediaId]: {
            like_count: currentLikes.like_count + 1,
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

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!user || !newComment.trim()) return

    const currentMedia = images[actualIndex]
    if (!currentMedia?.id) return

    try {
      const comment = await api.createMediaComment(currentMedia.id, newComment.trim())
      setMediaComments(prev => [...prev, comment])
      setNewComment('')
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  const handleDeleteComment = async (commentId) => {
    const currentMedia = images[actualIndex]
    if (!currentMedia?.id) return

    try {
      await api.deleteMediaComment(currentMedia.id, commentId)
      setMediaComments(prev => prev.filter(c => c.id !== commentId))
    } catch (error) {
      console.error('Failed to delete comment:', error)
    }
  }

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
    setShowComments(false) // Reset comments panel when opening
  }

  const closeLightbox = () => {
    if (onLightboxChange) {
      onLightboxChange({ open: false, index: 0 })
    } else {
      setOpen(false)
    }
    setShowComments(false)
    setMediaComments([])
  }

  if (images.length === 0) {
    return null
  }

  // Get current media info for lightbox
  const currentMedia = images[actualIndex]
  const currentMediaId = currentMedia?.id
  const currentMediaLikes = currentMediaId ? (mediaLikes[currentMediaId] || { like_count: 0, is_liked: false }) : null

  return (
    <>
      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className={styles.grid}>
          {images.map((item, idx) => {
            const isVideo = item.type === 'video'
            const mediaId = item.id
            const likes = mediaId ? (mediaLikes[mediaId] || { like_count: 0, is_liked: false }) : null

            return (
              <div
                key={idx}
                className={styles.gridItem}
                onClick={() => openLightbox(idx)}
                style={{
                  backgroundImage: `url(${getThumbnailUrl(item)})`
                }}
              >
                {/* Like count overlay (always visible if has likes) */}
                {enableEngagement && likes && likes.like_count > 0 && (
                  <div className={styles.likeOverlay}>
                    <span className={styles.likeIcon}>♥</span>
                    <span className={styles.likeCount}>{likes.like_count}</span>
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
          // Show/hide captions based on parent state
          finite: false
        }}
        animation={{
          fade: 300
        }}
        controller={{
          closeOnBackdropClick: true
        }}
        on={{
          view: ({ index: currentIndex }) => {
            if (onLightboxChange) {
              onLightboxChange({ open: true, index: currentIndex })
            } else {
              setIndex(currentIndex)
            }
            // Load comments for new slide if panel is open
            if (showComments && images[currentIndex]?.id) {
              loadMediaComments(images[currentIndex].id)
            }
          }
        }}
        render={{
          buttonPrev: slides.length <= 1 ? () => null : undefined,
          buttonNext: slides.length <= 1 ? () => null : undefined,
        }}
        styles={{
          container: { backgroundColor: "rgba(0, 0, 0, 0.95)" },
          thumbnailsContainer: { backgroundColor: "rgba(0, 0, 0, 0.8)" },
          captionsContainer: showCaptions ? {} : { display: 'none' }
        }}
      />

      {/* Lightbox Engagement Panel (renders outside lightbox for better control) */}
      {enableEngagement && actualOpen && currentMediaId && (
        <div
          className={`${styles.engagementPanel} ${showComments ? styles.panelExpanded : ''}`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Like and Comment buttons */}
          <div className={styles.engagementActions} onClick={(e) => e.stopPropagation()}>
            <button
              className={`${styles.engagementBtn} ${currentMediaLikes?.is_liked ? styles.liked : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                handleLikeMedia(currentMediaId)
              }}
              disabled={!user || likingMedia === currentMediaId}
              title={user ? (currentMediaLikes?.is_liked ? 'Unlike' : 'Like') : 'Login to like'}
            >
              <span className={styles.engagementIcon}>
                {currentMediaLikes?.is_liked ? '♥' : '♡'}
              </span>
              <span className={styles.engagementCount}>{currentMediaLikes?.like_count || 0}</span>
            </button>

            <button
              className={`${styles.engagementBtn} ${showComments ? styles.active : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setShowComments(!showComments)
                if (!showComments && currentMediaId) {
                  loadMediaComments(currentMediaId)
                }
              }}
              title="Comments"
            >
              <span className={styles.engagementIcon}>💬</span>
              <span className={styles.engagementCount}>{mediaComments.length}</span>
            </button>
          </div>

          {/* Comments Panel */}
          {showComments && (
            <div className={styles.commentsPanel} onClick={(e) => e.stopPropagation()}>
              <div className={styles.commentsHeader}>
                <span>Comments</span>
                <button
                  className={styles.closeComments}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowComments(false)
                  }}
                >
                  ✕
                </button>
              </div>

              <div className={styles.commentsList}>
                {loadingComments ? (
                  <div className={styles.loadingComments}>Loading...</div>
                ) : mediaComments.length === 0 ? (
                  <div className={styles.noComments}>No comments yet</div>
                ) : (
                  mediaComments.map(comment => (
                    <div key={comment.id} className={styles.comment}>
                      <div className={styles.commentHeader}>
                        <span className={styles.commentAuthor}>
                          {comment.author_display_name || comment.author_username}
                        </span>
                        <span className={styles.commentDate}>
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                        {user && user.id === comment.author_id && (
                          <button
                            className={styles.deleteComment}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteComment(comment.id)
                            }}
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
                <form className={styles.commentForm} onSubmit={(e) => {
                  e.stopPropagation()
                  handleAddComment(e)
                }}>
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Add a comment..."
                    className={styles.commentInput}
                    maxLength={1000}
                  />
                  <button
                    type="submit"
                    className={styles.submitComment}
                    disabled={!newComment.trim()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Post
                  </button>
                </form>
              ) : (
                <div className={styles.loginPrompt}>
                  Login to comment
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default ImageGallery
