import { mockEventsForFeed } from '../data/mockEvents'

const API_BASE = '/api/v1'

class ApiService {
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
}

export default new ApiService()