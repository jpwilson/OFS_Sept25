import { useState, useEffect, useCallback } from 'react'
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
    </div>
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

  // Media engagement state (likes only - comments removed for now)
  const [mediaStats, setMediaStats] = useState({}) // { mediaId: { like_count, is_liked } }
  const [likingMedia, setLikingMedia] = useState(null) // mediaId currently being liked/unliked

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
    </>
  )
}

export default ImageGallery
