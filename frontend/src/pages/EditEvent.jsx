import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import apiService from '../services/api'
import RichTextEditor from '../components/RichTextEditor'
import LocationSelectionModal from '../components/LocationSelectionModal'
import LocationAutocomplete from '../components/LocationAutocomplete'
import PrivacySelector from '../components/PrivacySelector'
import CategorySelector from '../components/CategorySelector'
import TagPicker from '../components/TagPicker'
import CreateTagProfileModal from '../components/CreateTagProfileModal'
import TagBadge from '../components/TagBadge'
import { validateLocationCount } from '../utils/locationExtractor'
import styles from './CreateEvent.module.css'

function EditEvent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, canAccessContent, isExpired, isTrialExpired } = useAuth()
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
    has_multiple_locations: true,
    privacy_level: 'public',
    category: '',
    category_2: '',
    custom_group_id: null
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
  const [selectedTags, setSelectedTags] = useState([])
  const [existingTags, setExistingTags] = useState([])
  const [showTagProfileModal, setShowTagProfileModal] = useState(false)
  const [newTagProfileName, setNewTagProfileName] = useState('')
  const [isDraggingCover, setIsDraggingCover] = useState(false)
  const [eventNumericId, setEventNumericId] = useState(null) // Store actual numeric ID from loaded event

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

      // Store the actual numeric event ID (URL param might be a slug)
      setEventNumericId(event.id)

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
        has_multiple_locations: true,
        privacy_level: event.privacy_level || 'public',
        category: event.category || '',
        category_2: event.category_2 || '',
        custom_group_id: event.custom_group_id || null
      })

      if (event.start_date) {
        setStartDate(new Date(event.start_date))
      }
      if (event.end_date) {
        setEndDate(new Date(event.end_date))
      }
      setIsPublished(event.is_published)
      setPreviewUrl(event.cover_image_url || '')

      // Load existing event images with captions (use numeric ID, not slug)
      try {
        const eventImages = await apiService.getEventImages(event.id)
        setExistingEventImages(eventImages || [])

        // Pre-populate imageCaptions state with existing captions
        // Need to map eventImage URLs to HTML URLs (may differ in /full/ vs /medium/ path)
        const captionMap = {}

        // Helper to normalize URLs for matching
        const normalizeUrlForMatch = (url) => {
          if (!url) return ''
          return url.replace('/full/', '/').replace('/medium/', '/').replace('/thumbnails/', '/')
        }
        const getFilenameFromUrl = (url) => url?.split('/').pop()?.split('?')[0] || ''

        // Extract HTML image URLs from the loaded description
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = event.description || ''
        const htmlImages = Array.from(tempDiv.querySelectorAll('img, video'))
        const htmlUrls = htmlImages.map(el => el.src)

        // For each eventImage with a caption, find matching HTML URL
        eventImages.forEach(img => {
          if (img.caption) {
            const normalizedImgUrl = normalizeUrlForMatch(img.image_url)
            const imgFilename = getFilenameFromUrl(img.image_url)

            // Find matching HTML URL
            let matchingHtmlUrl = htmlUrls.find(url => normalizeUrlForMatch(url) === normalizedImgUrl)
            if (!matchingHtmlUrl) {
              matchingHtmlUrl = htmlUrls.find(url => getFilenameFromUrl(url) === imgFilename)
            }

            // Store caption under the HTML URL (which is used for lookups)
            if (matchingHtmlUrl) {
              captionMap[matchingHtmlUrl] = img.caption
            } else {
              // Fallback: store under original eventImage URL
              captionMap[img.image_url] = img.caption
            }
          }
        })
        setImageCaptions(captionMap)
      } catch (error) {
        console.error('Error loading event images:', error)
        // Non-critical, continue loading
      }

      // Load existing tags (use numeric ID, not slug)
      try {
        const tags = await apiService.getEventTags(event.id)
        setExistingTags(tags || [])
        // Convert to TagPicker format
        const tagPickerFormat = (tags || []).map(tag => {
          if (tag.tagged_user_id) {
            return {
              type: 'user',
              id: tag.tagged_user_id,
              name: tag.tagged_user_display_name || tag.tagged_user_username,
              display_name: tag.tagged_user_display_name,
              photo_url: tag.tagged_user_avatar_url,
              username: tag.tagged_user_username
            }
          } else {
            return {
              type: 'profile',
              id: tag.tag_profile_id,
              name: tag.tag_profile_name,
              photo_url: tag.tag_profile_photo_url,
              relationship_to_creator: tag.tag_profile_relationship,
              created_by_username: tag.tag_profile_created_by_username
            }
          }
        })
        setSelectedTags(tagPickerFormat)
      } catch (error) {
        console.error('Error loading event tags:', error)
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
      // Use functional update to avoid stale closure issues
      setFormData(prev => ({
        ...prev,
        cover_image_url: result.url
      }))
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

  // Handle cover image drop (drag and drop)
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
      // Use functional update to avoid stale closure issues
      setFormData(prev => ({
        ...prev,
        cover_image_url: result.url
      }))
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

  // Normalize URL for comparison (handles /full/, /medium/, /thumbnails/ variations)
  const normalizeUrl = (url) => {
    if (!url) return ''
    return url.replace('/full/', '/').replace('/medium/', '/').replace('/thumbnails/', '/')
  }

  // Get filename from URL for fallback matching
  const getFilename = (url) => url?.split('/').pop()?.split('?')[0] || ''

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

  const handleSubmit = async (e, shouldPublish) => {
    e.preventDefault()

    // Validate location count (max 20)
    const validation = await validateLocationCount(formData.description)
    if (!validation.isValid) {
      setAllLocations(validation.locations)
      setPendingPublish(shouldPublish !== undefined ? shouldPublish : isPublished)
      setShowLocationModal(true)
      showToast(`Found ${validation.count} locations. Please select up to ${validation.maxLocations}.`, 'error')
      return
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

      // Save/update media captions (images and videos)
      const contentMedia = extractMediaFromContent()
      const captionPromises = contentMedia.map((media, index) => {
        const caption = imageCaptions[media.url]

        // Find existing image using normalized URL matching (handles /full/, /medium/, /thumbnails/ variations)
        const normalizedMediaUrl = normalizeUrl(media.url)
        const mediaFilename = getFilename(media.url)
        let existingImage = existingEventImages.find(ei => normalizeUrl(ei.image_url) === normalizedMediaUrl)
        // Fallback to filename matching if URL match fails
        if (!existingImage) {
          existingImage = existingEventImages.find(ei => getFilename(ei.image_url) === mediaFilename)
        }

        if (caption && caption.trim()) {
          if (existingImage) {
            // Update existing caption if changed
            if (existingImage.caption !== caption.trim()) {
              return apiService.updateEventImageCaption(existingImage.id, caption.trim())
            }
          } else {
            // Create new event image record (only if truly no existing record)
            // Validate required fields before API call
            if (!media.url || !media.url.startsWith('http')) {
              return Promise.resolve()
            }
            if (!eventNumericId) {
              console.error('No numeric event ID available for creating event image')
              return Promise.resolve()
            }
            return apiService.createEventImage({
              event_id: eventNumericId,
              image_url: media.url,
              caption: caption.trim(),
              order_index: index,
              alt_text: media.alt || null,
              media_type: media.type || 'image'
            })
          }
        } else if (existingImage && existingImage.caption) {
          // Caption was removed, update to null
          return apiService.updateEventImageCaption(existingImage.id, null)
        }
        return Promise.resolve()
      })

      await Promise.all(captionPromises)

      // Handle tags - remove old ones that are no longer selected, add new ones
      // First, find tags to remove
      const currentTagKeys = selectedTags.map(t =>
        t.type === 'user' ? `user:${t.id}` : `profile:${t.id}`
      )
      const existingTagKeys = existingTags.map(t =>
        t.tagged_user_id ? `user:${t.tagged_user_id}` : `profile:${t.tag_profile_id}`
      )

      // Remove tags that were deleted (use numeric ID, not slug)
      for (const tag of existingTags) {
        const key = tag.tagged_user_id ? `user:${tag.tagged_user_id}` : `profile:${tag.tag_profile_id}`
        if (!currentTagKeys.includes(key)) {
          await apiService.removeEventTag(eventNumericId, tag.id)
        }
      }

      // Add new tags (use numeric ID, not slug)
      const newTags = selectedTags.filter(t => {
        const key = t.type === 'user' ? `user:${t.id}` : `profile:${t.id}`
        return !existingTagKeys.includes(key)
      })

      if (newTags.length > 0) {
        const tagsToAdd = newTags.map(tag => ({
          user_id: tag.type === 'user' ? tag.id : null,
          profile_id: tag.type === 'profile' ? tag.id : null
        }))
        await apiService.addEventTags(eventNumericId, tagsToAdd)
      }

      const action = shouldPublish !== undefined
        ? (shouldPublish ? 'published' : 'saved as draft')
        : 'updated'

      showToast(`Event ${action} successfully!`, 'success')
      navigate(`/event/${event.slug || event.id}`)
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

  const isBlocked = user && !canAccessContent && (isExpired || isTrialExpired)

  return (
    <>
    {isBlocked && (
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px 28px',
        textAlign: 'center',
        color: 'white',
        fontSize: '15px',
        fontWeight: 500
      }}>
        <div style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 700 }}>
          You are no longer able to edit or create events
        </div>
        <div style={{ opacity: 0.9, marginBottom: '12px' }}>
          Upgrade to Pro to regain full access to event creation and editing.
        </div>
        <a href="/billing" style={{
          display: 'inline-block',
          background: 'white',
          color: '#764ba2',
          padding: '10px 24px',
          borderRadius: '8px',
          fontWeight: 700,
          textDecoration: 'none'
        }}>
          Upgrade to Pro
        </a>
      </div>
    )}
    <div style={isBlocked ? { opacity: 0.4, pointerEvents: 'none', filter: 'grayscale(0.5)' } : undefined}>
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

          <PrivacySelector
            value={formData.privacy_level}
            onChange={(value) => setFormData({ ...formData, privacy_level: value })}
            customGroupId={formData.custom_group_id}
            onCustomGroupChange={(value) => setFormData({ ...formData, custom_group_id: value })}
          />

          <CategorySelector
            value={formData.category}
            value2={formData.category_2}
            onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            onChange2={(value) => setFormData(prev => ({ ...prev, category_2: value }))}
          />

          <div className={styles.formGroup}>
            <label>Tag People (Optional)</label>
            <TagPicker
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              onCreateProfile={(name) => {
                setNewTagProfileName(name)
                setShowTagProfileModal(true)
              }}
            />
            <span className={styles.hint}>
              Tag family members, friends, or pets who are in this event
            </span>
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
              eventStartDate={formData.start_date}
              eventEndDate={formData.end_date}
              eventId={eventNumericId}
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
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                yearDropdownItemNumber={100}
                scrollableYearDropdown
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
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                yearDropdownItemNumber={100}
                scrollableYearDropdown
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

      <CreateTagProfileModal
        isOpen={showTagProfileModal}
        onClose={() => {
          setShowTagProfileModal(false)
          setNewTagProfileName('')
        }}
        onCreated={(profile) => {
          // Add the newly created profile to selected tags
          setSelectedTags(prev => [...prev, {
            type: 'profile',
            id: profile.id,
            name: profile.name,
            photo_url: profile.photo_url,
            relationship_to_creator: profile.relationship_to_creator,
            created_by_username: profile.created_by_username
          }])
        }}
        initialName={newTagProfileName}
      />
    </div>
    </div>
    </>
  )
}

export default EditEvent
