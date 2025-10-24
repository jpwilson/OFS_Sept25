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

  async createEvent(eventData) {
    try {
      const response = await fetch(`${API_BASE}/events`, {
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
}

export default new ApiService()