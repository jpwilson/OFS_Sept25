/**
 * Cloudinary configuration
 * For video uploads and media optimization
 */

export const CLOUDINARY_CONFIG = {
  cloudName: 'dejjei389',
  uploadPreset: 'ofs-videos',

  // Upload settings
  maxFileSize: 500 * 1024 * 1024, // 500MB (allows testing trimmer, Cloudinary compresses to ~50-100MB)
  maxVideoDuration: 60, // 60 seconds

  // Video transformation settings for aggressive compression
  // Cloudinary compresses 400MB uploads to ~50-100MB stored
  videoTransformation: {
    quality: 'auto:low',      // Aggressive compression
    fetch_format: 'auto',     // Best format for browser
    video_codec: 'h264',      // Universal codec
    bit_rate: '1m',           // 1 Mbps (smaller files)
    fps: 30,                  // Limit framerate
  },

  // Folder structure
  folder: 'ofs/videos',
}

/**
 * Generate Cloudinary video URL with transformations
 * Applies aggressive compression: 720p max, low bitrate, H.264 codec
 *
 * @param {string} publicId - Cloudinary public ID
 * @param {object} options - Transformation options
 * @returns {string} - Transformed video URL
 */
export function getCloudinaryVideoUrl(publicId, options = {}) {
  const {
    quality = 'auto:low',      // Aggressive compression
    format = 'auto',            // Best format for browser
    width = 1280,               // Max 720p width
    height = 720,               // Max 720p height
    bitRate = '1m',             // 1 Mbps bitrate
    fps = 30,                   // Limit framerate
  } = options

  const transformations = [
    `q_${quality}`,             // Quality
    `f_${format}`,              // Format
    `w_${width}`,               // Max width
    `h_${height}`,              // Max height
    `c_limit`,                  // Don't upscale, only downscale
    `br_${bitRate}`,            // Bitrate
    `fps_${fps}`,               // Framerate
    'vc_h264',                  // H.264 codec (universal)
  ]

  const transformStr = transformations.join(',')

  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/video/upload/${transformStr}/${publicId}`
}

/**
 * Generate Cloudinary thumbnail URL for video
 *
 * @param {string} publicId - Cloudinary public ID
 * @returns {string} - Thumbnail image URL
 */
export function getCloudinaryThumbnail(publicId) {
  // Get frame at 1 second, 600px wide, auto quality/format
  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/video/upload/so_1,w_600,q_auto,f_auto/${publicId}.jpg`
}
