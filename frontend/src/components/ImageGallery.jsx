import { useState } from 'react'
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

function ImageGallery({ images, initialIndex = 0, viewMode: controlledViewMode, onViewModeChange, lightboxOpen, lightboxIndex, onLightboxChange, showCaptions = false }) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(initialIndex)

  // Use external lightbox control if provided
  const actualOpen = lightboxOpen !== undefined ? lightboxOpen : open
  const actualIndex = lightboxIndex !== undefined ? lightboxIndex : index
  const [internalViewMode, setInternalViewMode] = useState('single') // 'single' or 'grid'

  // Use controlled viewMode if provided, otherwise use internal state
  const viewMode = controlledViewMode !== undefined ? controlledViewMode : internalViewMode
  const setViewMode = onViewModeChange || setInternalViewMode

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
            return (
              <div
                key={idx}
                className={styles.gridItem}
                onClick={() => openLightbox(idx)}
                style={{
                  backgroundImage: `url(${getThumbnailUrl(item)})`
                }}
              >
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
    </>
  )
}

export default ImageGallery
