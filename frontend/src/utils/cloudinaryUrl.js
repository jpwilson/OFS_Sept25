/**
 * Image URL Transformation Utility
 *
 * Requests appropriately-sized images at delivery time instead of always
 * loading full resolution:
 *
 * - micro (100px): Gallery grid thumbnails, feed cards - loads instantly
 * - small (400px): Lightbox thumbnail strip - quick load
 * - medium (1200px): Lightbox main view - full quality for viewing
 * - original: Download/zoom - rarely needed
 *
 * Primary backend is now Cloudflare R2 + Cloudflare Image Resizing
 * (`/cdn-cgi/image/...`), which also serves auto WebP/AVIF (`format=auto`).
 * Legacy Cloudinary URLs are still transformed (the old way) during the
 * migration window so existing content keeps rendering. Supabase/other URLs
 * are returned unchanged.
 */

// R2 public host. Either a Cloudflare custom domain (media.ourfamilysocials.com)
// or the free pub-<hash>.r2.dev development URL.
const R2_DOMAIN = import.meta.env.VITE_R2_PUBLIC_DOMAIN || ''

// On-the-fly /cdn-cgi/image transforms only work behind a Cloudflare zone
// (a custom domain), NOT on r2.dev. When on r2.dev we serve the pre-generated
// fixed sizes (full/medium/thumbnails) instead — same UX, just no auto-WebP.
const R2_USE_TRANSFORMS = R2_DOMAIN && !R2_DOMAIN.includes('r2.dev')

// Cloudflare /cdn-cgi/image option strings per size (custom-domain path)
const R2_SIZES = {
  micro: 'width=100,height=100,fit=cover,quality=70,format=auto',
  small: 'width=400,fit=scale-down,quality=75,format=auto',
  medium: 'width=1200,fit=scale-down,quality=82,format=auto',
  original: null,
}

// Map a requested size to one of the 3 pre-generated R2 objects (r2.dev path)
const R2_SIZE_FOLDER = {
  micro: 'thumbnails',
  small: 'thumbnails',
  medium: 'medium',
  original: 'full',
}

function r2Deliver(url, size) {
  return R2_USE_TRANSFORMS ? r2Transform(url, size) : r2PickSize(url, size)
}

/**
 * Custom-domain path: build a Cloudflare image-resizing URL.
 * https://media.../full/uuid.jpg -> https://media.../cdn-cgi/image/<opts>/full/uuid.jpg
 */
function r2Transform(url, size) {
  const opts = R2_SIZES[size]
  if (!opts) return url // 'original'
  if (url.includes('/cdn-cgi/image/')) return url // don't double-transform
  const path = url.split(`${R2_DOMAIN}/`)[1]
  if (!path) return url
  return `https://${R2_DOMAIN}/cdn-cgi/image/${opts}/${path}`
}

/**
 * r2.dev path: swap to the matching pre-generated size object.
 * https://pub-x.r2.dev/full/uuid.jpg -> https://pub-x.r2.dev/thumbnails/uuid.jpg
 */
function r2PickSize(url, size) {
  const folder = R2_SIZE_FOLDER[size] || 'medium'
  return url.replace(/\/(full|medium|thumbnails)\//, `/${folder}/`)
}

/**
 * Transform an image URL to a specific size.
 * @param {string} originalUrl - Original image URL (R2 or Supabase)
 * @param {'micro'|'small'|'medium'|'original'} size - Desired size
 * @returns {string} Transformed URL
 */
export function getImageUrl(originalUrl, size = 'medium') {
  if (!originalUrl) return originalUrl

  // Cloudflare R2
  if (R2_DOMAIN && originalUrl.includes(R2_DOMAIN)) {
    return r2Deliver(originalUrl, size)
  }

  // Supabase / other URLs: return unchanged
  return originalUrl
}

/**
 * Get a video's thumbnail URL. R2 videos store a real thumbnail image
 * separately (video_thumbnail_url) — transform it like any image.
 *
 * @param {string} thumbOrVideoUrl - The stored thumbnail image URL.
 * @param {'micro'|'small'|'medium'} size - Thumbnail size
 * @returns {string} Thumbnail image URL
 */
export function getVideoThumbnailUrl(thumbOrVideoUrl, size = 'small') {
  if (!thumbOrVideoUrl) return thumbOrVideoUrl

  // Callers should pass a thumbnail *image* URL. If we were handed an actual
  // video file (no separate thumbnail), return it unchanged — never run an
  // image transform on an .mp4.
  if (/\.(mp4|mov|webm|avi)(\?|$)/i.test(thumbOrVideoUrl) || thumbOrVideoUrl.includes('/videos/')) {
    return thumbOrVideoUrl
  }
  return getImageUrl(thumbOrVideoUrl, size)
}

/**
 * Preload an image at a specific size (e.g. adjacent lightbox images).
 * @param {string} url - Original URL
 * @param {'micro'|'small'|'medium'} size - Size to preload
 */
export function preloadImage(url, size = 'medium') {
  const transformedUrl = getImageUrl(url, size)
  const img = new Image()
  img.src = transformedUrl
}

/**
 * Preload multiple images.
 * @param {string[]} urls - Array of original URLs
 * @param {'micro'|'small'|'medium'} size - Size to preload
 */
export function preloadImages(urls, size = 'medium') {
  urls.forEach(url => preloadImage(url, size))
}
