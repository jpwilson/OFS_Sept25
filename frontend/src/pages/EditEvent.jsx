import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../components/Toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import apiService from '../services/api'
import RichTextEditor from '../components/RichTextEditor'
import LocationSelectionModal from '../components/LocationSelectionModal'
import LocationAutocomplete from '../components/LocationAutocomplete'
import { validateLocationCount } from '../utils/locationExtractor'
import styles from './CreateEvent.module.css'

function EditEvent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    short_title: '',
    summary: '',
    description: '',
    start_date: '',
    end_date: '',
    location_name: '',
    latitude: null,
    longitude: null,
    cover_image_url: '',
    has_multiple_locations: false
  })
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [allLocations, setAllLocations] = useState([])
  const [selectedLocations, setSelectedLocations] = useState([])
  const [pendingPublish, setPendingPublish] = useState(true)
  const [captionsExpanded, setCaptionsExpanded] = useState(false)
  const [imageCaptions, setImageCaptions] = useState({})
  const [existingEventImages, setExistingEventImages] = useState([])

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
        short_title: event.short_title || '',
        summary: event.summary || '',
        description: event.description || '',
        start_date: event.start_date ? event.start_date.split('T')[0] : '',
        end_date: event.end_date ? event.end_date.split('T')[0] : '',
        location_name: event.location_name || '',
        latitude: event.latitude || null,
        longitude: event.longitude || null,
        cover_image_url: event.cover_image_url || '',
        has_multiple_locations: event.has_multiple_locations || false
      })

      if (event.start_date) {
        setStartDate(new Date(event.start_date))
      }
      if (event.end_date) {
        setEndDate(new Date(event.end_date))
      }
      setIsPublished(event.is_published)
      setPreviewUrl(event.cover_image_url || '')

      // Load existing event images with captions
      try {
        const eventImages = await apiService.getEventImages(id)
        setExistingEventImages(eventImages || [])

        // Pre-populate imageCaptions state with existing captions
        const captionMap = {}
        eventImages.forEach(img => {
          if (img.caption) {
            captionMap[img.image_url] = img.caption
          }
        })
        setImageCaptions(captionMap)
      } catch (error) {
        console.error('Error loading event images:', error)
        // Non-critical, continue loading
      }

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

  const handleLocationSelect = (location) => {
    setFormData({
      ...formData,
      location_name: location.name,
      latitude: location.latitude,
      longitude: location.longitude
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

  // Extract image URLs from HTML content
  const extractImagesFromContent = () => {
    if (!formData.description) return []

    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = formData.description
    const imgElements = tempDiv.querySelectorAll('img')

    return Array.from(imgElements).map(img => ({
      url: img.src,
      alt: img.alt || ''
    }))
  }

  const handleCaptionChange = (imageUrl, caption) => {
    setImageCaptions(prev => ({
      ...prev,
      [imageUrl]: caption
    }))
  }

  const handleSubmit = async (e, shouldPublish) => {
    e.preventDefault()

    // Only validate locations if has_multiple_locations is checked
    if (formData.has_multiple_locations) {
      const validation = await validateLocationCount(formData.description)

      if (!validation.isValid) {
        // More than 20 locations - show selection modal
        setAllLocations(validation.locations)
        setPendingPublish(shouldPublish !== undefined ? shouldPublish : isPublished)
        setShowLocationModal(true)
        showToast(`Found ${validation.count} locations. Please select up to ${validation.maxLocations}.`, 'error')
        return
      }
    }

    setIsSubmitting(true)

    try {
      const updateData = {
        ...formData,
        start_date: formData.start_date ? `${formData.start_date}T00:00:00` : '',
        end_date: formData.end_date ? `${formData.end_date}T00:00:00` : formData.start_date ? `${formData.start_date}T00:00:00` : '',
        is_published: shouldPublish !== undefined ? shouldPublish : isPublished
      }

      const event = await apiService.updateEvent(id, updateData)

      // Save/update image captions
      const contentImages = extractImagesFromContent()
      const captionPromises = contentImages.map((img, index) => {
        const caption = imageCaptions[img.url]
        const existingImage = existingEventImages.find(ei => ei.image_url === img.url)

        if (caption && caption.trim()) {
          if (existingImage) {
            // Update existing caption if changed
            if (existingImage.caption !== caption.trim()) {
              return apiService.updateEventImageCaption(existingImage.id, caption.trim())
            }
          } else {
            // Create new event image record
            return apiService.createEventImage({
              event_id: parseInt(id),
              image_url: img.url,
              caption: caption.trim(),
              order_index: index,
              alt_text: img.alt || null
            })
          }
        } else if (existingImage && existingImage.caption) {
          // Caption was removed, update to null
          return apiService.updateEventImageCaption(existingImage.id, null)
        }
        return Promise.resolve()
      })

      await Promise.all(captionPromises)

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

  const handleLocationConfirm = (selectedLocs) => {
    setSelectedLocations(selectedLocs)
    // TODO: In the future, we'll need to remove unselected location markers from the HTML
    // For now, we'll just store the selection and show a warning
    showToast(`${selectedLocs.length} locations selected. Note: You'll need to manually remove extra location markers from your content.`, 'success')
    setShowLocationModal(false)
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
            <label htmlFor="short_title">
              Short Title (Optional)
              <span className={styles.helpText} title="A shorter version of your title for mobile devices. If not provided, only the first 3 words of your title will be shown on mobile.">
                ⓘ
              </span>
            </label>
            <input
              type="text"
              id="short_title"
              name="short_title"
              value={formData.short_title}
              onChange={handleChange}
              placeholder="e.g., SA Sept '25"
              maxLength={50}
            />
            <small className={styles.fieldHint}>
              Used for cleaner display on mobile devices (e.g., "SA Sept '25" instead of "South Africa September-October 2025")
            </small>
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

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.has_multiple_locations}
                onChange={(e) => setFormData({ ...formData, has_multiple_locations: e.target.checked })}
                className={styles.checkbox}
              />
              <span>This event involves multiple locations (e.g., travel itinerary, road trip)</span>
            </label>
            {formData.has_multiple_locations && (
              <p className={styles.hint}>
                You can add up to 20 location markers in your content using the location pin button in the editor toolbar.
              </p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Event Story</label>
            <RichTextEditor
              content={formData.description}
              onChange={(html) => setFormData({ ...formData, description: html })}
              placeholder="Share your experience... Add text, images, and tell your story in a beautiful magazine-style layout."
              eventStartDate={formData.start_date}
              eventEndDate={formData.end_date}
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
            <LocationAutocomplete
              onSelect={handleLocationSelect}
              placeholder="Search for a location..."
            />
            {formData.location_name && (
              <span className={styles.hint}>
                Selected: {formData.location_name}
              </span>
            )}
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

          {/* Image Captions Section */}
          {(() => {
            const contentImages = extractImagesFromContent()
            if (contentImages.length > 0) {
              return (
                <div className={styles.captionSection}>
                  <button
                    type="button"
                    className={styles.captionToggle}
                    onClick={() => setCaptionsExpanded(!captionsExpanded)}
                  >
                    <span className={styles.captionToggleIcon}>
                      {captionsExpanded ? '▼' : '▶'}
                    </span>
                    <span>Image Captions (Optional)</span>
                    <span className={styles.imageCount}>
                      {contentImages.length} {contentImages.length === 1 ? 'image' : 'images'}
                    </span>
                  </button>

                  {captionsExpanded && (
                    <div className={styles.captionList}>
                      {contentImages.map((img, index) => (
                        <div key={img.url} className={styles.captionItem}>
                          <div className={styles.captionThumbnail}>
                            <img src={img.url} alt={img.alt || `Image ${index + 1}`} />
                          </div>
                          <div className={styles.captionInputWrapper}>
                            <textarea
                              className={styles.captionInput}
                              value={imageCaptions[img.url] || ''}
                              onChange={(e) => handleCaptionChange(img.url, e.target.value)}
                              placeholder={`Caption for image ${index + 1} (e.g., "Sunset over Table Mountain from our hotel room")`}
                              maxLength={200}
                              rows={2}
                            />
                            <div className={styles.captionCharCount}>
                              {(imageCaptions[img.url] || '').length}/200
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            }
            return null
          })()}

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

      <LocationSelectionModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        locations={allLocations}
        onConfirm={handleLocationConfirm}
      />
    </div>
  )
}

export default EditEvent
