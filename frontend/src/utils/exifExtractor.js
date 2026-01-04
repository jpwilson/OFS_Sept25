import ExifReader from 'exifreader'

/**
 * Extract GPS coordinates and timestamp from an image file's EXIF data
 * @param {File} file - The image file to extract GPS data from
 * @returns {Promise<{latitude: number, longitude: number, timestamp: string|null}|null>}
 */
export async function extractGPSFromImage(file) {
  try {
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
  } catch (error) {
    console.warn('EXIF extraction failed:', error)
    return null
  }
}
