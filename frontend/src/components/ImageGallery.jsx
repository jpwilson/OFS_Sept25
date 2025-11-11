import { useState } from 'react'
import Lightbox from "yet-another-react-lightbox"
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails"
import Slideshow from "yet-another-react-lightbox/plugins/slideshow"
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen"
import Zoom from "yet-another-react-lightbox/plugins/zoom"
import "yet-another-react-lightbox/styles.css"
import "yet-another-react-lightbox/plugins/thumbnails.css"
import styles from './ImageGallery.module.css'

function ImageGallery({ images, initialIndex = 0, viewMode: controlledViewMode, onViewModeChange }) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(initialIndex)
  const [internalViewMode, setInternalViewMode] = useState('single') // 'single' or 'grid'
  const [showCaptions, setShowCaptions] = useState(() => {
    // Load caption preference from localStorage
    const saved = localStorage.getItem('showImageCaptions')
    return saved === 'true'
  })

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

  // Toggle caption visibility
  const toggleCaptions = () => {
    const newValue = !showCaptions
    setShowCaptions(newValue)
    localStorage.setItem('showImageCaptions', newValue.toString())
  }

  // Check if any images have captions
  const hasCaptions = images.some(img => img.caption)

  // Convert images to lightbox format (use full size for lightbox)
  const slides = images.map(img => ({
    src: getFullUrl(img),
    alt: typeof img === 'object' ? (img.alt || img.caption || '') : '',
    title: showCaptions && img.caption ? img.caption : undefined
  }))

  const openLightbox = (imageIndex) => {
    setIndex(imageIndex)
    setOpen(true)
  }

  if (images.length === 0) {
    return null
  }

  return (
    <>
      {/* Grid View Toggle */}
      {images.length > 1 && (
        <div className={styles.controls}>
          <button
            className={`${styles.viewToggle} ${viewMode === 'grid' ? styles.active : ''}`}
            onClick={() => setViewMode(viewMode === 'grid' ? 'single' : 'grid')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/>
            </svg>
            {viewMode === 'grid' ? 'Hide Grid' : `View All ${images.length} Images`}
          </button>

          {/* Caption Toggle */}
          {hasCaptions && (
            <button
              className={`${styles.captionToggle} ${showCaptions ? styles.active : ''}`}
              onClick={toggleCaptions}
              title={showCaptions ? 'Hide captions' : 'Show captions'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3h18v18H3z"/>
                <path d="M3 17h18M7 21v-4M17 21v-4"/>
              </svg>
              {showCaptions ? 'Hide Captions' : 'Show Captions'}
            </button>
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className={styles.grid}>
          {images.map((img, idx) => (
            <div
              key={idx}
              className={styles.gridItem}
              onClick={() => openLightbox(idx)}
              style={{
                backgroundImage: `url(${getThumbnailUrl(img)})`
              }}
            >
              <div className={styles.gridOverlay}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Lightbox
        open={open}
        close={() => setOpen(false)}
        slides={slides}
        index={index}
        plugins={[Thumbnails, Slideshow, Fullscreen, Zoom]}
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
        animation={{
          fade: 300
        }}
        controller={{
          closeOnBackdropClick: true
        }}
        on={{
          view: ({ index: currentIndex }) => setIndex(currentIndex)
        }}
        render={{
          buttonPrev: slides.length <= 1 ? () => null : undefined,
          buttonNext: slides.length <= 1 ? () => null : undefined,
        }}
        styles={{
          container: { backgroundColor: "rgba(0, 0, 0, 0.95)" },
          thumbnailsContainer: { backgroundColor: "rgba(0, 0, 0, 0.8)" }
        }}
      />
    </>
  )
}

export default ImageGallery
