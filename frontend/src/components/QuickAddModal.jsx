import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import apiService from '../services/api'
import LocationAutocomplete from './LocationAutocomplete'
import styles from './QuickAddModal.module.css'

const CATEGORIES = [
  { value: 'Daily Life', icon: '📷' },
  { value: 'Birthday', icon: '🎂' },
  { value: 'Anniversary', icon: '💝' },
  { value: 'Vacation', icon: '✈️' },
  { value: 'Family Gathering', icon: '👨‍👩‍👧‍👦' },
  { value: 'Holiday', icon: '🎄' },
  { value: 'Graduation', icon: '🎓' },
  { value: 'Wedding', icon: '💒' },
  { value: 'Baby', icon: '👶' },
  { value: 'Achievement', icon: '🏆' }
]

function QuickAddModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const fileInputRef = useRef(null)

  // Form state
  const [media, setMedia] = useState([]) // Array of {file, url, uploading, type, previewUrl}
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [showDescription, setShowDescription] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [location, setLocation] = useState(null)
  const [category, setCategory] = useState('Daily Life')
  const [errors, setErrors] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Dropdown states
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)

  // Load last location on mount
  useEffect(() => {
    if (isOpen && user) {
      loadLastLocation()
    }
  }, [isOpen, user])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setMedia([])
      setTitle('')
      setDescription('')
      setShowDescription(false)
      setDate(new Date().toISOString().split('T')[0])
      setCategory('Daily Life')
      setErrors([])
      setIsSubmitting(false)
    }
  }, [isOpen])

  const loadLastLocation = async () => {
    try {
      const lastLoc = await apiService.getLastEventLocation()
      if (lastLoc) {
        setLocation(lastLoc)
      }
    } catch (error) {
      console.error('Failed to load last location:', error)
    }
  }

  const handleFileSelect = async (files) => {
    const fileArray = Array.from(files)

    for (const file of fileArray) {
      // Validate file type
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')

      if (!isImage && !isVideo) {
        showToast('Please select image or video files', 'error')
        continue
      }

      // Validate file size
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024
      if (file.size > maxSize) {
        showToast(`${isVideo ? 'Video' : 'Image'} must be smaller than ${isVideo ? '50' : '10'}MB`, 'error')
        continue
      }

      // Create preview and add to state
      const previewUrl = URL.createObjectURL(file)
      const mediaItem = {
        file,
        url: null,
        uploading: true,
        type: isVideo ? 'video' : 'image',
        previewUrl
      }

      setMedia(prev => [...prev, mediaItem])

      // Upload immediately
      try {
        let uploadedUrl
        if (isVideo) {
          uploadedUrl = await apiService.uploadVideo(file)
        } else {
          const result = await apiService.uploadImage(file)
          uploadedUrl = result.url
        }

        // Update the media item with the uploaded URL
        setMedia(prev => prev.map(m =>
          m.previewUrl === previewUrl
            ? { ...m, url: uploadedUrl, uploading: false }
            : m
        ))
      } catch (error) {
        console.error('Upload failed:', error)
        showToast('Failed to upload file', 'error')
        // Remove failed upload
        setMedia(prev => prev.filter(m => m.previewUrl !== previewUrl))
        URL.revokeObjectURL(previewUrl)
      }
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const removeMedia = (previewUrl) => {
    setMedia(prev => {
      const item = prev.find(m => m.previewUrl === previewUrl)
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }
      return prev.filter(m => m.previewUrl !== previewUrl)
    })
  }

  const handleLocationSelect = (loc) => {
    setLocation({
      location_name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude
    })
    setShowLocationDropdown(false)
  }

  const validate = () => {
    const newErrors = []

    if (!title.trim()) {
      newErrors.push('Please add a title')
    }

    const uploadedMedia = media.filter(m => m.url && !m.uploading)
    if (uploadedMedia.length === 0) {
      newErrors.push('Please add at least one image')
    } else {
      const hasImage = uploadedMedia.some(m => m.type === 'image')
      if (!hasImage) {
        newErrors.push('Please add at least one image that can be used as the cover photo')
      }
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handlePublish = async () => {
    if (!validate()) return

    setIsSubmitting(true)

    try {
      const uploadedMedia = media.filter(m => m.url && !m.uploading)

      // First image becomes cover
      const coverImage = uploadedMedia.find(m => m.type === 'image')

      // Build description HTML with all media
      let descriptionHtml = description.trim()
      if (!descriptionHtml) {
        // Auto-generate description with embedded images
        descriptionHtml = uploadedMedia.map(m => {
          if (m.type === 'video') {
            return `<p><video src="${m.url}" controls style="max-width: 100%;"></video></p>`
          }
          return `<p><img src="${m.url}" alt="" style="max-width: 100%;" /></p>`
        }).join('\n')
      } else {
        // Append media after user's description
        const mediaHtml = uploadedMedia.map(m => {
          if (m.type === 'video') {
            return `<p><video src="${m.url}" controls style="max-width: 100%;"></video></p>`
          }
          return `<p><img src="${m.url}" alt="" style="max-width: 100%;" /></p>`
        }).join('\n')
        descriptionHtml = `<p>${descriptionHtml}</p>\n${mediaHtml}`
      }

      const eventData = {
        title: title.trim(),
        description: descriptionHtml,
        start_date: date ? `${date}T00:00:00` : new Date().toISOString(),
        end_date: date ? `${date}T00:00:00` : new Date().toISOString(),
        cover_image_url: coverImage?.url || '',
        privacy_level: 'followers',
        category: category,
        location_name: location?.location_name || null,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        has_multiple_locations: true
      }

      const event = await apiService.createEvent(eventData, true)

      showToast('Event published!', 'success')
      onClose()
      navigate(`/event/${event.slug || event.id}`)
    } catch (error) {
      console.error('Failed to publish:', error)
      const errorMessage = error.message || 'Failed to publish event'

      if (errorMessage.includes('Free plan limit')) {
        showToast('Free plan limit reached. Please upgrade to Premium.', 'error')
      } else {
        showToast(errorMessage, 'error')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const uploadingCount = media.filter(m => m.uploading).length
  const isPublishDisabled = isSubmitting || uploadingCount > 0

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <button className={styles.closeButton} onClick={onClose}>×</button>
          <h2 className={styles.title}>Quick Add</h2>
          <span className={styles.subtitle}>Capture now, add details later</span>
        </div>

        <div className={styles.content}>
          {/* Media Upload Section */}
          <div className={styles.section}>
            <label className={styles.label}>
              Photos/Videos <span className={styles.required}>*</span>
              <span className={styles.requiredTooltip} title="Required">Required</span>
            </label>

            <div
              className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              {media.length === 0 ? (
                <div className={styles.dropzoneEmpty}>
                  <span className={styles.dropzoneIcon}>📷</span>
                  <p>Drop your photos here to start a quick memory</p>
                  <span className={styles.dropzoneHint}>or click to browse</span>
                </div>
              ) : (
                <div className={styles.mediaGrid}>
                  {media.map((m, idx) => (
                    <div key={m.previewUrl} className={styles.mediaItem}>
                      {m.type === 'video' ? (
                        <video src={m.previewUrl} className={styles.mediaThumbnail} />
                      ) : (
                        <img src={m.previewUrl} alt="" className={styles.mediaThumbnail} />
                      )}
                      {m.uploading && (
                        <div className={styles.uploadingOverlay}>
                          <div className={styles.spinner}></div>
                        </div>
                      )}
                      {idx === 0 && m.type === 'image' && !m.uploading && (
                        <span className={styles.coverBadge}>Cover</span>
                      )}
                      {!m.uploading && (
                        <button
                          className={styles.removeMedia}
                          onClick={(e) => { e.stopPropagation(); removeMedia(m.previewUrl) }}
                        >×</button>
                      )}
                    </div>
                  ))}
                  <div className={styles.addMoreMedia}>
                    <span>+</span>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              style={{ display: 'none' }}
            />
            <span className={styles.hint}>(First image becomes cover)</span>
          </div>

          {/* Title Section */}
          <div className={styles.section}>
            <label className={styles.label}>
              Title <span className={styles.required}>*</span>
              <span className={styles.requiredTooltip} title="Required">Required</span>
            </label>
            <input
              type="text"
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's this memory about?"
            />
          </div>

          {/* Optional Section Divider */}
          <div className={styles.optionalDivider}>
            <span>Optional</span>
          </div>

          {/* Description Toggle */}
          <div className={styles.section}>
            {!showDescription ? (
              <button
                type="button"
                className={styles.optionalToggle}
                onClick={() => setShowDescription(true)}
              >
                📝 Add Description <span className={styles.optionalLabel}>optional</span>
              </button>
            ) : (
              <>
                <label className={styles.label}>Description</label>
                <textarea
                  className={styles.textarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add some context to your memory..."
                  rows={3}
                />
              </>
            )}
          </div>

          {/* Optional Fields Row */}
          <div className={styles.optionalRow}>
            {/* Date */}
            <div className={styles.optionalField}>
              <input
                type="date"
                className={styles.dateInput}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <span className={styles.optionalFieldLabel}>optional</span>
            </div>

            {/* Location */}
            <div className={styles.optionalField}>
              <div className={styles.locationWrapper}>
                <button
                  type="button"
                  className={styles.locationButton}
                  onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                >
                  📍 {location?.location_name || 'Location'}
                </button>
                {showLocationDropdown && (
                  <div className={styles.locationDropdown}>
                    <LocationAutocomplete
                      onSelect={handleLocationSelect}
                      placeholder="Search location..."
                    />
                    {location && (
                      <button
                        type="button"
                        className={styles.clearLocation}
                        onClick={() => { setLocation(null); setShowLocationDropdown(false) }}
                      >
                        Clear location
                      </button>
                    )}
                  </div>
                )}
              </div>
              <span className={styles.optionalFieldLabel}>optional</span>
            </div>

            {/* Category */}
            <div className={styles.optionalField}>
              <div className={styles.categoryWrapper}>
                <button
                  type="button"
                  className={styles.categoryButton}
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  {CATEGORIES.find(c => c.value === category)?.icon} {category}
                </button>
                {showCategoryDropdown && (
                  <div className={styles.categoryDropdown}>
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        type="button"
                        className={`${styles.categoryOption} ${category === cat.value ? styles.selected : ''}`}
                        onClick={() => { setCategory(cat.value); setShowCategoryDropdown(false) }}
                      >
                        {cat.icon} {cat.value}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className={styles.optionalFieldLabel}>optional</span>
            </div>
          </div>

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className={styles.errors}>
              {errors.map((error, idx) => (
                <p key={idx} className={styles.error}>{error}</p>
              ))}
            </div>
          )}

          {/* Footer Hint */}
          <div className={styles.footerHint}>
            💡 You can always add a description, tag people, and more by editing later
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.publishButton}
            onClick={handlePublish}
            disabled={isPublishDisabled}
          >
            {isSubmitting ? 'Publishing...' : uploadingCount > 0 ? `Uploading (${uploadingCount})...` : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuickAddModal
