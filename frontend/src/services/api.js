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

  async getEvents() {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE}/events`, { headers })
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

  // Compress image to stay under Vercel's 4.5MB limit
  async compressImage(file, maxSizeMB = 4) {
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

  // Event Image methods (for caption system)
  async uploadEventImage(file, eventId, caption = null, orderIndex = 0) {
    try {
      // Compress image for faster uploads and to fix EXIF orientation
      // Canvas API automatically applies EXIF orientation when drawing
      const processedFile = await this.compressImage(file)

      const formData = new FormData()
      formData.append('file', processedFile)
      formData.append('event_id', eventId.toString())
      if (caption) formData.append('caption', caption)
      formData.append('order_index', orderIndex.toString())

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || localStorage.getItem('token')

      const response = await fetch(`${API_BASE}/upload/event-image`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to upload event image')
      }

      return await response.json()
    } catch (error) {
      console.error('Error uploading event image:', error)
      throw error
    }
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
        throw new Error(error.detail || 'Failed to create event image metadata')
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

  async likeMedia(mediaId) {
    try {
      const response = await fetch(`${API_BASE}/media/${mediaId}/likes`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
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
}

export default new ApiService()