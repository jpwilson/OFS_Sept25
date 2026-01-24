import ExifReader from 'exifreader'

/**
 * Wrap a promise with a timeout
 */
function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    )
  ])
}

/**
 * Extract GPS coordinates and timestamp from an image file's EXIF data
 * @param {File} file - The image file to extract GPS data from
 * @param {number} timeoutMs - Maximum time to wait for extraction (default 5s)
 * @returns {Promise<{latitude: number, longitude: number, timestamp: string|null}|null>}
 */
export async function extractGPSFromImage(file, timeoutMs = 5000) {
  try {
    // For very large files, skip EXIF extraction to avoid blocking
    if (file.size > 30 * 1024 * 1024) {
      console.log('[EXIF] Skipping GPS extraction for large file (>30MB)')
      return null
    }

    const extractionPromise = (async () => {
      const arrayBuffer = await file.arrayBuffer()
      const tags = ExifReader.load(arrayBuffer, { expanded: true })

      if (tags.gps?.Latitude && tags.gps?.Longitude) {
        return {
          latitude: tags.gps.Latitude,
          longitude: tags.gps.Longitude,
          timestamp: tags.exif?.DateTimeOriginal?.description || null
        }
      }
      return null
    })()

    return await withTimeout(extractionPromise, timeoutMs)
  } catch (error) {
    if (error.message === 'Timeout') {
      console.warn('[EXIF] GPS extraction timed out, continuing without location')
    } else {
      console.warn('[EXIF] Extraction failed:', error)
    }
    return null
  }
}
