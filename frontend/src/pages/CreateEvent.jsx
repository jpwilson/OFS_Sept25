import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast'
import apiService from '../services/api'
import styles from './CreateEvent.module.css'

function CreateEvent() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    location_name: '',
    cover_image_url: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const event = await apiService.createEvent({
        ...formData,
        start_date: formData.start_date ? `${formData.start_date}T00:00:00` : '',
        end_date: formData.end_date ? `${formData.end_date}T00:00:00` : formData.start_date ? `${formData.start_date}T00:00:00` : ''
      })

      showToast('Event created successfully!', 'success')
      navigate(`/event/${event.id}`)
    } catch (error) {
      console.error('Error creating event:', error)
      showToast(error.message || 'Failed to create event. Please try again.', 'error')
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>Create New Event</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Event Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Give your event a memorable title"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Tell us about your event"
              rows="4"
              required
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="start_date">Start Date</label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="end_date">End Date</label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="location_name">Location</label>
            <input
              type="text"
              id="location_name"
              name="location_name"
              value={formData.location_name}
              onChange={handleChange}
              placeholder="Where did this happen?"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="cover_image_url">Cover Image URL</label>
            <input
              type="url"
              id="cover_image_url"
              name="cover_image_url"
              value={formData.cover_image_url}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
            <span className={styles.hint}>For now, use an image URL from Unsplash or similar</span>
          </div>

          <div className={styles.preview}>
            <label>Cover Image Preview</label>
            {formData.cover_image_url ? (
              <div
                className={styles.previewImage}
                style={{ backgroundImage: `url(${formData.cover_image_url})` }}
              ></div>
            ) : (
              <div className={styles.previewPlaceholder}>
                <div>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.3, marginBottom: '8px' }}>
                    <path d="M4 5h13v7h2V5c0-1.103-.897-2-2-2H4c-1.103 0-2 .897-2 2v12c0 1.103.897 2 2 2h8v-2H4V5z"/>
                    <path d="m8 11-3 4h11l-4-6-3 4z"/>
                    <path d="M19 14h-2v3h-3v2h3v3h2v-3h3v-2h-3z"/>
                  </svg>
                  <p>Add a cover image URL above to see a preview</p>
                </div>
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={() => navigate('/')}>
              Cancel
            </button>
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateEvent