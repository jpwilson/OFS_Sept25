/**
 * Cloudinary configuration
 * For video uploads and media optimization
 */

export const CLOUDINARY_CONFIG = {
  cloudName: 'dejjei389',
  uploadPreset: 'ofs-videos',

  // Upload settings
  maxFileSize: 100 * 1024 * 1024, // 100MB (Cloudinary free tier limit)
  maxVideoDuration: 60, // 60 seconds

  // Video transformation settings
  // Cloudinary will automatically compress and optimize
  videoTransformation: {
    quality: 'auto',
    fetch_format: 'auto',
  },

  // Folder structure
  folder: 'ofs/videos',
}

/**
 * Generate Cloudinary video URL with transformations
 *
 * @param {string} publicId - Cloudinary public ID
 * @param {object} options - Transformation options
 * @returns {string} - Transformed video URL
 */
export function getCloudinaryVideoUrl(publicId, options = {}) {
  const {
    quality = 'auto',
    format = 'auto',
    width,
    height,
  } = options

  const transformations = []

  if (quality) transformations.push(`q_${quality}`)
  if (format) transformations.push(`f_${format}`)
  if (width) transformations.push(`w_${width}`)
  if (height) transformations.push(`h_${height}`)

  const transformStr = transformations.length > 0 ? `${transformations.join(',')}/` : ''

  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/video/upload/${transformStr}${publicId}`
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
