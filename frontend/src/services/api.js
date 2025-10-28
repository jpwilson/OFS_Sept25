import { mockEventsForFeed } from '../data/mockEvents'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_BASE = `${API_URL}/api/v1`

class ApiService {
  getAuthHeaders() {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  async getEvents() {
    try {
      const response = await fetch(`${API_BASE}/events`)
      if (!response.ok) throw new Error('Failed to fetch events')
      return await response.json()
    } catch (error) {
      console.error('Error fetching events:', error)
      // Return mock data if API fails
      return mockEventsForFeed
    }
  }

  async getEvent(id) {
    try {
      const response = await fetch(`${API_BASE}/events/${id}`)
      if (!response.ok) throw new Error('Failed to fetch event')
      return await response.json()
    } catch (error) {
      console.error('Error fetching event:', error)
      return null
    }
  }

  async createEvent(eventData, isPublished = true) {
    try {
      const url = `${API_BASE}/events?is_published=${isPublished}`
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
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
        headers: this.getAuthHeaders(),
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
        headers: this.getAuthHeaders()
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
        headers: this.getAuthHeaders()
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
        headers: this.getAuthHeaders()
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
        headers: this.getAuthHeaders()
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
        headers: this.getAuthHeaders()
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

  async uploadImage(file) {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('token')
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
      // Return full URL by prepending the API URL
      return {
        ...data,
        url: `${API_URL}${data.url}`
      }
    } catch (error) {
      console.error('Error uploading image:', error)
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
        headers: this.getAuthHeaders()
      })

      if (!response.ok) throw new Error('Failed to fetch following')
      return await response.json()
    } catch (error) {
      console.error('Error fetching following:', error)
      return []
    }
  }

  async followUser(username) {
    try {
      const response = await fetch(`${API_BASE}/users/${username}/follow`, {
        method: 'POST',
        headers: this.getAuthHeaders()
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
        headers: this.getAuthHeaders()
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
        headers: this.getAuthHeaders()
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
        headers: this.getAuthHeaders()
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
        headers: this.getAuthHeaders()
      })

      if (!response.ok) throw new Error('Failed to fetch following')
      return await response.json()
    } catch (error) {
      console.error('Error fetching following:', error)
      return []
    }
  }

  // Follow Requests
  async getFollowRequests() {
    try {
      const response = await fetch(`${API_BASE}/users/me/follow-requests`, {
        headers: this.getAuthHeaders()
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
        headers: this.getAuthHeaders()
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
        headers: this.getAuthHeaders()
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
        headers: this.getAuthHeaders()
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
        headers: this.getAuthHeaders()
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
        headers: this.getAuthHeaders(),
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
        headers: this.getAuthHeaders(),
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
        headers: this.getAuthHeaders()
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
        headers: this.getAuthHeaders()
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
        headers: this.getAuthHeaders()
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
        headers: this.getAuthHeaders()
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
        headers: this.getAuthHeaders()
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
        headers: this.getAuthHeaders(),
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
        headers: this.getAuthHeaders()
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
        headers: this.getAuthHeaders(),
        body: JSON.stringify(locationIds)
      })
      if (!response.ok) throw new Error('Failed to reorder locations')
      return await response.json()
    } catch (error) {
      console.error('Error reordering locations:', error)
      throw error
    }
  }
}

export default new ApiService()