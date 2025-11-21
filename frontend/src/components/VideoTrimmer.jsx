import { useState, useRef, useEffect } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import styles from './VideoTrimmer.module.css'
import { useToast } from './Toast'

function VideoTrimmer({ isOpen, onClose, videoFile, onTrimComplete }) {
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false)
  const [videoUrl, setVideoUrl] = useState(null)
  const videoRef = useRef(null)
  const ffmpegRef = useRef(new FFmpeg())
  const { showToast } = useToast()

  // Load FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        const ffmpeg = ffmpegRef.current
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'

        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        })

        setFfmpegLoaded(true)
      } catch (error) {
        console.error('Error loading FFmpeg:', error)
        showToast('Failed to load video processor', 'error')
      }
    }

    if (isOpen && !ffmpegLoaded) {
      loadFFmpeg()
    }
  }, [isOpen, ffmpegLoaded, showToast])

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

  const handleTrim = async () => {
    if (!ffmpegLoaded) {
      showToast('Video processor not ready yet', 'error')
      return
    }

    if (trimmedDuration > 60) {
      showToast('Video must be 60 seconds or less', 'error')
      return
    }

    setIsProcessing(true)

    try {
      const ffmpeg = ffmpegRef.current

      // Write input file
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile))

      // Trim video
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-ss', startTime.toString(),
        '-t', trimmedDuration.toString(),
        '-c', 'copy', // Fast copy without re-encoding
        'output.mp4'
      ])

      // Read output file
      const data = await ffmpeg.readFile('output.mp4')
      const blob = new Blob([data.buffer], { type: 'video/mp4' })
      const trimmedFile = new File([blob], videoFile.name, { type: 'video/mp4' })

      onTrimComplete(trimmedFile)
      onClose()
    } catch (error) {
      console.error('Error trimming video:', error)
      showToast('Failed to trim video. Please try again.', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Trim Video</h2>
          <button onClick={onClose} className={styles.closeButton} disabled={isProcessing}>
            ×
          </button>
        </div>

        <div className={styles.message}>
          Videos must be max 60 seconds. Please trim to 60 seconds or less.
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
                      disabled={isProcessing}
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
                      disabled={isProcessing}
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
                      disabled={isProcessing}
                    />
                  </label>
                </div>
              </div>
            </>
          )}

          {!ffmpegLoaded && (
            <div className={styles.loading}>
              Loading video processor...
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            onClick={onClose}
            className={styles.cancelButton}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handleTrim}
            className={styles.doneButton}
            disabled={!ffmpegLoaded || trimmedDuration > 60 || isProcessing}
          >
            {isProcessing ? 'Trimming...' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default VideoTrimmer
