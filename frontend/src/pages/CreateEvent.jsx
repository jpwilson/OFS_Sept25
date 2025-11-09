import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import apiService from '../services/api'
import RichTextEditor from '../components/RichTextEditor'
import LocationSelectionModal from '../components/LocationSelectionModal'
import LocationAutocomplete from '../components/LocationAutocomplete'
import GPSExtractionModal from '../components/GPSExtractionModal'
import UpgradeModal from '../components/UpgradeModal'
import { validateLocationCount } from '../utils/locationExtractor'
import styles from './CreateEvent.module.css'

function CreateEvent() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [formData, setFormData] = useState({
    title: '',
    short_title: '',
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
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [allLocations, setAllLocations] = useState([])
  const [selectedLocations, setSelectedLocations] = useState([])
  const [pendingPublish, setPendingPublish] = useState(true)
  const [showGPSModal, setShowGPSModal] = useState(false)
  const [gpsExtractionEnabled, setGPSExtractionEnabled] = useState(false)
  const [gpsLocations, setGpsLocations] = useState([])
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [captionsExpanded, setCaptionsExpanded] = useState(false)
  const [imageCaptions, setImageCaptions] = useState({})

  // Check GPS extraction preference on component mount
  useEffect(() => {
    const preference = localStorage.getItem('gpsExtractionPreference')
    if (preference === 'enabled') {
      setGPSExtractionEnabled(true)
    }
  }, [])

  const handleGPSExtracted = (gpsData) => {
    setGpsLocations(prev => [...prev, gpsData])
    console.log('GPS data extracted:', gpsData)
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

  const handleSubmit = async (e, isPublished = true) => {
    e.preventDefault()

    // Validate required fields for drafts too
    if (!formData.title || !formData.start_date) {
      showToast('Please provide at least a title and start date', 'error')
      return
    }

    // Only validate locations if has_multiple_locations is checked
    if (formData.has_multiple_locations) {
      const validation = await validateLocationCount(formData.description)

      if (!validation.isValid) {
        // More than 20 locations - show selection modal
        setAllLocations(validation.locations)
        setPendingPublish(isPublished)
        setShowLocationModal(true)
        showToast(`Found ${validation.count} locations. Please select up to ${validation.maxLocations}.`, 'error')
        return
      }
    }

    // Proceed with submission
    setIsSubmitting(true)

    try {
      const event = await apiService.createEvent({
        ...formData,
        start_date: formData.start_date ? `${formData.start_date}T00:00:00` : '',
        end_date: formData.end_date ? `${formData.end_date}T00:00:00` : formData.start_date ? `${formData.start_date}T00:00:00` : '',
        gps_locations: gpsLocations
      }, isPublished)

      // Save image captions to event_images table
      const contentImages = extractImagesFromContent()
      const captionPromises = contentImages.map((img, index) => {
        const caption = imageCaptions[img.url]
        if (caption && caption.trim()) {
          // Only save images that have captions
          return apiService.createEventImage({
            event_id: event.id,
            image_url: img.url,
            caption: caption.trim(),
            order_index: index,
            alt_text: img.alt || null
          })
        }
        return Promise.resolve()
      })

      await Promise.all(captionPromises)

      showToast(isPublished ? 'Event published successfully!' : 'Draft saved successfully!', 'success')

      // Navigate appropriately
      if (isPublished) {
        navigate(`/event/${event.id}`)
      } else {
        // Navigate to profile with drafts tab active
        navigate(`/profile/${user?.username}`, { state: { activeTab: 'drafts' } })
      }
    } catch (error) {
      console.error('Error creating event:', error)
      const errorMessage = error.message || 'Failed to create event. Please try again.'

      // Check if it's a free plan limit error
      if (errorMessage.includes('Free plan limit reached') || errorMessage.includes('limit reached')) {
        // User hit their 5-event limit - show upgrade modal
        setShowUpgradeModal(true)
        setIsSubmitting(false)
      } else {
        // Other error - show toast
        showToast(errorMessage, 'error')
        setIsSubmitting(false)
      }
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

  const handleUpgradeModalSaveAsDraft = () => {
    setShowUpgradeModal(false)
    // Automatically save as draft
    handleSubmit(new Event('submit'), false)
  }

  const handleUpgradeModalClose = () => {
    setShowUpgradeModal(false)
  }

  const handleMultipleLocationsChange = (e) => {
    const isChecked = e.target.checked
    setFormData({ ...formData, has_multiple_locations: isChecked })

    // Show GPS extraction modal if checking the box and modal hasn't been dismissed
    if (isChecked) {
      const modalDismissed = localStorage.getItem('gpsExtractionModalDismissed')
      if (!modalDismissed) {
        setShowGPSModal(true)
      }
    }
  }

  const handleGPSExtractionResponse = (enabled) => {
    setGPSExtractionEnabled(enabled)
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

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.has_multiple_locations}
                onChange={handleMultipleLocationsChange}
                className={styles.checkbox}
              />
              <span>This event involves multiple locations (e.g., travel itinerary, road trip)</span>
            </label>
            {formData.has_multiple_locations && (
              <p className={styles.hint}>
                You can add up to 20 location markers in your content using the location pin button in the editor toolbar.
                {gpsExtractionEnabled && ' GPS data will be automatically extracted from uploaded photos.'}
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
              onGPSExtracted={handleGPSExtracted}
              gpsExtractionEnabled={gpsExtractionEnabled && formData.has_multiple_locations}
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
            <button type="button" className={styles.cancelButton} onClick={() => navigate('/')}>
              Cancel
            </button>
            <button type="button" className={styles.draftButton} onClick={handleSaveDraft} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save as Draft'}
            </button>
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? 'Publishing...' : 'Publish Event'}
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

      <GPSExtractionModal
        isOpen={showGPSModal}
        onClose={() => setShowGPSModal(false)}
        onEnable={handleGPSExtractionResponse}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={handleUpgradeModalClose}
        onSaveAsDraft={handleUpgradeModalSaveAsDraft}
      />
    </div>
  )
}

export default CreateEvent