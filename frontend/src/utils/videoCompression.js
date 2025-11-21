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
      // Use jsdelivr CDN which is more reliable
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm'

      await ffmpegInstance.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })

      console.log('FFmpeg loaded successfully')
      ffmpegLoaded = true
    } catch (error) {
      console.error('Failed to load FFmpeg:', error)

      // Try fallback with direct URLs (no toBlobURL)
      try {
        console.log('Trying fallback FFmpeg loading...')
        await ffmpegInstance.load({
          coreURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
          wasmURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
        })
        console.log('FFmpeg loaded via fallback')
        ffmpegLoaded = true
      } catch (fallbackError) {
        console.error('Fallback FFmpeg loading also failed:', fallbackError)
        throw new Error('Failed to initialize video processor. Please check your internet connection.')
      }
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

    // If video is already low quality (below 720p) or small file, skip compression
    if (metadata.height <= 720 && metadata.width <= 1280) {
      console.log('Video already at acceptable quality, skipping compression')
      if (onProgress) onProgress(100)
      return file
    }

    // If file is already small, skip compression
    if (file.size < 50 * 1024 * 1024) { // < 50MB
      console.log('Video already small enough, skipping compression')
      if (onProgress) onProgress(100)
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

    // Compress to 720p H.264 (or 480p for very large files)
    // Target: Keep under 50MB for Supabase storage limit
    // -vf scale: Scale to 720p max (maintains aspect ratio)
    // -c:v libx264: Use H.264 codec
    // -crf 28: Quality level (higher = more compression, target 50MB)
    // -preset fast: Faster encoding, good compression
    // -maxrate 2M: Max bitrate 2 Mbps (~15MB per minute)
    // -bufsize 4M: Buffer size
    // -c:a aac: Audio codec
    // -b:a 96k: Lower audio bitrate to save space
    await ffmpeg.exec([
      '-i', inputName,
      '-vf', 'scale=trunc(min(iw\\,1280)/2)*2:trunc(min(ih\\,720)/2)*2',
      '-c:v', 'libx264',
      '-crf', '28',
      '-preset', 'fast',
      '-maxrate', '2M',
      '-bufsize', '4M',
      '-c:a', 'aac',
      '-b:a', '96k',
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

    // Check if compressed file is still too large
    const compressedSizeMB = (blob.size / (1024 * 1024)).toFixed(1)
    console.log(`Compression complete: ${(file.size / (1024 * 1024)).toFixed(1)}MB → ${compressedSizeMB}MB`)

    if (blob.size > 50 * 1024 * 1024) {
      console.warn(`Compressed video is still ${compressedSizeMB}MB (over 50MB limit)`)
      throw new Error(`Video is still ${compressedSizeMB}MB after compression. Please trim the video to be shorter, or record at a lower quality.`)
    }

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
 * 2. Compress video (or skip if FFmpeg unavailable)
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

    // Try to compress video, fallback to original if FFmpeg fails
    let compressedVideo = file
    let compressionSkipped = false

    try {
      compressedVideo = await compressVideo(file, (progress) => {
        if (onCompressionProgress) onCompressionProgress(progress)
        // Overall progress: 20% + (80% * compression progress)
        if (onOverallProgress) onOverallProgress(20 + Math.round(progress * 0.8))
      })
    } catch (compressionError) {
      console.warn('Video compression failed, uploading original:', compressionError)
      compressionSkipped = true
      // Use original file
      compressedVideo = file
      if (onCompressionProgress) onCompressionProgress(100)
      if (onOverallProgress) onOverallProgress(100)
    }

    if (onOverallProgress) onOverallProgress(100)

    return {
      compressedVideo,
      thumbnail,
      metadata,
      originalSize: file.size,
      compressedSize: compressedVideo.size,
      compressionSkipped, // Flag to notify user
    }
  } catch (error) {
    console.error('Video processing failed:', error)
    throw error
  }
}
