import { mockEventsForFeed } from '../data/mockEvents'
import { supabase } from '../lib/supabaseClient'

const API_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? (import.meta.env.VITE_API_URL || 'https://ofs-sept25.vercel.app')
  : 'http://localhost:8000'
const API_BASE = `${API_URL}/api/v1`

class ApiService {
  async getAuthHeaders() {
    // Try to get Supabase session first and refresh if needed
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Session error:', error)
    }

    // If session exists but might be expiring soon, try to refresh it
    if (session) {
      const expiresAt = session.expires_at * 1000 // Convert to milliseconds
      const now = Date.now()
      const timeUntilExpiry = expiresAt - now

      // If token expires in less than 5 minutes, refresh it
      if (timeUntilExpiry < 5 * 60 * 1000) {
        console.log('Token expiring soon, refreshing...')
        const { data: { session: newSession } } = await supabase.auth.refreshSession()
        if (newSession?.access_token) {
          return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${newSession.access_token}`
          }
        }
      }

      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }
    }

    // Fallback to legacy token
    const legacyToken = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      ...(legacyToken && { 'Authorization': `Bearer ${legacyToken}` })
    }
  }

  async getEvents(orderBy = 'event_date') {
    try {
      const headers = await this.getAuthHeaders()
      const params = new URLSearchParams()
      if (orderBy) params.append('order_by', orderBy)
      const url = `${API_BASE}/events${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url, { headers })
      if (!response.ok) {
        console.error('getEvents failed:', response.status, response.statusText)
        throw new Error('Failed to fetch events')
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching events:', error)
      // Return mock data as fallback to prevent blank page
      return mockEventsForFeed
    }
  }

  async getEvent(id) {
    const headers = await this.getAuthHeaders()
    const response = await fetch(`${API_BASE}/events/${id}`, { headers })

    if (!response.ok) {
      // For 403 errors, get the detailed privacy info
      if (response.status === 403) {
        const errorData = await response.json()
        const error = new Error('Privacy restricted')
        error.response = { status: 403, data: errorData }
        throw error
      }
      // For other errors, return null (not found, etc.)
      console.error('getEvent failed:', response.status, response.statusText)
      return null
    }

    return await response.json()
  }

  async getLastEventLocation() {
    const headers = await this.getAuthHeaders()
    const response = await fetch(`${API_BASE}/events/me/last-location`, { headers })

    if (!response.ok) {
      return null
    }

    return await response.json()
  }

  async createEvent(eventData, isPublished = true) {
    try {
      const url = `${API_BASE}/events?is_published=${isPublished}`
      const response = await fetch(url, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(eventData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to create event')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating event:', error)
      throw error
    }
  }

  async updateEvent(eventId, eventData) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(eventData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to update event')
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating event:', error)
      throw error
    }
  }

  async getDrafts() {
    try {
      const response = await fetch(`${API_BASE}/events/drafts`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch drafts')
      return await response.json()
    } catch (error) {
      console.error('Error fetching drafts:', error)
      return []
    }
  }

  async deleteEvent(eventId) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to delete event')
      }

      return await response.json()
    } catch (error) {
      console.error('Error deleting event:', error)
      throw error
    }
  }

  async getTrash() {
    try {
      const response = await fetch(`${API_BASE}/events/trash`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch trash')
      return await response.json()
    } catch (error) {
      console.error('Error fetching trash:', error)
      return []
    }
  }

  async restoreEvent(eventId) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/restore`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to restore event')
      }

      return await response.json()
    } catch (error) {
      console.error('Error restoring event:', error)
      throw error
    }
  }

  async permanentlyDeleteEvent(eventId) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/permanent`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to permanently delete event')
      }

      return await response.json()
    } catch (error) {
      console.error('Error permanently deleting event:', error)
      throw error
    }
  }

  async publishEvent(eventId) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/publish`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to publish event')
      }

      return await response.json()
    } catch (error) {
      console.error('Error publishing event:', error)
      throw error
    }
  }

  async unpublishEvent(eventId) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/unpublish`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to unpublish event')
      }

      return await response.json()
    } catch (error) {
      console.error('Error unpublishing event:', error)
      throw error
    }
  }

  // Check if file is HEIC format
  isHeicFile(file) {
    const fileName = file.name.toLowerCase()
    return fileName.endsWith('.heic') || fileName.endsWith('.heif')
  }

  // Upload HEIC file directly to Cloudinary (supports HEIC natively, auto-converts)
  async uploadHeicFile(file, eventId) {
    console.log(`Uploading HEIC file to Cloudinary: ${file.name} (${(file.size/1024/1024).toFixed(2)}MB)`)

    // Import Cloudinary config
    const { CLOUDINARY_CONFIG } = await import('../config/cloudinary.js')

    // Upload directly to Cloudinary as an image
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_CONFIG.imageUploadPreset)
    formData.append('folder', 'ofs/images')

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Cloudinary upload error:', error)
      throw new Error(error.error?.message || 'Failed to upload image to Cloudinary')
    }

    const result = await response.json()
    console.log('HEIC uploaded to Cloudinary:', result.secure_url)

    // Apply transformations via URL (max 2000px, auto quality, JPEG format)
    // Cloudinary auto-converts HEIC to displayable format
    const imageUrl = result.secure_url.replace('/upload/', '/upload/c_limit,w_2000,h_2000,q_auto,f_jpg/')

    console.log('Optimized image URL:', imageUrl)

    // Return in the same format as uploadEventImage expects
    return {
      image_url: imageUrl,
      id: Date.now(), // Temporary ID since we're not saving to DB here
      event_id: eventId,
      latitude: null,
      longitude: null,
      timestamp: null
    }
  }

  // Compress image to stay under Vercel's 4.5MB limit
  async compressImage(file, maxSizeMB = 4) {
    // HEIC files are handled separately via direct Supabase upload
    // This function should not receive HEIC files anymore

    return new Promise((resolve) => {
      // If file is already small enough, return as-is
      if (file.size <= maxSizeMB * 1024 * 1024) {
        resolve(file)
        return
      }

      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      img.onload = () => {
        // Calculate new dimensions (max 2000px on longest side)
        let { width, height } = img
        const maxDimension = 2000

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension
            width = maxDimension
          } else {
            width = (width / height) * maxDimension
            height = maxDimension
          }
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to blob with quality reduction
        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            console.log(`Compressed ${file.name}: ${(file.size/1024/1024).toFixed(2)}MB -> ${(compressedFile.size/1024/1024).toFixed(2)}MB`)
            resolve(compressedFile)
          },
          'image/jpeg',
          0.85 // 85% quality
        )
      }

      img.src = URL.createObjectURL(file)
    })
  }

  async uploadImage(file) {
    try {
      // Compress image if needed (Vercel has 4.5MB body limit)
      const processedFile = await this.compressImage(file)

      const formData = new FormData()
      formData.append('file', processedFile)

      // Get token from Supabase session or legacy storage
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || localStorage.getItem('token')

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to upload image')
      }

      const data = await response.json()
      // Supabase Storage returns full public URLs, no need to prepend
      return data
    } catch (error) {
      console.error('Error uploading image:', error)
      throw error
    }
  }

  async uploadVideo(file, onProgress) {
    try {
      // Check file size - Supabase default limit is 50MB per file
      // even on Pro tier unless bucket is configured otherwise
      const MAX_SIZE = 50 * 1024 * 1024 // 50MB (Supabase default)
      const fileSize = file.size
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(1)

      if (fileSize > MAX_SIZE) {
        throw new Error(`Video is ${fileSizeMB}MB but Supabase storage limit is 50MB. Please ensure video compression is working properly, or upload a shorter/lower quality video.`)
      }

      console.log(`Uploading video: ${fileSizeMB}MB`)

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`

      // For files >10MB, use resumable upload (TUS protocol)
      // For smaller files, use standard upload
      const useResumable = fileSize > 10 * 1024 * 1024

      if (useResumable) {
        // Resumable upload for large files
        const { data, error } = await supabase.storage
          .from('event-videos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            // Resumable upload options
            duplex: 'half',
            onUploadProgress: (progress) => {
              if (onProgress) {
                const percent = (progress.loaded / progress.total) * 100
                onProgress(percent)
              }
            }
          })

        if (error) {
          console.error('Supabase upload error:', error)
          throw new Error(error.message || 'Failed to upload video to storage')
        }
      } else {
        // Standard upload for smaller files
        const { data, error } = await supabase.storage
          .from('event-videos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            onUploadProgress: (progress) => {
              if (onProgress) {
                const percent = (progress.loaded / progress.total) * 100
                onProgress(percent)
              }
            }
          })

        if (error) {
          console.error('Supabase upload error:', error)
          throw new Error(error.message || 'Failed to upload video to storage')
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('event-videos')
        .getPublicUrl(fileName)

      return {
        url: publicUrl,
        filename: fileName,
        file_size: file.size,
        format: fileExt
      }
    } catch (error) {
      console.error('Error uploading video:', error)
      throw error
    }
  }

  // Upload image to Cloudinary (used for all image types)
  async uploadImageToCloudinary(file, timeoutMs = 60000) {
    const isMobile = window.innerWidth <= 480
    const actualTimeout = isMobile ? 90000 : timeoutMs

    console.log('[UPLOAD DEBUG] Starting Cloudinary upload:', {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      fileType: file.type,
      isMobile,
      timeout: actualTimeout,
      timestamp: new Date().toISOString()
    })

    const { CLOUDINARY_CONFIG } = await import('../config/cloudinary.js')
    console.log('[UPLOAD DEBUG] Cloudinary config loaded')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_CONFIG.imageUploadPreset)
    formData.append('folder', 'ofs/images')

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`
    console.log('[UPLOAD DEBUG] Sending to Cloudinary...', uploadUrl)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), actualTimeout)

    try {
      const startTime = Date.now()
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      console.log('[UPLOAD DEBUG] Cloudinary responded in', Date.now() - startTime, 'ms, status:', response.status)

      if (!response.ok) {
        const error = await response.json()
        console.error('[UPLOAD DEBUG] Cloudinary error:', error)
        throw new Error(error.error?.message || 'Failed to upload image to Cloudinary')
      }

      const result = await response.json()
      console.log('[UPLOAD DEBUG] Upload successful, URL:', result.secure_url?.substring(0, 50) + '...')
      // Apply transformations via URL (max 2000px, auto quality, auto format)
      return result.secure_url.replace('/upload/', '/upload/c_limit,w_2000,h_2000,q_auto,f_auto/')
    } catch (error) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('Upload timed out. Please check your connection and try again.')
      }
      throw error
    }
  }

  // Event Image methods (for caption system)
  // All images now go to Cloudinary for faster global uploads (fixes UK timeout issues)
  async uploadEventImage(file, eventId, caption = null, orderIndex = 0) {
    const isMobile = window.innerWidth <= 480
    const maxRetries = isMobile ? 2 : 3
    let lastError = null

    console.log('[UPLOAD DEBUG] uploadEventImage started:', {
      eventId,
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      isMobile
    })

    // Extract GPS data client-side BEFORE uploading (with timeout protection)
    let gpsData = null
    try {
      console.log('[UPLOAD DEBUG] Extracting GPS data...')
      const { extractGPSFromImage } = await import('../utils/exifExtractor.js')
      gpsData = await extractGPSFromImage(file)
      console.log('[UPLOAD DEBUG] GPS extraction complete:', gpsData ? 'found' : 'none')
    } catch (gpsError) {
      console.warn('[UPLOAD DEBUG] GPS extraction failed, continuing without:', gpsError)
    }

    // Retry loop for upload
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[UPLOAD DEBUG] Cloudinary upload attempt ${attempt}/${maxRetries}`)

        // Upload to Cloudinary with timeout
        const uploadTimeout = isMobile ? 90000 : 60000 // 90s mobile, 60s desktop
        const imageUrl = await Promise.race([
          this.uploadImageToCloudinary(file),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Upload timed out')), uploadTimeout)
          )
        ])

        console.log('[UPLOAD DEBUG] Cloudinary upload complete')

        // Save record to database via backend (includes GPS data)
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token || localStorage.getItem('token')

        const response = await fetch(`${API_BASE}/upload/event-image-record`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            event_id: eventId,
            image_url: imageUrl,
            caption,
            order_index: orderIndex,
            latitude: gpsData?.latitude || null,
            longitude: gpsData?.longitude || null,
            timestamp: gpsData?.timestamp || null
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.detail || 'Failed to save image record')
        }

        console.log('[UPLOAD DEBUG] Image record saved successfully')
        return await response.json()
      } catch (error) {
        lastError = error
        console.error(`[UPLOAD DEBUG] Attempt ${attempt} failed:`, error.message)

        // Log error for debugging
        this.logClientError({
          error_message: `Upload attempt ${attempt} failed: ${error.message}`,
          component_name: 'uploadEventImage',
          page_url: window.location.href,
          is_mobile: isMobile,
          additional_context: {
            eventId,
            fileName: file.name,
            fileSize: file.size,
            attempt
          }
        })

        // Only retry on network/timeout errors, not auth errors
        if (error.message?.includes('401') || error.message?.includes('403')) {
          throw error
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
          console.log(`[UPLOAD DEBUG] Waiting ${waitTime}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }

    // All retries failed
    const errorMessage = isMobile
      ? 'Upload failed. Please check your connection and try again. If on mobile, try switching to WiFi.'
      : 'Upload failed after multiple attempts. Please check your connection and try again.'

    console.error('[UPLOAD DEBUG] All retries exhausted:', lastError)
    throw new Error(errorMessage)
  }

  async getEventImages(eventId) {
    try {
      const response = await fetch(`${API_BASE}/upload/event-images/${eventId}`)
      if (!response.ok) throw new Error('Failed to fetch event images')
      return await response.json()
    } catch (error) {
      console.error('Error fetching event images:', error)
      return []
    }
  }

  async deleteEventImage(imageId) {
    try {
      const response = await fetch(`${API_BASE}/upload/event-image/${imageId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to delete image')
      }

      return await response.json()
    } catch (error) {
      console.error('Error deleting event image:', error)
      throw error
    }
  }

  async updateEventImageCaption(imageId, caption) {
    try {
      const response = await fetch(`${API_BASE}/upload/event-image/${imageId}`, {
        method: 'PATCH',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ caption })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to update caption')
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating image caption:', error)
      throw error
    }
  }

  async createEventImage(imageData) {
    try {
      const response = await fetch(`${API_BASE}/upload/event-image-metadata`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(imageData)
      })

      if (!response.ok) {
        const error = await response.json()
        // Pydantic validation errors return an array in 'detail'
        let errorMessage = 'Failed to create event image metadata'
        if (Array.isArray(error.detail)) {
          errorMessage = error.detail.map(e => `${e.loc?.join('.')}: ${e.msg}`).join(', ')
        } else if (typeof error.detail === 'string') {
          errorMessage = error.detail
        }
        throw new Error(errorMessage)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating event image metadata:', error)
      throw error
    }
  }

  async getUserProfile(username) {
    try {
      const response = await fetch(`${API_BASE}/users/${username}`)
      if (!response.ok) throw new Error('Failed to fetch user profile')
      return await response.json()
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  async getFollowing() {
    try {
      const response = await fetch(`${API_BASE}/users/me/following`, {
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) throw new Error('Failed to fetch following')
      return await response.json()
    } catch (error) {
      console.error('Error fetching following:', error)
      return []
    }
  }

  async toggleEventNotifications(userId, notify) {
    try {
      const response = await fetch(`${API_BASE}/users/me/following/${userId}/notify-events?notify=${notify}`, {
        method: 'PATCH',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) throw new Error('Failed to update notification preference')
      return await response.json()
    } catch (error) {
      console.error('Error updating notification preference:', error)
      throw error
    }
  }

  async followUser(username) {
    try {
      const response = await fetch(`${API_BASE}/users/${username}/follow`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) throw new Error('Failed to follow user')
      return await response.json()
    } catch (error) {
      console.error('Error following user:', error)
      throw error
    }
  }

  async unfollowUser(username) {
    try {
      const response = await fetch(`${API_BASE}/users/${username}/follow`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) throw new Error('Failed to unfollow user')
      return await response.json()
    } catch (error) {
      console.error('Error unfollowing user:', error)
      throw error
    }
  }

  async checkIfFollowing(username) {
    try {
      const response = await fetch(`${API_BASE}/users/${username}/is-following`, {
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) return { is_following: false }
      return await response.json()
    } catch (error) {
      console.error('Error checking follow status:', error)
      return { is_following: false }
    }
  }

  async checkIfFollowingMe(username) {
    try {
      const response = await fetch(`${API_BASE}/users/${username}/is-following-me`, {
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) return { is_following: false }
      return await response.json()
    } catch (error) {
      console.error('Error checking if user follows me:', error)
      return { is_following: false }
    }
  }

  async getUserFollowers(username) {
    try {
      const response = await fetch(`${API_BASE}/users/${username}/followers`, {
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) throw new Error('Failed to fetch followers')
      return await response.json()
    } catch (error) {
      console.error('Error fetching followers:', error)
      return []
    }
  }

  async getUserFollowing(username) {
    try {
      const response = await fetch(`${API_BASE}/users/${username}/following`, {
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) throw new Error('Failed to fetch following')
      return await response.json()
    } catch (error) {
      console.error('Error fetching following:', error)
      return []
    }
  }

  async getFollowers() {
    try {
      const response = await fetch(`${API_BASE}/users/me/followers`, {
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) throw new Error('Failed to fetch followers')
      return await response.json()
    } catch (error) {
      console.error('Error fetching followers:', error)
      return []
    }
  }

  async toggleCloseFamily(userId, isCloseFamily) {
    try {
      const response = await fetch(`${API_BASE}/users/me/followers/${userId}/close-family?close_family=${isCloseFamily}`, {
        method: 'PATCH',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) throw new Error('Failed to update close family status')
      return await response.json()
    } catch (error) {
      console.error('Error toggling close family:', error)
      throw error
    }
  }

  async searchUsers(query) {
    try {
      const response = await fetch(`${API_BASE}/users/search/users?q=${encodeURIComponent(query)}`)

      if (!response.ok) throw new Error('Failed to search users')
      return await response.json()
    } catch (error) {
      console.error('Error searching users:', error)
      return []
    }
  }

  // Follow Requests
  async getFollowRequests() {
    try {
      const response = await fetch(`${API_BASE}/users/me/follow-requests`, {
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) throw new Error('Failed to fetch follow requests')
      return await response.json()
    } catch (error) {
      console.error('Error fetching follow requests:', error)
      return []
    }
  }

  async acceptFollowRequest(requestId) {
    try {
      const response = await fetch(`${API_BASE}/users/me/follow-requests/${requestId}/accept`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) throw new Error('Failed to accept follow request')
      return await response.json()
    } catch (error) {
      console.error('Error accepting follow request:', error)
      throw error
    }
  }

  async rejectFollowRequest(requestId) {
    try {
      const response = await fetch(`${API_BASE}/users/me/follow-requests/${requestId}/reject`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) throw new Error('Failed to reject follow request')
      return await response.json()
    } catch (error) {
      console.error('Error rejecting follow request:', error)
      throw error
    }
  }

  async getSentFollowRequests() {
    try {
      const response = await fetch(`${API_BASE}/users/me/follow-requests/sent`, {
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) throw new Error('Failed to fetch sent follow requests')
      return await response.json()
    } catch (error) {
      console.error('Error fetching sent follow requests:', error)
      return []
    }
  }

  async getFollowRequestCount() {
    try {
      const response = await fetch(`${API_BASE}/users/me/follow-requests/count`, {
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) return { count: 0 }
      return await response.json()
    } catch (error) {
      console.error('Error fetching follow request count:', error)
      return { count: 0 }
    }
  }

  // Profile Update
  async updateProfile(profileData) {
    try {
      const response = await fetch(`${API_BASE}/users/me/profile`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(profileData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to update profile')
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  // Comments
  async getComments(eventId) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/comments`)
      if (!response.ok) throw new Error('Failed to fetch comments')
      return await response.json()
    } catch (error) {
      console.error('Error fetching comments:', error)
      return []
    }
  }

  async createComment(eventId, content) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/comments`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ content })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to create comment')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating comment:', error)
      throw error
    }
  }

  async deleteComment(eventId, commentId) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) throw new Error('Failed to delete comment')
      return await response.json()
    } catch (error) {
      console.error('Error deleting comment:', error)
      throw error
    }
  }

  // Likes
  async getLikes(eventId) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/likes`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch likes')
      return await response.json()
    } catch (error) {
      console.error('Error fetching likes:', error)
      return { like_count: 0, is_liked: false, recent_likes: [] }
    }
  }

  async likeEvent(eventId) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/likes`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) throw new Error('Failed to like event')
      return await response.json()
    } catch (error) {
      console.error('Error liking event:', error)
      throw error
    }
  }

  async unlikeEvent(eventId) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/likes`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) throw new Error('Failed to unlike event')
      return await response.json()
    } catch (error) {
      console.error('Error unliking event:', error)
      throw error
    }
  }

  async getAllLikes(eventId) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/likes/all`)
      if (!response.ok) throw new Error('Failed to fetch all likes')
      return await response.json()
    } catch (error) {
      console.error('Error fetching all likes:', error)
      return []
    }
  }

  // Location methods
  async getEventLocations(eventId) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/locations`)
      if (!response.ok) throw new Error('Failed to fetch locations')
      return await response.json()
    } catch (error) {
      console.error('Error fetching locations:', error)
      return []
    }
  }

  async extractLocationsFromImages(eventId) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/locations/extract-from-images`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to extract locations')
      }
      return await response.json()
    } catch (error) {
      console.error('Error extracting locations from images:', error)
      throw error
    }
  }

  async createEventLocation(eventId, locationData) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/locations`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(locationData)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to create location')
      }
      return await response.json()
    } catch (error) {
      console.error('Error creating location:', error)
      throw error
    }
  }

  async deleteEventLocation(eventId, locationId) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/locations/${locationId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to delete location')
      return true
    } catch (error) {
      console.error('Error deleting location:', error)
      throw error
    }
  }

  async reorderEventLocations(eventId, locationIds) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/locations/reorder`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(locationIds)
      })
      if (!response.ok) throw new Error('Failed to reorder locations')
      return await response.json()
    } catch (error) {
      console.error('Error reordering locations:', error)
      throw error
    }
  }

  // ========================================
  // CUSTOM GROUPS
  // ========================================

  async getCustomGroups() {
    try {
      const response = await fetch(`${API_BASE}/custom-groups/`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch custom groups')
      return await response.json()
    } catch (error) {
      console.error('Error fetching custom groups:', error)
      return []
    }
  }

  async getCustomGroup(groupId) {
    try {
      const response = await fetch(`${API_BASE}/custom-groups/${groupId}`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch custom group')
      return await response.json()
    } catch (error) {
      console.error('Error fetching custom group:', error)
      throw error
    }
  }

  async createCustomGroup(groupData) {
    try {
      const response = await fetch(`${API_BASE}/custom-groups/`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(groupData)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to create custom group')
      }
      return await response.json()
    } catch (error) {
      console.error('Error creating custom group:', error)
      throw error
    }
  }

  async updateCustomGroup(groupId, groupData) {
    try {
      const response = await fetch(`${API_BASE}/custom-groups/${groupId}`, {
        method: 'PATCH',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(groupData)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to update custom group')
      }
      return await response.json()
    } catch (error) {
      console.error('Error updating custom group:', error)
      throw error
    }
  }

  async deleteCustomGroup(groupId) {
    try {
      const response = await fetch(`${API_BASE}/custom-groups/${groupId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to delete custom group')
      return await response.json()
    } catch (error) {
      console.error('Error deleting custom group:', error)
      throw error
    }
  }

  async addGroupMember(groupId, userId) {
    try {
      const response = await fetch(`${API_BASE}/custom-groups/${groupId}/members/${userId}`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to add member')
      }
      return await response.json()
    } catch (error) {
      console.error('Error adding group member:', error)
      throw error
    }
  }

  async removeGroupMember(groupId, userId) {
    try {
      const response = await fetch(`${API_BASE}/custom-groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to remove member')
      return await response.json()
    } catch (error) {
      console.error('Error removing group member:', error)
      throw error
    }
  }

  // ========================================
  // SHAREABLE LINKS
  // ========================================

  async createShareLink(eventId, expiresInDays) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/share`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ expires_in_days: expiresInDays })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to create share link')
      }
      return await response.json()
    } catch (error) {
      console.error('Error creating share link:', error)
      throw error
    }
  }

  async getShareLink(eventId) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/share`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error('Failed to fetch share link')
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching share link:', error)
      return null
    }
  }

  async updateShareLink(eventId, expiresInDays) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/share`, {
        method: 'PATCH',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ expires_in_days: expiresInDays })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to update share link')
      }
      return await response.json()
    } catch (error) {
      console.error('Error updating share link:', error)
      throw error
    }
  }

  async deleteShareLink(eventId) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/share`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to delete share link')
      return await response.json()
    } catch (error) {
      console.error('Error deleting share link:', error)
      throw error
    }
  }

  async getAllShareLinks() {
    try {
      const response = await fetch(`${API_BASE}/share-links`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch share links')
      const data = await response.json()
      return data.share_links || []
    } catch (error) {
      console.error('Error fetching all share links:', error)
      return []
    }
  }

  async viewSharedEvent(token) {
    try {
      const headers = {}
      // Include auth token if available (for personalized messages)
      const authHeaders = await this.getAuthHeaders()
      if (authHeaders.Authorization) {
        headers.Authorization = authHeaders.Authorization
      }

      const response = await fetch(`${API_BASE}/share/${token}`, {
        headers
      })
      if (!response.ok) {
        if (response.status === 410) throw new Error('expired')
        if (response.status === 404) throw new Error('not_found')
        throw new Error('Failed to fetch shared event')
      }
      return await response.json()
    } catch (error) {
      console.error('Error viewing shared event:', error)
      throw error
    }
  }

  // ========================================
  // NOTIFICATION PREFERENCES
  // ========================================

  async getNotificationPreferences() {
    try {
      const response = await fetch(`${API_BASE}/users/me/notification-preferences`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch notification preferences')
      return await response.json()
    } catch (error) {
      console.error('Error fetching notification preferences:', error)
      throw error
    }
  }

  async updateNotificationPreferences(preferences) {
    try {
      const response = await fetch(`${API_BASE}/users/me/notification-preferences`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(preferences)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to update notification preferences')
      }
      return await response.json()
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      throw error
    }
  }

  // ========================================
  // EMAIL SHARING
  // ========================================

  async shareEventViaEmail(eventId, recipientEmail, personalMessage = null) {
    try {
      const response = await fetch(`${API_BASE}/email/share-event`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({
          event_id: eventId,
          recipient_email: recipientEmail,
          personal_message: personalMessage
        })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to send email')
      }
      return await response.json()
    } catch (error) {
      console.error('Error sharing event via email:', error)
      throw error
    }
  }

  // ========================================
  // INVITED VIEWERS
  // ========================================

  async createInviteLink() {
    try {
      const response = await fetch(`${API_BASE}/invitations/link`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) {
        const error = await response.json()
        throw error
      }
      return await response.json()
    } catch (error) {
      console.error('Error creating invite link:', error)
      throw error
    }
  }

  async createInvitation(email, name = null, personalMessage = null) {
    try {
      const response = await fetch(`${API_BASE}/invitations`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({
          email,
          name,
          personal_message: personalMessage
        })
      })
      if (!response.ok) {
        const error = await response.json()
        throw error  // Return the full error object for handling
      }
      return await response.json()
    } catch (error) {
      console.error('Error creating invitation:', error)
      throw error
    }
  }

  async getInvitations(status = null) {
    try {
      const url = status
        ? `${API_BASE}/invitations?status=${status}`
        : `${API_BASE}/invitations`
      const response = await fetch(url, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch invitations')
      return await response.json()
    } catch (error) {
      console.error('Error fetching invitations:', error)
      return { invitations: [], total: 0 }
    }
  }

  async checkInvitationEmail(email) {
    try {
      const response = await fetch(`${API_BASE}/invitations/check-email?email=${encodeURIComponent(email)}`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to check email')
      return await response.json()
    } catch (error) {
      console.error('Error checking invitation email:', error)
      return {
        exists_as_user: false,
        already_invited_by_me: false,
        invited_by_others: []
      }
    }
  }

  async cancelInvitation(invitationId) {
    try {
      const response = await fetch(`${API_BASE}/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to cancel invitation')
      return await response.json()
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      throw error
    }
  }

  async resendInvitation(invitationId) {
    try {
      const response = await fetch(`${API_BASE}/invitations/${invitationId}/resend`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to resend invitation')
      return await response.json()
    } catch (error) {
      console.error('Error resending invitation:', error)
      throw error
    }
  }

  async validateInviteToken(token) {
    try {
      const response = await fetch(`${API_BASE}/auth/validate-invite/${token}`)
      if (!response.ok) throw new Error('Failed to validate invite')
      return await response.json()
    } catch (error) {
      console.error('Error validating invite token:', error)
      return { valid: false, message: 'Invalid invitation' }
    }
  }

  async getViewerStatus() {
    try {
      const response = await fetch(`${API_BASE}/users/me/viewer-status`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch viewer status')
      return await response.json()
    } catch (error) {
      console.error('Error fetching viewer status:', error)
      return null
    }
  }

  async getMyInviters() {
    try {
      const response = await fetch(`${API_BASE}/users/me/inviters`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch inviters')
      return await response.json()
    } catch (error) {
      console.error('Error fetching inviters:', error)
      return { inviters: [], count: 0 }
    }
  }

  // ========================================
  // MEDIA ENGAGEMENT (Per-image/video likes & comments)
  // ========================================

  async getMediaLikes(mediaId) {
    try {
      const response = await fetch(`${API_BASE}/media/${mediaId}/likes`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch media likes')
      return await response.json()
    } catch (error) {
      console.error('Error fetching media likes:', error)
      return { like_count: 0, is_liked: false, recent_likes: [] }
    }
  }

  async likeMedia(mediaId, reactionType = 'heart') {
    try {
      const response = await fetch(`${API_BASE}/media/${mediaId}/likes`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ reaction_type: reactionType })
      })
      if (!response.ok) throw new Error('Failed to like media')
      return await response.json()
    } catch (error) {
      console.error('Error liking media:', error)
      throw error
    }
  }

  async unlikeMedia(mediaId) {
    try {
      const response = await fetch(`${API_BASE}/media/${mediaId}/likes`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to unlike media')
      return await response.json()
    } catch (error) {
      console.error('Error unliking media:', error)
      throw error
    }
  }

  async getBatchMediaLikes(mediaIds) {
    try {
      if (!mediaIds || mediaIds.length === 0) return []
      const response = await fetch(`${API_BASE}/media/batch/likes?ids=${mediaIds.join(',')}`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch batch media likes')
      return await response.json()
    } catch (error) {
      console.error('Error fetching batch media likes:', error)
      return []
    }
  }

  async getBatchMediaStats(mediaIds) {
    try {
      if (!mediaIds || mediaIds.length === 0) return []
      const response = await fetch(`${API_BASE}/media/batch/stats?ids=${mediaIds.join(',')}`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch batch media stats')
      return await response.json()
    } catch (error) {
      console.error('Error fetching batch media stats:', error)
      return []
    }
  }

  async getMediaComments(mediaId) {
    try {
      const response = await fetch(`${API_BASE}/media/${mediaId}/comments`)
      if (!response.ok) throw new Error('Failed to fetch media comments')
      return await response.json()
    } catch (error) {
      console.error('Error fetching media comments:', error)
      return []
    }
  }

  async createMediaComment(mediaId, content) {
    try {
      const response = await fetch(`${API_BASE}/media/${mediaId}/comments`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ content })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to create comment')
      }
      return await response.json()
    } catch (error) {
      console.error('Error creating media comment:', error)
      throw error
    }
  }

  async deleteMediaComment(mediaId, commentId) {
    try {
      const response = await fetch(`${API_BASE}/media/${mediaId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to delete media comment')
      return await response.json()
    } catch (error) {
      console.error('Error deleting media comment:', error)
      throw error
    }
  }

  // ========================================
  // TAG PROFILES (for non-users: pets, kids, relatives)
  // ========================================

  async searchTagProfiles(query) {
    try {
      const response = await fetch(`${API_BASE}/tag-profiles/search?q=${encodeURIComponent(query)}`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to search tag profiles')
      return await response.json()
    } catch (error) {
      console.error('Error searching tag profiles:', error)
      return []
    }
  }

  async createTagProfile(profileData) {
    try {
      const response = await fetch(`${API_BASE}/tag-profiles`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(profileData)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to create tag profile')
      }
      return await response.json()
    } catch (error) {
      console.error('Error creating tag profile:', error)
      throw error
    }
  }

  async getTagProfile(profileId) {
    try {
      const response = await fetch(`${API_BASE}/tag-profiles/${profileId}`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch tag profile')
      return await response.json()
    } catch (error) {
      console.error('Error fetching tag profile:', error)
      return null
    }
  }

  async getTagProfileEvents(profileId, skip = 0, limit = 20) {
    try {
      const response = await fetch(`${API_BASE}/tag-profiles/${profileId}/events?skip=${skip}&limit=${limit}`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch tag profile events')
      return await response.json()
    } catch (error) {
      console.error('Error fetching tag profile events:', error)
      return []
    }
  }

  async getMyTagProfiles() {
    try {
      const response = await fetch(`${API_BASE}/tag-profiles/mine`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch my tag profiles')
      return await response.json()
    } catch (error) {
      console.error('Error fetching my tag profiles:', error)
      return []
    }
  }

  async updateTagProfile(profileId, profileData) {
    try {
      const response = await fetch(`${API_BASE}/tag-profiles/${profileId}`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(profileData)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to update tag profile')
      }
      return await response.json()
    } catch (error) {
      console.error('Error updating tag profile:', error)
      throw error
    }
  }

  async deleteTagProfile(profileId) {
    try {
      const response = await fetch(`${API_BASE}/tag-profiles/${profileId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to delete tag profile')
      return await response.json()
    } catch (error) {
      console.error('Error deleting tag profile:', error)
      throw error
    }
  }

  // ========================================
  // EVENT TAGS (tagging users/profiles in events)
  // ========================================

  async getEventTags(eventId) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/tags`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch event tags')
      return await response.json()
    } catch (error) {
      console.error('Error fetching event tags:', error)
      return []
    }
  }

  async addEventTags(eventId, tags) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/tags`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ tags })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to add event tags')
      }
      return await response.json()
    } catch (error) {
      console.error('Error adding event tags:', error)
      throw error
    }
  }

  async removeEventTag(eventId, tagId) {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}/tags/${tagId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to remove event tag')
      return await response.json()
    } catch (error) {
      console.error('Error removing event tag:', error)
      throw error
    }
  }

  // ========================================
  // TAG REQUESTS (for tagged users)
  // ========================================

  async getTagRequests() {
    try {
      const response = await fetch(`${API_BASE}/me/tag-requests`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch tag requests')
      return await response.json()
    } catch (error) {
      console.error('Error fetching tag requests:', error)
      return []
    }
  }

  async getTagRequestCount() {
    try {
      const response = await fetch(`${API_BASE}/me/tag-requests/count`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) return { count: 0 }
      return await response.json()
    } catch (error) {
      console.error('Error fetching tag request count:', error)
      return { count: 0 }
    }
  }

  async getNotificationCounts() {
    try {
      const response = await fetch(`${API_BASE}/users/me/notification-counts`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) return { total: 0, follow_requests: 0, tag_requests: 0, profile_claims: 0 }
      return await response.json()
    } catch (error) {
      console.error('Error fetching notification counts:', error)
      return { total: 0, follow_requests: 0, tag_requests: 0, profile_claims: 0 }
    }
  }

  async acceptTagRequest(tagId) {
    try {
      const response = await fetch(`${API_BASE}/me/tag-requests/${tagId}/accept`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to accept tag request')
      return await response.json()
    } catch (error) {
      console.error('Error accepting tag request:', error)
      throw error
    }
  }

  async rejectTagRequest(tagId) {
    try {
      const response = await fetch(`${API_BASE}/me/tag-requests/${tagId}/reject`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to reject tag request')
      return await response.json()
    } catch (error) {
      console.error('Error rejecting tag request:', error)
      throw error
    }
  }

  async getTaggedEvents(skip = 0, limit = 20) {
    try {
      const response = await fetch(`${API_BASE}/me/tagged-events?skip=${skip}&limit=${limit}`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch tagged events')
      return await response.json()
    } catch (error) {
      console.error('Error fetching tagged events:', error)
      return []
    }
  }

  async getSentTagRequests() {
    try {
      const response = await fetch(`${API_BASE}/me/tag-requests/sent`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch sent tag requests')
      return await response.json()
    } catch (error) {
      console.error('Error fetching sent tag requests:', error)
      return []
    }
  }

  // ========================================
  // COMBINED TAG SEARCH (users + profiles)
  // ========================================

  async searchTaggable(query) {
    try {
      const response = await fetch(`${API_BASE}/search/taggable?q=${encodeURIComponent(query)}`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to search taggable')
      return await response.json()
    } catch (error) {
      console.error('Error searching taggable:', error)
      return []
    }
  }

  // ========================================
  // TAG PROFILE CLAIMS (claiming a tag profile as your identity)
  // ========================================

  async claimTagProfile(profileId, message = null) {
    try {
      const response = await fetch(`${API_BASE}/tag-profiles/${profileId}/claim`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ tag_profile_id: profileId, message })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to claim tag profile')
      }
      return await response.json()
    } catch (error) {
      console.error('Error claiming tag profile:', error)
      throw error
    }
  }

  async getTagProfileClaimsToMe() {
    try {
      const response = await fetch(`${API_BASE}/me/tag-profile-claims`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch tag profile claims')
      return await response.json()
    } catch (error) {
      console.error('Error fetching tag profile claims:', error)
      return []
    }
  }

  async getTagProfileClaimCount() {
    try {
      const response = await fetch(`${API_BASE}/me/tag-profile-claims/count`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) return { count: 0 }
      return await response.json()
    } catch (error) {
      console.error('Error fetching tag profile claim count:', error)
      return { count: 0 }
    }
  }

  async getSentTagProfileClaims() {
    try {
      const response = await fetch(`${API_BASE}/me/tag-profile-claims/sent`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch sent tag profile claims')
      return await response.json()
    } catch (error) {
      console.error('Error fetching sent tag profile claims:', error)
      return []
    }
  }

  async approveTagProfileClaim(claimId) {
    try {
      const response = await fetch(`${API_BASE}/me/tag-profile-claims/${claimId}/approve`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to approve claim')
      return await response.json()
    } catch (error) {
      console.error('Error approving tag profile claim:', error)
      throw error
    }
  }

  async rejectTagProfileClaim(claimId) {
    try {
      const response = await fetch(`${API_BASE}/me/tag-profile-claims/${claimId}/reject`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to reject claim')
      return await response.json()
    } catch (error) {
      console.error('Error rejecting tag profile claim:', error)
      throw error
    }
  }

  // ========================================
  // TAG PROFILE RELATIONSHIPS (multiple relationships per tag profile)
  // ========================================

  async getTagProfileRelationships(profileId) {
    try {
      const response = await fetch(`${API_BASE}/tag-profiles/${profileId}/relationships`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch tag profile relationships')
      return await response.json()
    } catch (error) {
      console.error('Error fetching tag profile relationships:', error)
      return []
    }
  }

  async addTagProfileRelationship(profileId, userId, relationshipType) {
    try {
      const response = await fetch(`${API_BASE}/tag-profiles/${profileId}/relationships`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ user_id: userId, relationship_type: relationshipType })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to add relationship')
      }
      return await response.json()
    } catch (error) {
      console.error('Error adding tag profile relationship:', error)
      throw error
    }
  }

  async removeTagProfileRelationship(profileId, relationshipId) {
    try {
      const response = await fetch(`${API_BASE}/tag-profiles/${profileId}/relationships/${relationshipId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to remove relationship')
      return await response.json()
    } catch (error) {
      console.error('Error removing tag profile relationship:', error)
      throw error
    }
  }

  // ========================================
  // TAG PROFILE RELATIONSHIP REQUESTS (non-creators proposing relationships)
  // ========================================

  async requestTagProfileRelationship(profileId, relationshipType, message = null) {
    try {
      const response = await fetch(`${API_BASE}/tag-profiles/${profileId}/relationship-requests`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ relationship_type: relationshipType, message })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to request relationship')
      }
      return await response.json()
    } catch (error) {
      console.error('Error requesting tag profile relationship:', error)
      throw error
    }
  }

  async getTagProfileRelationshipRequestsToMe() {
    try {
      const response = await fetch(`${API_BASE}/me/tag-profile-relationship-requests`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch relationship requests')
      return await response.json()
    } catch (error) {
      console.error('Error fetching tag profile relationship requests:', error)
      return []
    }
  }

  async getTagProfileRelationshipRequestCount() {
    try {
      const response = await fetch(`${API_BASE}/me/tag-profile-relationship-requests/count`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) return { count: 0 }
      return await response.json()
    } catch (error) {
      console.error('Error fetching relationship request count:', error)
      return { count: 0 }
    }
  }

  async getSentTagProfileRelationshipRequests() {
    try {
      const response = await fetch(`${API_BASE}/me/tag-profile-relationship-requests/sent`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch sent relationship requests')
      return await response.json()
    } catch (error) {
      console.error('Error fetching sent relationship requests:', error)
      return []
    }
  }

  async approveTagProfileRelationshipRequest(requestId) {
    try {
      const response = await fetch(`${API_BASE}/me/tag-profile-relationship-requests/${requestId}/approve`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to approve relationship request')
      return await response.json()
    } catch (error) {
      console.error('Error approving relationship request:', error)
      throw error
    }
  }

  async rejectTagProfileRelationshipRequest(requestId) {
    try {
      const response = await fetch(`${API_BASE}/me/tag-profile-relationship-requests/${requestId}/reject`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to reject relationship request')
      return await response.json()
    } catch (error) {
      console.error('Error rejecting relationship request:', error)
      throw error
    }
  }

  // ========================================
  // BILLING & PAYMENT HISTORY
  // ========================================

  async getPaymentHistory() {
    try {
      const response = await fetch(`${API_BASE}/stripe/payment-history`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch payment history')
      return await response.json()
    } catch (error) {
      console.error('Error fetching payment history:', error)
      return { payments: [], total_spent: '$0.00' }
    }
  }

  async emailBillingHistory() {
    try {
      const response = await fetch(`${API_BASE}/stripe/email-billing-history`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to send billing history email')
      }
      return await response.json()
    } catch (error) {
      console.error('Error emailing billing history:', error)
      throw error
    }
  }

  async getReceiptPreference() {
    try {
      const response = await fetch(`${API_BASE}/stripe/receipt-preference`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) return { notify_payment_receipts: false }
      return await response.json()
    } catch (error) {
      console.error('Error fetching receipt preference:', error)
      return { notify_payment_receipts: false }
    }
  }

  async updateReceiptPreference(enabled) {
    try {
      const response = await fetch(`${API_BASE}/stripe/receipt-preference`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ enabled })
      })
      if (!response.ok) throw new Error('Failed to update receipt preference')
      return await response.json()
    } catch (error) {
      console.error('Error updating receipt preference:', error)
      throw error
    }
  }

  // ========================================
  // USER RELATIONSHIPS
  // ========================================

  async proposeRelationship(otherUserId, myRelationshipToThem, theirRelationshipToMe) {
    try {
      const response = await fetch(`${API_BASE}/relationships/propose`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({
          other_user_id: otherUserId,
          my_relationship_to_them: myRelationshipToThem,
          their_relationship_to_me: theirRelationshipToMe
        })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to propose relationship')
      }
      return await response.json()
    } catch (error) {
      console.error('Error proposing relationship:', error)
      throw error
    }
  }

  async getRelationships() {
    try {
      const response = await fetch(`${API_BASE}/relationships`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch relationships')
      return await response.json()
    } catch (error) {
      console.error('Error fetching relationships:', error)
      return []
    }
  }

  async getRelationshipWith(userId) {
    try {
      const response = await fetch(`${API_BASE}/relationships/with/${userId}`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error('Failed to fetch relationship')
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching relationship:', error)
      return null
    }
  }

  async getPendingRelationshipRequests() {
    try {
      const response = await fetch(`${API_BASE}/relationships/pending`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch pending requests')
      return await response.json()
    } catch (error) {
      console.error('Error fetching pending relationship requests:', error)
      return []
    }
  }

  async getPendingRelationshipCount() {
    try {
      const response = await fetch(`${API_BASE}/relationships/pending/count`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) return { count: 0 }
      return await response.json()
    } catch (error) {
      console.error('Error fetching pending relationship count:', error)
      return { count: 0 }
    }
  }

  async getSentRelationshipRequests() {
    try {
      const response = await fetch(`${API_BASE}/relationships/sent`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch sent requests')
      return await response.json()
    } catch (error) {
      console.error('Error fetching sent relationship requests:', error)
      return []
    }
  }

  async acceptRelationship(relationshipId) {
    try {
      const response = await fetch(`${API_BASE}/relationships/${relationshipId}/accept`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to accept relationship')
      }
      return await response.json()
    } catch (error) {
      console.error('Error accepting relationship:', error)
      throw error
    }
  }

  async rejectRelationship(relationshipId) {
    try {
      const response = await fetch(`${API_BASE}/relationships/${relationshipId}/reject`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to reject relationship')
      }
      return await response.json()
    } catch (error) {
      console.error('Error rejecting relationship:', error)
      throw error
    }
  }

  async deleteRelationship(relationshipId) {
    try {
      const response = await fetch(`${API_BASE}/relationships/${relationshipId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to delete relationship')
      return await response.json()
    } catch (error) {
      console.error('Error deleting relationship:', error)
      throw error
    }
  }

  async getRelationshipTypes() {
    try {
      const response = await fetch(`${API_BASE}/relationships/types`)
      if (!response.ok) throw new Error('Failed to fetch relationship types')
      return await response.json()
    } catch (error) {
      console.error('Error fetching relationship types:', error)
      return { types: [] }
    }
  }

  // ========================================
  // MUTED USERS
  // ========================================

  async getMutedUsers() {
    try {
      const response = await fetch(`${API_BASE}/users/me/muted`, {
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) throw new Error('Failed to fetch muted users')
      return await response.json()
    } catch (error) {
      console.error('Error fetching muted users:', error)
      return []
    }
  }

  async muteUser(userId) {
    try {
      const response = await fetch(`${API_BASE}/users/${userId}/mute`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to mute user (${response.status})`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error muting user:', error)
      throw error
    }
  }

  async unmuteUser(userId) {
    try {
      const response = await fetch(`${API_BASE}/users/${userId}/mute`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to unmute user (${response.status})`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error unmuting user:', error)
      throw error
    }
  }

  // ========================================
  // FEEDBACK & ERROR LOGGING
  // ========================================

  async submitFeedback(feedbackData) {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers,
        body: JSON.stringify(feedbackData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to submit feedback')
      }

      return await response.json()
    } catch (error) {
      console.error('Error submitting feedback:', error)
      throw error
    }
  }

  async logClientError(errorData) {
    try {
      // Fire and forget - don't block on errors
      const headers = await this.getAuthHeaders()
      fetch(`${API_BASE}/feedback/log-error`, {
        method: 'POST',
        headers,
        body: JSON.stringify(errorData)
      }).catch(() => {
        // Silently fail - we don't want error logging to cause more errors
      })
    } catch {
      // Silently fail
    }
  }

  // ========================================
  // ADMIN ENDPOINTS (Superuser only)
  // ========================================

  async getAdminStats() {
    const response = await fetch(`${API_BASE}/admin/stats`, {
      headers: await this.getAuthHeaders()
    })
    if (!response.ok) throw new Error('Failed to fetch admin stats')
    return await response.json()
  }

  async getAdminUsers(search = '', skip = 0, limit = 50) {
    const params = new URLSearchParams({ skip, limit })
    if (search) params.append('search', search)
    const response = await fetch(`${API_BASE}/admin/users?${params}`, {
      headers: await this.getAuthHeaders()
    })
    if (!response.ok) throw new Error('Failed to fetch admin users')
    return await response.json()
  }

  async toggleSuperuser(userId, isSuperuser) {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/superuser`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ is_superuser: isSuperuser })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to toggle superuser')
    }
    return await response.json()
  }

  async getAdminEvents(search = '', includeDeleted = false, skip = 0, limit = 50) {
    const params = new URLSearchParams({ skip, limit, include_deleted: includeDeleted })
    if (search) params.append('search', search)
    const response = await fetch(`${API_BASE}/admin/events?${params}`, {
      headers: await this.getAuthHeaders()
    })
    if (!response.ok) throw new Error('Failed to fetch admin events')
    return await response.json()
  }

  async toggleEventVisibility(eventId) {
    const response = await fetch(`${API_BASE}/admin/events/${eventId}/visibility`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders()
    })
    if (!response.ok) throw new Error('Failed to toggle event visibility')
    return await response.json()
  }

  async getAdminFeedback(statusFilter = '', skip = 0, limit = 50) {
    const params = new URLSearchParams({ skip, limit })
    if (statusFilter) params.append('status_filter', statusFilter)
    const response = await fetch(`${API_BASE}/admin/feedback?${params}`, {
      headers: await this.getAuthHeaders()
    })
    if (!response.ok) throw new Error('Failed to fetch admin feedback')
    return await response.json()
  }

  async updateAdminFeedback(feedbackId, data) {
    const response = await fetch(`${API_BASE}/admin/feedback/${feedbackId}`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to update feedback')
    return await response.json()
  }
}

export default new ApiService()