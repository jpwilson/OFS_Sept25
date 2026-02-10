/**
 * Image Processing Utility for Upload Optimization
 *
 * This module handles:
 * 1. EXIF extraction from original image (BEFORE any resize to preserve GPS/date)
 * 2. Instant preview thumbnail generation (100px, for immediate UI feedback)
 * 3. Pre-resize for upload (1500px, reduces upload time by ~80%)
 *
 * WHY: iPhone photos are now 24MP/4.7MB. This causes:
 * - Browser freezing during selection
 * - Long upload times (60-90s on slow connections)
 * - Upload timeouts/failures on mobile
 *
 * SOLUTION: Extract EXIF first, then resize client-side before upload.
 * User sees instant preview, upload happens in background with smaller file.
 */

import { extractGPSFromImage } from './exifExtractor'

/**
 * Process an image file for upload
 * @param {File} file - Original image file from user selection
 * @returns {Promise<{
 *   exif: {latitude: number, longitude: number, timestamp: string|null}|null,
 *   previewDataUrl: string,
 *   uploadBlob: Blob,
 *   originalSize: number,
 *   uploadSize: number,
 *   reduction: string
 * }>}
 */
export async function processImageForUpload(file) {
  // Check if file is HEIC/HEIF (browser canvas can't decode these)
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' ||
    /\.(heic|heif)$/i.test(file.name)

  // 1. Extract EXIF from ORIGINAL file (must be done before any resize)
  // This preserves GPS coordinates and timestamp
  const exif = await extractGPSFromImage(file)

  if (isHeic) {
    // HEIC files: skip canvas operations (createImageBitmap can't decode HEIC)
    // Upload original file directly - Cloudinary handles HEIC conversion
    console.log(`[ImageProcessor] HEIC detected: ${file.name} - skipping canvas resize`)
    console.log(`  Original: ${formatBytes(file.size)}`)
    console.log(`  EXIF GPS: ${exif ? `${exif.latitude}, ${exif.longitude}` : 'not found'}`)

    // Create a small placeholder preview (browser can't render HEIC)
    const placeholderCanvas = document.createElement('canvas')
    placeholderCanvas.width = 100
    placeholderCanvas.height = 100
    const pCtx = placeholderCanvas.getContext('2d')
    pCtx.fillStyle = '#2a2a2a'
    pCtx.fillRect(0, 0, 100, 100)
    pCtx.fillStyle = '#888'
    pCtx.font = '12px sans-serif'
    pCtx.textAlign = 'center'
    pCtx.fillText('HEIC', 50, 55)
    const heicPreview = placeholderCanvas.toDataURL('image/png')

    return {
      exif,
      previewDataUrl: heicPreview,
      uploadBlob: file, // Upload original - Cloudinary converts
      originalSize: file.size,
      uploadSize: file.size,
      reduction: '0% (HEIC - server-side conversion)'
    }
  }

  // 2. Generate instant preview (100px thumbnail for immediate display)
  // This shows in editor within ~100ms while upload happens in background
  const previewDataUrl = await resizeToDataUrl(file, 100, 0.6)

  // 3. Pre-resize for upload (1500px max)
  // Reduces a 4.7MB iPhone photo to ~500KB
  // Cloudinary will store at 1200px, but 1500px gives room for quality optimization
  const uploadBlob = await resizeToBlob(file, 1500, 0.85)

  const reduction = file.size > 0
    ? Math.round((1 - uploadBlob.size / file.size) * 100) + '%'
    : '0%'

  console.log(`[ImageProcessor] Processed: ${file.name}`)
  console.log(`  Original: ${formatBytes(file.size)}`)
  console.log(`  Upload: ${formatBytes(uploadBlob.size)} (${reduction} reduction)`)
  console.log(`  EXIF GPS: ${exif ? `${exif.latitude}, ${exif.longitude}` : 'not found'}`)

  return {
    exif,
    previewDataUrl,
    uploadBlob,
    originalSize: file.size,
    uploadSize: uploadBlob.size,
    reduction
  }
}

/**
 * Resize image to data URL (for instant preview)
 */
async function resizeToDataUrl(file, maxSize, quality) {
  const canvas = await drawToCanvas(file, maxSize)
  return canvas.toDataURL('image/jpeg', quality)
}

/**
 * Resize image to Blob (for upload)
 */
async function resizeToBlob(file, maxSize, quality) {
  const canvas = await drawToCanvas(file, maxSize)
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality)
  })
}

/**
 * Draw image to canvas at specified max size
 * Maintains aspect ratio
 */
async function drawToCanvas(file, maxSize) {
  // createImageBitmap is fast and handles EXIF orientation automatically
  const img = await createImageBitmap(file)

  // Calculate scale to fit within maxSize while maintaining aspect ratio
  const scale = Math.min(maxSize / Math.max(img.width, img.height), 1)

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)

  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  // Clean up
  img.close()

  return canvas
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/**
 * Check if a file is an image
 */
export function isImageFile(file) {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
  return imageTypes.includes(file.type) ||
    /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name)
}
