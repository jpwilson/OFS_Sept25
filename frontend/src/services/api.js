import { mockEventsForFeed } from '../data/mockEvents'

const API_BASE = '/api/v1'

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
      // Return full URL by prepending the API base
      return {
        ...data,
        url: `http://localhost:8000${data.url}`
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
}

export default new ApiService()