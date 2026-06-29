/**
 * Video utilities for metadata extraction, thumbnail generation, and
 * client-side compression/trimming via ffmpeg.wasm (replaces Cloudinary
 * server-side transcoding for the Cloudflare R2 migration).
 */

// Lazy singleton — ffmpeg.wasm core is ~30MB, loaded once and reused.
let ffmpegPromise = null

async function getFfmpeg() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg')
      const { toBlobURL } = await import('@ffmpeg/util')
      const ffmpeg = new FFmpeg()
      const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
      await ffmpeg.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      return ffmpeg
    })()
  }
  return ffmpegPromise
}

/**
 * Compress (and optionally trim) a video in the browser.
 * Re-encodes to H.264 ≤720p, ~1Mbps, 30fps, AAC audio, faststart for web.
 *
 * @param {File} file - source video
 * @param {object} opts - { startTime, endTime, onProgress }
 * @returns {Promise<Blob>} compressed MP4 blob
 */
export async function compressVideo(file, { startTime, endTime, onProgress } = {}) {
  const ffmpeg = await getFfmpeg()
  const { fetchFile } = await import('@ffmpeg/util')

  // Cap the longest vertical dimension at 720 without upscaling; keep even dims.
  let { width, height } = await getVideoMetadata(file)
  if (height > 720) {
    width = Math.round((width * 720) / height)
    height = 720
  }
  width = Math.max(2, Math.round(width / 2) * 2)
  height = Math.max(2, Math.round(height / 2) * 2)

  const progressHandler = ({ progress }) => {
    if (onProgress) onProgress(Math.max(0, Math.min(100, Math.round(progress * 100))))
  }
  ffmpeg.on('progress', progressHandler)

  try {
    await ffmpeg.writeFile('input', await fetchFile(file))
    const args = ['-i', 'input']
    if (startTime != null && endTime != null) {
      // After -i for frame-accurate trim during re-encode
      args.push('-ss', String(startTime), '-to', String(endTime))
    }
    args.push(
      '-vf', `scale=${width}:${height}`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '1M', '-maxrate', '1.4M', '-bufsize', '2M',
      '-r', '30', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      'output.mp4',
    )
    await ffmpeg.exec(args)
    const data = await ffmpeg.readFile('output.mp4')
    return new Blob([data.buffer], { type: 'video/mp4' })
  } finally {
    ffmpeg.off('progress', progressHandler)
    try {
      await ffmpeg.deleteFile('input')
      await ffmpeg.deleteFile('output.mp4')
    } catch {
      /* best-effort cleanup */
    }
  }
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
