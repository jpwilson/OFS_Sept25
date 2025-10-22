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
}

export default new ApiService()