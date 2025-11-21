import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpegInstance = null
let ffmpegLoaded = false

/**
 * Initialize FFmpeg instance (lazy loading)
 */
async function getFFmpeg() {
  if (ffmpegInstance && ffmpegLoaded) {
    return ffmpegInstance
  }

  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg()
  }

  if (!ffmpegLoaded) {
    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
      await ffmpegInstance.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      ffmpegLoaded = true
    } catch (error) {
      console.error('Failed to load FFmpeg:', error)
      throw new Error('Failed to initialize video processor')
    }
  }

  return ffmpegInstance
}

/**
 * Get video metadata (duration, dimensions, etc.)
 */
export async function getVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src)
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      })
    }

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src)
      reject(new Error('Failed to load video metadata'))
    }

    video.src = URL.createObjectURL(file)
  })
}

/**
 * Extract thumbnail from video (first frame)
 */
export async function extractThumbnail(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true

    video.onloadeddata = () => {
      // Seek to 0.5 seconds to avoid black frames
      video.currentTime = 0.5
    }

    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          window.URL.revokeObjectURL(video.src)
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to extract thumbnail'))
          }
        },
        'image/jpeg',
        0.8
      )
    }

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src)
      reject(new Error('Failed to extract thumbnail'))
    }

    video.src = URL.createObjectURL(file)
  })
}

/**
 * Compress video to 720p H.264 with progress tracking
 *
 * @param {File} file - Original video file
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<Blob>} - Compressed video blob
 */
export async function compressVideo(file, onProgress) {
  try {
    const ffmpeg = await getFFmpeg()

    // Get video metadata
    const metadata = await getVideoMetadata(file)

    // If video is already low quality (below 720p), skip compression
    if (metadata.height <= 720 && metadata.width <= 1280) {
      console.log('Video already at acceptable quality, skipping compression')
      return file
    }

    // Track progress
    ffmpeg.on('progress', ({ progress }) => {
      if (onProgress) {
        // FFmpeg progress is 0-1, convert to 0-100
        onProgress(Math.min(Math.round(progress * 100), 99))
      }
    })

    // Write input file to FFmpeg virtual filesystem
    const inputName = 'input.mp4'
    const outputName = 'output.mp4'
    await ffmpeg.writeFile(inputName, await fetchFile(file))

    // Compress to 720p H.264
    // -vf scale: Scale to 720p (maintains aspect ratio)
    // -c:v libx264: Use H.264 codec
    // -crf 23: Quality level (18-28, lower = better quality)
    // -preset medium: Encoding speed vs compression ratio
    // -c:a aac: Audio codec
    // -b:a 128k: Audio bitrate
    await ffmpeg.exec([
      '-i', inputName,
      '-vf', 'scale=trunc(min(iw\\,1280)/2)*2:trunc(min(ih\\,720)/2)*2',
      '-c:v', 'libx264',
      '-crf', '23',
      '-preset', 'medium',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart', // Enable streaming
      outputName
    ])

    // Read compressed file
    const data = await ffmpeg.readFile(outputName)

    // Clean up
    await ffmpeg.deleteFile(inputName)
    await ffmpeg.deleteFile(outputName)

    // Convert to Blob
    const blob = new Blob([data.buffer], { type: 'video/mp4' })

    if (onProgress) {
      onProgress(100)
    }

    return blob
  } catch (error) {
    console.error('Video compression failed:', error)
    throw new Error(`Compression failed: ${error.message}`)
  }
}

/**
 * Full video processing pipeline
 * 1. Extract thumbnail
 * 2. Compress video
 *
 * @param {File} file - Original video file
 * @param {Object} callbacks - Progress callbacks
 * @returns {Promise<Object>} - { compressedVideo, thumbnail, metadata }
 */
export async function processVideo(file, callbacks = {}) {
  const {
    onThumbnailProgress,
    onCompressionProgress,
    onOverallProgress,
  } = callbacks

  try {
    // Get metadata first
    if (onOverallProgress) onOverallProgress(5)
    const metadata = await getVideoMetadata(file)

    // Extract thumbnail
    if (onThumbnailProgress) onThumbnailProgress(0)
    if (onOverallProgress) onOverallProgress(10)
    const thumbnail = await extractThumbnail(file)
    if (onThumbnailProgress) onThumbnailProgress(100)
    if (onOverallProgress) onOverallProgress(20)

    // Compress video
    const compressedVideo = await compressVideo(file, (progress) => {
      if (onCompressionProgress) onCompressionProgress(progress)
      // Overall progress: 20% + (80% * compression progress)
      if (onOverallProgress) onOverallProgress(20 + Math.round(progress * 0.8))
    })

    if (onOverallProgress) onOverallProgress(100)

    return {
      compressedVideo,
      thumbnail,
      metadata,
      originalSize: file.size,
      compressedSize: compressedVideo.size,
    }
  } catch (error) {
    console.error('Video processing failed:', error)
    throw error
  }
}
