import { useState, useRef, useEffect } from 'react'
import styles from './VideoTrimmer.module.css'
import { useToast } from './Toast'

function VideoTrimmer({ isOpen, onClose, videoFile, onTrimComplete }) {
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoUrl, setVideoUrl] = useState(null)
  const videoRef = useRef(null)
  const { showToast } = useToast()

  // Load video file
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile)
      setVideoUrl(url)

      // Get video duration
      const video = document.createElement('video')
      video.src = url
      video.onloadedmetadata = () => {
        const dur = Math.floor(video.duration)
        setDuration(dur)
        setEndTime(Math.min(dur, 60)) // Auto-set to 60 seconds max
      }

      return () => URL.revokeObjectURL(url)
    }
  }, [videoFile])

  const trimmedDuration = endTime - startTime

  const handleStartChange = (e) => {
    const value = parseFloat(e.target.value)
    setStartTime(value)
    if (value >= endTime) {
      setEndTime(Math.min(value + 1, duration))
    }
  }

  const handleEndChange = (e) => {
    const value = parseFloat(e.target.value)
    setEndTime(value)
    if (value <= startTime) {
      setStartTime(Math.max(value - 1, 0))
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleSeek = (e) => {
    const value = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = value
      setCurrentTime(value)
    }
  }

  const handleTrim = () => {
    if (trimmedDuration > 60) {
      showToast('Video must be 60 seconds or less', 'error')
      return
    }

    // Return trim parameters to parent component
    // Cloudinary will handle the actual trimming server-side
    onTrimComplete({
      originalFile: videoFile,
      startTime,
      endTime,
      duration: trimmedDuration
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Trim Video</h2>
          <button onClick={onClose} className={styles.closeButton}>
            ×
          </button>
        </div>

        <div className={styles.message}>
          Videos must be max 60 seconds. Please trim to 60 seconds or less. Cloudinary will process the trimming automatically.
        </div>

        <div className={styles.content}>
          {videoUrl && (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                onTimeUpdate={handleTimeUpdate}
                className={styles.video}
              />

              <div className={styles.timeline}>
                <div className={styles.timelineHeader}>
                  <span>Duration: {trimmedDuration}s</span>
                  <span className={trimmedDuration > 60 ? styles.error : styles.success}>
                    {trimmedDuration <= 60 ? '✓' : '⚠️'} {trimmedDuration > 60 ? 'Too long' : 'Good'}
                  </span>
                </div>

                <div className={styles.sliderGroup}>
                  <label>
                    Start: {Math.floor(startTime)}s
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      step="0.1"
                      value={startTime}
                      onChange={handleStartChange}
                      className={styles.slider}
                    />
                  </label>

                  <label>
                    End: {Math.floor(endTime)}s
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      step="0.1"
                      value={endTime}
                      onChange={handleEndChange}
                      className={styles.slider}
                    />
                  </label>

                  <label>
                    Seek: {Math.floor(currentTime)}s
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      step="0.1"
                      value={currentTime}
                      onChange={handleSeek}
                      className={styles.slider}
                    />
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.footer}>
          <button
            onClick={onClose}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            onClick={handleTrim}
            className={styles.doneButton}
            disabled={trimmedDuration > 60}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default VideoTrimmer
