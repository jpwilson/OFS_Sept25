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
/**
 * Extract full import metadata from a photo for Smart Import clustering:
 * timestamp, GPS, pixel dimensions, and whether it has camera EXIF
 * (screenshots/re-shared files lack Make/Model and poison clustering).
 *
 * @param {File} file - The image file
 * @param {number} timeoutMs - Max extraction time (default 5s)
 * @returns {Promise<{timestamp: string|null, latitude: number|null, longitude: number|null,
 *                    width: number, height: number, hasCameraExif: boolean}>}
 */
export async function extractImportMetadata(file, timeoutMs = 5000) {
  const empty = {
    timestamp: null, latitude: null, longitude: null,
    width: 0, height: 0, hasCameraExif: false,
  }
  try {
    if (file.size > 30 * 1024 * 1024) return empty

    const extractionPromise = (async () => {
      const arrayBuffer = await file.arrayBuffer()
      const tags = ExifReader.load(arrayBuffer, { expanded: true })

      const exif = tags.exif || {}
      const width =
        exif.PixelXDimension?.value ||
        tags.file?.['Image Width']?.value || 0
      const height =
        exif.PixelYDimension?.value ||
        tags.file?.['Image Height']?.value || 0

      return {
        timestamp: exif.DateTimeOriginal?.description || exif.DateTime?.description || null,
        latitude: tags.gps?.Latitude ?? null,
        longitude: tags.gps?.Longitude ?? null,
        width: Number(width) || 0,
        height: Number(height) || 0,
        hasCameraExif: Boolean(exif.Make || exif.Model),
      }
    })()

    return await withTimeout(extractionPromise, timeoutMs)
  } catch (error) {
    console.warn('[EXIF] Import metadata extraction failed:', error.message)
    return empty
  }
}

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
