import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../components/Toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import apiService from '../services/api'
import RichTextEditor from '../components/RichTextEditor'
import styles from './CreateEvent.module.css'

function EditEvent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    description: '',
    start_date: '',
    end_date: '',
    location_name: '',
    cover_image_url: ''
  })
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [isPublished, setIsPublished] = useState(false)

  useEffect(() => {
    loadEvent()
  }, [id])

  async function loadEvent() {
    try {
      const event = await apiService.getEvent(id)
      if (!event) {
        showToast('Event not found', 'error')
        navigate('/')
        return
      }

      setFormData({
        title: event.title || '',
        summary: event.summary || '',
        description: event.description || '',
        start_date: event.start_date ? event.start_date.split('T')[0] : '',
        end_date: event.end_date ? event.end_date.split('T')[0] : '',
        location_name: event.location_name || '',
        cover_image_url: event.cover_image_url || ''
      })

      if (event.start_date) {
        setStartDate(new Date(event.start_date))
      }
      if (event.end_date) {
        setEndDate(new Date(event.end_date))
      }
      setIsPublished(event.is_published)
      setPreviewUrl(event.cover_image_url || '')
      setLoading(false)
    } catch (error) {
      console.error('Error loading event:', error)
      showToast('Failed to load event', 'error')
      navigate('/')
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image must be smaller than 10MB', 'error')
      return
    }

    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result)
    }
    reader.readAsDataURL(file)

    // Upload immediately
    setIsUploading(true)
    try {
      const result = await apiService.uploadImage(file)
      setFormData({
        ...formData,
        cover_image_url: result.url
      })
      showToast('Image uploaded successfully!', 'success')
    } catch (error) {
      console.error('Error uploading image:', error)
      showToast('Failed to upload image. Please try again.', 'error')
      setSelectedFile(null)
      setPreviewUrl('')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e, shouldPublish) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const updateData = {
        ...formData,
        start_date: formData.start_date ? `${formData.start_date}T00:00:00` : '',
        end_date: formData.end_date ? `${formData.end_date}T00:00:00` : formData.start_date ? `${formData.start_date}T00:00:00` : '',
        is_published: shouldPublish !== undefined ? shouldPublish : isPublished
      }

      const event = await apiService.updateEvent(id, updateData)

      const action = shouldPublish !== undefined
        ? (shouldPublish ? 'published' : 'saved as draft')
        : 'updated'

      showToast(`Event ${action} successfully!`, 'success')
      navigate(`/event/${event.id}`)
    } catch (error) {
      console.error('Error updating event:', error)
      showToast(error.message || 'Failed to update event. Please try again.', 'error')
      setIsSubmitting(false)
    }
  }

  const handleSaveDraft = (e) => {
    handleSubmit(e, false)
  }

  const handlePublish = (e) => {
    handleSubmit(e, true)
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.formWrapper}>
          <p style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading event...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>Edit Event</h1>

        <form onSubmit={(e) => handleSubmit(e)} className={styles.form}>
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
            <label htmlFor="summary">Summary (Optional)</label>
            <input
              type="text"
              id="summary"
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              placeholder="A brief one-line description for cards"
              maxLength={150}
            />
            <span className={styles.hint}>
              This short summary appears on event cards in the feed. Keep it concise!
            </span>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Event Story</label>
            <RichTextEditor
              content={formData.description}
              onChange={(html) => setFormData({ ...formData, description: html })}
              placeholder="Share your experience... Add text, images, and tell your story in a beautiful magazine-style layout."
            />
            <span className={styles.hint}>
              Use the toolbar to format text, add headings, and insert images. Your content will be displayed like a blog post.
            </span>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="start_date">Start Date</label>
              <DatePicker
                selected={startDate}
                onChange={(date) => {
                  setStartDate(date)
                  const dateStr = date ? date.toISOString().split('T')[0] : ''
                  setFormData({ ...formData, start_date: dateStr })
                }}
                dateFormat="MMMM d, yyyy"
                placeholderText="Select start date"
                className={styles.datePicker}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="end_date">End Date (Optional)</label>
              <DatePicker
                selected={endDate}
                onChange={(date) => {
                  setEndDate(date)
                  const dateStr = date ? date.toISOString().split('T')[0] : ''
                  setFormData({ ...formData, end_date: dateStr })
                }}
                minDate={startDate}
                dateFormat="MMMM d, yyyy"
                placeholderText="Select end date"
                className={styles.datePicker}
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
            <label htmlFor="cover_image">Cover Image</label>
            <input
              type="file"
              id="cover_image"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            <span className={styles.hint}>
              {isUploading ? 'Uploading...' : 'Select an image (max 10MB, JPG/PNG/GIF/WebP)'}
            </span>
          </div>

          <div className={styles.preview}>
            <label>Cover Image Preview</label>
            {previewUrl || formData.cover_image_url ? (
              <div
                className={styles.previewImage}
                style={{ backgroundImage: `url(${previewUrl || formData.cover_image_url})` }}
              ></div>
            ) : (
              <div className={styles.previewPlaceholder}>
                <div>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.3, marginBottom: '8px' }}>
                    <path d="M4 5h13v7h2V5c0-1.103-.897-2-2-2H4c-1.103 0-2 .897-2 2v12c0 1.103.897 2 2 2h8v-2H4V5z"/>
                    <path d="m8 11-3 4h11l-4-6-3 4z"/>
                    <path d="M19 14h-2v3h-3v2h3v3h2v-3h3v-2h-3z"/>
                  </svg>
                  <p>Select an image to see a preview</p>
                </div>
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={() => navigate(`/event/${id}`)}>
              Cancel
            </button>
            <button type="button" className={styles.draftButton} onClick={handleSaveDraft} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save as Draft'}
            </button>
            <button type="button" className={styles.submitButton} onClick={handlePublish} disabled={isSubmitting}>
              {isSubmitting ? 'Publishing...' : isPublished ? 'Update & Publish' : 'Publish Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditEvent
