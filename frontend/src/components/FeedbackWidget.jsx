import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import apiService from '../services/api'
import styles from './FeedbackWidget.module.css'

const MAX_VIDEO_DURATION = 20 // seconds
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function FeedbackWidget() {
  const [showMenu, setShowMenu] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState('bug')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)
  const [attachment, setAttachment] = useState(null) // { file, preview, type }
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const fileInputRef = useRef(null)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  // Check if running as installed PWA (hide "Install App" if so)
  const isInstalledPWA = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Listen for open-feedback event from hamburger menu
  useEffect(() => {
    const handleOpenFeedback = () => {
      setShowMenu(false)
      setIsOpen(true)
    }
    window.addEventListener('open-feedback', handleOpenFeedback)
    return () => window.removeEventListener('open-feedback', handleOpenFeedback)
  }, [])

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  // Clean up preview URL when attachment changes
  useEffect(() => {
    return () => {
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview)
      }
    }
  }, [attachment])

  const checkVideoDuration = (file) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src)
        if (video.duration > MAX_VIDEO_DURATION) {
          reject(new Error(`Video must be ${MAX_VIDEO_DURATION} seconds or less (yours is ${Math.round(video.duration)}s)`))
        } else {
          resolve(video.duration)
        }
      }
      video.onerror = () => reject(new Error('Could not load video'))
      video.src = URL.createObjectURL(file)
    })
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`)
      return
    }

    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')

    if (!isVideo && !isImage) {
      setError('Please select an image or video file')
      return
    }

    // Check video duration
    if (isVideo) {
      try {
        await checkVideoDuration(file)
      } catch (err) {
        setError(err.message)
        return
      }
    }

    setAttachment({
      file,
      preview: URL.createObjectURL(file),
      type: isVideo ? 'video' : 'image'
    })
  }

  const removeAttachment = () => {
    if (attachment?.preview) {
      URL.revokeObjectURL(attachment.preview)
    }
    setAttachment(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadAttachment = async (file) => {
    const { CLOUDINARY_CONFIG } = await import('../config/cloudinary.js')
    const isVideo = file.type.startsWith('video/')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', isVideo ? CLOUDINARY_CONFIG.videoUploadPreset : CLOUDINARY_CONFIG.imageUploadPreset)
    formData.append('folder', isVideo ? 'ofs/feedback-videos' : 'ofs/feedback-images')

    const resourceType = isVideo ? 'video' : 'image'
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload`

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error('Failed to upload attachment')
    }

    const result = await response.json()
    return result.secure_url
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (message.trim().length < 10) {
      setError('Please provide more detail (at least 10 characters)')
      return
    }

    setIsSubmitting(true)

    try {
      let attachmentUrl = null

      // Upload attachment if present
      if (attachment?.file) {
        setUploadingAttachment(true)
        try {
          attachmentUrl = await uploadAttachment(attachment.file)
        } catch (uploadErr) {
          setError('Failed to upload attachment. Please try again.')
          setIsSubmitting(false)
          setUploadingAttachment(false)
          return
        }
        setUploadingAttachment(false)
      }

      await apiService.submitFeedback({
        feedback_type: feedbackType,
        message: message.trim(),
        page_url: window.location.href,
        screen_size: `${window.innerWidth}x${window.innerHeight}`,
        is_mobile: isMobile,
        attachment_url: attachmentUrl
      })

      setSubmitted(true)
      setMessage('')
      removeAttachment()

      // Reset after showing success
      setTimeout(() => {
        setSubmitted(false)
        setIsOpen(false)
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
      setUploadingAttachment(false)
    }
  }

  return (
    <>
      {/* Floating button - desktop only (hidden when hamburger menu appears) */}
      {!isMobile && (
        <div className={styles.floatingContainer} ref={menuRef}>
          <button
            className={`${styles.floatingButton} ${(isOpen || showMenu) ? styles.hidden : ''}`}
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Help menu"
            title="Help"
          >
            <span className={styles.feedbackIcon}>?</span>
          </button>

          {showMenu && (
            <div className={styles.helpMenu}>
              <button
                className={styles.helpMenuItem}
                onClick={() => { setShowMenu(false); setIsOpen(true) }}
              >
                Send Feedback
              </button>
              <button
                className={styles.helpMenuItem}
                onClick={() => { setShowMenu(false); navigate('/blog') }}
              >
                What's New
              </button>
              <button
                className={styles.helpMenuItem}
                onClick={() => { setShowMenu(false); navigate('/faq') }}
              >
                FAQ
              </button>
              <button
                className={styles.helpMenuItem}
                onClick={() => {
                  setShowMenu(false)
                  if (isInstalledPWA) {
                    navigate('/faq')
                  } else {
                    window.dispatchEvent(new Event('show-install-prompt'))
                  }
                }}
              >
                {isInstalledPWA ? 'Install App (FAQ)' : 'Install App'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Feedback panel */}
      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)}>
          <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.header}>
              <h3>Send Feedback</h3>
              <button
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {submitted ? (
              <div className={styles.success}>
                <span className={styles.successIcon}>✓</span>
                <p>Thanks for your feedback!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.typeSelector}>
                  <button
                    type="button"
                    className={`${styles.typeButton} ${feedbackType === 'bug' ? styles.active : ''}`}
                    onClick={() => setFeedbackType('bug')}
                  >
                    🐛 Bug
                  </button>
                  <button
                    type="button"
                    className={`${styles.typeButton} ${feedbackType === 'feature' ? styles.active : ''}`}
                    onClick={() => setFeedbackType('feature')}
                  >
                    💡 Idea
                  </button>
                  <button
                    type="button"
                    className={`${styles.typeButton} ${feedbackType === 'general' ? styles.active : ''}`}
                    onClick={() => setFeedbackType('general')}
                  >
                    💬 Other
                  </button>
                </div>

                <textarea
                  className={styles.textarea}
                  placeholder={
                    feedbackType === 'bug'
                      ? "What went wrong? Please describe what you were trying to do..."
                      : feedbackType === 'feature'
                      ? "What feature would you like to see?"
                      : "Share your thoughts..."
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={5000}
                />

                {/* Attachment section */}
                <div className={styles.attachmentSection}>
                  {attachment ? (
                    <div className={styles.attachmentPreview}>
                      {attachment.type === 'video' ? (
                        <video src={attachment.preview} className={styles.previewMedia} controls />
                      ) : (
                        <img src={attachment.preview} alt="Attachment" className={styles.previewMedia} />
                      )}
                      <button
                        type="button"
                        className={styles.removeAttachment}
                        onClick={removeAttachment}
                        aria-label="Remove attachment"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className={styles.attachButton}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileSelect}
                        className={styles.fileInput}
                      />
                      <span className={styles.attachIcon}>📎</span>
                      <span>Add screenshot or video (max 20s)</span>
                    </label>
                  )}
                </div>

                {error && <p className={styles.error}>{error}</p>}

                <div className={styles.footer}>
                  <span className={styles.charCount}>
                    {message.length}/5000
                  </span>
                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isSubmitting || message.trim().length < 10}
                  >
                    {uploadingAttachment ? 'Uploading...' : isSubmitting ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default FeedbackWidget
