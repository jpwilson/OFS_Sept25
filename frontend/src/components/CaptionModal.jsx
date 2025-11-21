import { useState, useEffect } from 'react'
import styles from './CaptionModal.module.css'

/**
 * Modal for adding/editing image/video captions
 * Shows after media upload to optionally add a caption
 */
function CaptionModal({ isOpen, onClose, onSave, initialCaption = '', imageSrc, mediaType = 'image' }) {
  const [caption, setCaption] = useState(initialCaption)

  useEffect(() => {
    setCaption(initialCaption)
  }, [initialCaption, isOpen])

  const handleSave = () => {
    onSave(caption.trim())
    onClose()
  }

  const handleSkip = () => {
    onSave(null) // No caption
    onClose()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave()
    }
    if (e.key === 'Escape') {
      handleSkip()
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={handleSkip}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Add {mediaType === 'video' ? 'Video' : 'Image'} Caption (Optional)</h3>
          <button className={styles.closeButton} onClick={handleSkip}>
            ×
          </button>
        </div>

        {imageSrc && (
          <div className={styles.imagePreview}>
            {mediaType === 'video' ? (
              <video src={imageSrc} controls style={{ maxWidth: '100%', maxHeight: '300px' }} />
            ) : (
              <img src={imageSrc} alt="Preview" />
            )}
          </div>
        )}

        <div className={styles.body}>
          <textarea
            className={styles.textarea}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mediaType === 'video'
              ? "Describe this video (e.g., 'Kids playing at the beach')"
              : "Describe this image (e.g., 'Sunset over Table Mountain from our hotel room')"}
            autoFocus
            rows={3}
            maxLength={500}
          />
          <div className={styles.charCount}>
            {caption.length}/500 characters
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.skipButton} onClick={handleSkip}>
            Skip
          </button>
          <button className={styles.saveButton} onClick={handleSave}>
            {initialCaption ? 'Update Caption' : 'Add Caption'}
          </button>
        </div>

        <div className={styles.hint}>
          <small>
            Press <kbd>Cmd/Ctrl + Enter</kbd> to save, <kbd>Esc</kbd> to skip
          </small>
        </div>
      </div>
    </div>
  )
}

export default CaptionModal
