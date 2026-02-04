/**
 * Cloudinary URL Transformation Utility
 *
 * This module provides helpers to request different image sizes from Cloudinary.
 * Instead of loading full-resolution images everywhere, we request appropriate sizes:
 *
 * - micro (100px): Gallery grid thumbnails, feed cards - loads instantly
 * - small (400px): Lightbox thumbnail strip - quick load
 * - medium (1200px): Lightbox main view - full quality for viewing
 * - original: Download/zoom - rarely needed
 *
 * WHY: An event with 100 images at 1200px each = ~50MB to load
 *      Same event with 100px thumbnails = ~300KB to load
 *      Users scroll quickly - don't waste bandwidth on images they don't view
 *
 * HOW: Cloudinary transforms images on-the-fly via URL parameters.
 *      First request generates the size, subsequent requests are cached.
 */

/**
 * Transform a Cloudinary URL to a specific size
 * @param {string} originalUrl - Original Cloudinary image URL
 * @param {'micro'|'small'|'medium'|'original'} size - Desired size
 * @returns {string} Transformed URL
 */
export function getImageUrl(originalUrl, size = 'medium') {
  // Return as-is if not a Cloudinary URL
  if (!originalUrl?.includes('cloudinary')) {
    return originalUrl
  }

  // Already has a transformation? Don't double-transform
  // Check if URL has transformation params after /upload/
  const uploadIndex = originalUrl.indexOf('/upload/')
  if (uploadIndex !== -1) {
    const afterUpload = originalUrl.substring(uploadIndex + 8)
    // If there's already a transformation (contains comma before the version/public_id)
    if (afterUpload.match(/^[a-z].*?,/i) && !afterUpload.startsWith('v')) {
      // URL already has transformations, return as-is for 'original'
      // or replace existing transformations
      if (size === 'original') {
        return originalUrl
      }
    }
  }

  const transforms = {
    // Grid thumbnails: 100px square, low quality, fast
    // Use c_fill to ensure consistent square aspect ratio
    micro: 'w_100,h_100,c_fill,q_auto:low,f_auto',

    // Lightbox thumbnail strip: 400px, maintain aspect
    small: 'w_400,c_limit,q_auto:low,f_auto',

    // Lightbox main view: 1200px (full stored size)
    medium: 'w_1200,c_limit,q_auto:good,f_auto',

    // Original - no transformation
    original: ''
  }

  const transform = transforms[size]

  // No transform needed for original
  if (!transform) {
    return originalUrl
  }

  // Insert transform after /upload/
  return originalUrl.replace('/upload/', `/upload/${transform}/`)
}

/**
 * Get video thumbnail URL from Cloudinary
 * @param {string} videoUrl - Original video URL
 * @param {'micro'|'small'|'medium'} size - Thumbnail size
 * @returns {string} Thumbnail image URL
 */
export function getVideoThumbnailUrl(videoUrl, size = 'small') {
  if (!videoUrl?.includes('cloudinary')) {
    return videoUrl
  }

  const transforms = {
    micro: 'w_100,h_100,c_fill,q_auto:low',
    small: 'w_400,c_limit,q_auto:low',
    medium: 'w_800,c_limit,q_auto:good'
  }

  const transform = transforms[size] || transforms.small

  // For videos, we need to:
  // 1. Change /video/upload/ to /video/upload/{transform}/
  // 2. Add so_1 to grab frame at 1 second
  // 3. Change extension to .jpg
  let thumbnailUrl = videoUrl
    .replace('/video/upload/', `/video/upload/so_1,${transform}/`)
    .replace(/\.[^.]+$/, '.jpg')

  return thumbnailUrl
}

/**
 * Preload an image at a specific size
 * Useful for preloading adjacent images in lightbox
 * @param {string} url - Original URL
 * @param {'micro'|'small'|'medium'} size - Size to preload
 */
export function preloadImage(url, size = 'medium') {
  const transformedUrl = getImageUrl(url, size)
  const img = new Image()
  img.src = transformedUrl
}

/**
 * Preload multiple images (e.g., for lightbox navigation)
 * @param {string[]} urls - Array of original URLs
 * @param {'micro'|'small'|'medium'} size - Size to preload
 */
export function preloadImages(urls, size = 'medium') {
  urls.forEach(url => preloadImage(url, size))
}
