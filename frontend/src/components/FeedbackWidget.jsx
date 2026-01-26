import { useState, useEffect } from 'react'
import apiService from '../services/api'
import styles from './FeedbackWidget.module.css'

function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState('bug')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Listen for open-feedback event from hamburger menu
  useEffect(() => {
    const handleOpenFeedback = () => setIsOpen(true)
    window.addEventListener('open-feedback', handleOpenFeedback)
    return () => window.removeEventListener('open-feedback', handleOpenFeedback)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (message.trim().length < 10) {
      setError('Please provide more detail (at least 10 characters)')
      return
    }

    setIsSubmitting(true)

    try {
      await apiService.submitFeedback({
        feedback_type: feedbackType,
        message: message.trim(),
        page_url: window.location.href,
        screen_size: `${window.innerWidth}x${window.innerHeight}`,
        is_mobile: isMobile
      })

      setSubmitted(true)
      setMessage('')

      // Reset after showing success
      setTimeout(() => {
        setSubmitted(false)
        setIsOpen(false)
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating button - desktop only (hidden when hamburger menu appears) */}
      {!isMobile && (
        <button
          className={`${styles.floatingButton} ${isOpen ? styles.hidden : ''}`}
          onClick={() => setIsOpen(true)}
          aria-label="Send feedback"
          title="Send feedback"
        >
          <span className={styles.feedbackIcon}>?</span>
        </button>
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
                    {isSubmitting ? 'Sending...' : 'Send'}
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
