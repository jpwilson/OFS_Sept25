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
import UpgradeModal from '../components/UpgradeModal'
import PrivacySelector from '../components/PrivacySelector'
import CategorySelector from '../components/CategorySelector'
import { validateLocationCount } from '../utils/locationExtractor'
import styles from './CreateEvent.module.css'

function CreateEvent() {
  const navigate = useNavigate()
  const { user, isTrialExpired, canAccessContent } = useAuth()
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
    has_multiple_locations: true,
    privacy_level: 'followers',
    category: 'Daily Life',
    custom_group_id: null
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
  const [gpsLocations, setGpsLocations] = useState([])
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [captionsExpanded, setCaptionsExpanded] = useState(true) // Auto-expand on first publish
  const [imageCaptions, setImageCaptions] = useState({})
  const [shortTitleExpanded, setShortTitleExpanded] = useState(false)
  const [isDraggingCover, setIsDraggingCover] = useState(false)

  const handleGPSExtracted = (gpsData) => {
    setGpsLocations(prev => [...prev, gpsData])
    console.log('GPS data extracted:', gpsData)
  }

  // Extract image URLs from HTML content
  const extractMediaFromContent = () => {
    if (!formData.description) return []

    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = formData.description

    // Get all media elements (images and videos) in document order
    const mediaElements = tempDiv.querySelectorAll('img, video')

    return Array.from(mediaElements).map((element, index) => {
      const isVideo = element.tagName === 'VIDEO'
      return {
        url: element.src,
        alt: element.alt || '',
        type: isVideo ? 'video' : 'image',
        index
      }
    })
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

    // Validate location count (max 20)
    const validation = await validateLocationCount(formData.description)
    if (!validation.isValid) {
      setAllLocations(validation.locations)
      setPendingPublish(isPublished)
      setShowLocationModal(true)
      showToast(`Found ${validation.count} locations. Please select up to ${validation.maxLocations}.`, 'error')
      return
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

      // Save media captions (images and videos) to event_images table
      const contentMedia = extractMediaFromContent()
      const captionPromises = contentMedia.map((media, index) => {
        const caption = imageCaptions[media.url]
        if (caption && caption.trim()) {
          // Only save media that have captions
          return apiService.createEventImage({
            event_id: event.id,
            image_url: media.url,
            caption: caption.trim(),
            order_index: index,
            alt_text: media.alt || null,
            media_type: media.type
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

  // Handle cover image drop
  const handleCoverDrop = async (e) => {
    e.preventDefault()
    setIsDraggingCover(false)

    const file = e.dataTransfer.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please drop an image file', 'error')
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
      showToast('Cover image uploaded!', 'success')
    } catch (error) {
      console.error('Error uploading image:', error)
      showToast('Failed to upload image. Please try again.', 'error')
      setSelectedFile(null)
      setPreviewUrl('')
    } finally {
      setIsUploading(false)
    }
  }

  // Block expired trial users from creating events - show upgrade modal immediately
  if (user && isTrialExpired && !canAccessContent) {
    return (
      <div className={styles.container}>
        <div className={styles.formWrapper}>
          <h1 className={styles.title}>Create New Event</h1>
          <UpgradeModal
            isOpen={true}
            onClose={() => navigate('/feed')}
            context="create"
          />
        </div>
      </div>
    )
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
              placeholder="e.g., South African Family Vacation, September-October 2025"
              required
            />
            <button
              type="button"
              className={styles.shortTitleToggle}
              onClick={() => setShortTitleExpanded(!shortTitleExpanded)}
            >
              {shortTitleExpanded ? '▼' : '▶'} Short title?
            </button>
            {shortTitleExpanded && (
              <div className={styles.shortTitleSection}>
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
                  Used for cleaner display on mobile devices
                </small>
              </div>
            )}
          </div>

          <PrivacySelector
            value={formData.privacy_level}
            onChange={(value) => setFormData({ ...formData, privacy_level: value })}
            customGroupId={formData.custom_group_id}
            onCustomGroupChange={(value) => setFormData({ ...formData, custom_group_id: value })}
          />

          <CategorySelector
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value })}
          />

          <div className={styles.formGroup}>
            <label htmlFor="description">Event Story</label>
            <RichTextEditor
              content={formData.description}
              onChange={(html) => setFormData({ ...formData, description: html })}
              placeholder="Share your experience... Add text, images, and tell your story in a beautiful magazine-style layout."
              eventStartDate={formData.start_date}
              eventEndDate={formData.end_date}
              onGPSExtracted={handleGPSExtracted}
              gpsExtractionEnabled={true}
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
                onDragOver={(e) => { e.preventDefault(); setIsDraggingCover(true) }}
                onDragLeave={() => setIsDraggingCover(false)}
                onDrop={handleCoverDrop}
              ></div>
            ) : (
              <div
                className={`${styles.previewPlaceholder} ${isDraggingCover ? styles.dragging : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingCover(true) }}
                onDragLeave={() => setIsDraggingCover(false)}
                onDrop={handleCoverDrop}
              >
                <div>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.3, marginBottom: '8px' }}>
                    <path d="M4 5h13v7h2V5c0-1.103-.897-2-2-2H4c-1.103 0-2 .897-2 2v12c0 1.103.897 2 2 2h8v-2H4V5z"/>
                    <path d="m8 11-3 4h11l-4-6-3 4z"/>
                    <path d="M19 14h-2v3h-3v2h3v3h2v-3h3v-2h-3z"/>
                  </svg>
                  <p>{isDraggingCover ? 'Drop image here' : 'Drag & drop or select an image'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Multimedia Captions Section */}
          {(() => {
            const contentMedia = extractMediaFromContent()
            if (contentMedia.length > 0) {
              const imageCount = contentMedia.filter(m => m.type === 'image').length
              const videoCount = contentMedia.filter(m => m.type === 'video').length

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
                    <span>Multimedia Captions (Optional)</span>
                    <span className={styles.imageCount}>
                      {imageCount > 0 && `${imageCount} ${imageCount === 1 ? 'image' : 'images'}`}
                      {imageCount > 0 && videoCount > 0 && ', '}
                      {videoCount > 0 && `${videoCount} ${videoCount === 1 ? 'video' : 'videos'}`}
                    </span>
                  </button>

                  {captionsExpanded && (
                    <div className={styles.captionList}>
                      {contentMedia.map((media, index) => (
                        <div key={media.url} className={styles.captionItem}>
                          <div className={styles.captionThumbnail}>
                            {media.type === 'video' ? (
                              <video src={media.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <img src={media.url} alt={media.alt || `Image ${index + 1}`} />
                            )}
                          </div>
                          <div className={styles.captionInputWrapper}>
                            <textarea
                              className={styles.captionInput}
                              value={imageCaptions[media.url] || ''}
                              onChange={(e) => handleCaptionChange(media.url, e.target.value)}
                              placeholder={media.type === 'video'
                                ? `Caption for video ${index + 1} (e.g., "Kids playing at the beach")`
                                : `Caption for image ${index + 1} (e.g., "Sunset over Table Mountain from our hotel room")`
                              }
                              maxLength={200}
                              rows={2}
                            />
                            <div className={styles.captionCharCount}>
                              {(imageCaptions[media.url] || '').length}/200
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

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={handleUpgradeModalClose}
        onSaveAsDraft={handleUpgradeModalSaveAsDraft}
      />
    </div>
  )
}

export default CreateEvent