import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import { extractGPSFromImage } from '../utils/exifExtractor'
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
  { value: 'Achievement', icon: '🏆' },
  { value: 'Milestone', icon: '🏅' },
  { value: 'Project', icon: '🔨' },
  { value: 'Custom', icon: '✨' }
]

function QuickAddModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { user, isSuperuser } = useAuth()
  const { showToast } = useToast()
  const fileInputRef = useRef(null)
  const {
    isRecording, audioBlob, audioUrl, duration,
    startRecording, stopRecording, clearRecording
  } = useVoiceRecorder()

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

  // AI mode state
  const [aiMode, setAiMode] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [rawText, setRawText] = useState('')
  const [aiResult, setAiResult] = useState(null)
  const [descriptionChoice, setDescriptionChoice] = useState('enhanced')
  const [customHtml, setCustomHtml] = useState('')
  const [photoExifData, setPhotoExifData] = useState({}) // {previewUrl: {latitude, longitude, timestamp}}
  const [photoPlaceNames, setPhotoPlaceNames] = useState({}) // {cloudinaryUrl: placeName}

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
      setAiMode(false)
      setIsTranscribing(false)
      setIsGenerating(false)
      setRawText('')
      setAiResult(null)
      setDescriptionChoice('enhanced')
      setCustomHtml('')
      setPhotoExifData({})
      setPhotoPlaceNames({})
      clearRecording()
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

  // Reverse geocode GPS coordinates to get a place name
  const reverseGeocode = async (latitude, longitude, cloudinaryUrl) => {
    try {
      const result = await apiService.reverseGeocode(latitude, longitude)
      if (result?.name) {
        setPhotoPlaceNames(prev => ({ ...prev, [cloudinaryUrl]: result.name }))
      }
    } catch (error) {
      console.warn('Reverse geocode failed:', error)
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

      // Extract EXIF in AI mode for images
      if (aiMode && isImage) {
        extractGPSFromImage(file).then(exifData => {
          if (exifData) {
            setPhotoExifData(prev => ({ ...prev, [previewUrl]: exifData }))
          }
        })
      }

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

        // In AI mode, reverse geocode if we have EXIF GPS data
        if (aiMode && isImage) {
          // Use a small delay to allow EXIF extraction to complete
          setTimeout(() => {
            setPhotoExifData(current => {
              const exif = current[previewUrl]
              if (exif?.latitude && exif?.longitude) {
                reverseGeocode(exif.latitude, exif.longitude, uploadedUrl)
              }
              return current
            })
          }, 500)
        }
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
      // Clean up EXIF and place name data
      if (item?.url) {
        setPhotoPlaceNames(prev => {
          const next = { ...prev }
          delete next[item.url]
          return next
        })
      }
      setPhotoExifData(prev => {
        const next = { ...prev }
        delete next[previewUrl]
        return next
      })
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

  // --- AI Mode Functions ---

  const handleTranscribe = async () => {
    if (!audioBlob) return
    setIsTranscribing(true)
    try {
      const result = await apiService.transcribeAudio(audioBlob)
      setRawText(prev => prev ? `${prev} ${result.text}` : result.text)
      clearRecording()
      showToast('Audio transcribed!', 'success')
    } catch (error) {
      showToast('Failed to transcribe audio', 'error')
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleGenerateAI = async () => {
    const uploadedMedia = media.filter(m => m.url && !m.uploading && m.type === 'image')

    if (uploadedMedia.length === 0 && !rawText.trim()) {
      showToast('Please add photos or enter a description', 'error')
      return
    }

    setIsGenerating(true)
    try {
      // Build photo data with EXIF info and place names
      const photos = uploadedMedia.map(m => {
        const exif = photoExifData[m.previewUrl] || {}
        return {
          image_url: m.url,
          place_name: photoPlaceNames[m.url] || null,
          latitude: exif.latitude || null,
          longitude: exif.longitude || null,
          timestamp: exif.timestamp || null
        }
      })

      const result = await apiService.generateAIStory(photos, rawText)
      setAiResult(result)

      // Auto-fill fields from AI result
      if (result.suggested_title) setTitle(result.suggested_title)
      if (result.suggested_category) {
        const validCat = CATEGORIES.find(c => c.value === result.suggested_category)
        if (validCat) setCategory(result.suggested_category)
      }
      if (result.location_name && !location) {
        setLocation({ location_name: result.location_name, latitude: null, longitude: null })
      }
      setDescriptionChoice('enhanced')
      showToast('AI story generated!', 'success')
    } catch (error) {
      showToast(error.message || 'Failed to generate AI story', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const getSelectedDescription = () => {
    if (!aiMode || !aiResult) {
      return description.trim()
    }
    switch (descriptionChoice) {
      case 'original':
        return rawText.trim()
      case 'enhanced':
        return aiResult.story_html
      case 'custom':
        return customHtml
      default:
        return aiResult.story_html
    }
  }

  // --- Validation & Publish ---

  const validate = () => {
    const newErrors = []

    if (!title.trim()) {
      newErrors.push('Please add a title')
    }

    if (!aiMode) {
      // Normal mode: require at least one image
      const uploadedMedia = media.filter(m => m.url && !m.uploading)
      if (uploadedMedia.length === 0) {
        newErrors.push('Please add at least one image')
      } else {
        const hasImage = uploadedMedia.some(m => m.type === 'image')
        if (!hasImage) {
          newErrors.push('Please add at least one image that can be used as the cover photo')
        }
      }
    } else {
      // AI mode: require photos or text
      const uploadedMedia = media.filter(m => m.url && !m.uploading)
      if (uploadedMedia.length === 0 && !rawText.trim() && !aiResult) {
        newErrors.push('Please add photos or enter a description')
      }
      if (!aiResult) {
        newErrors.push('Please generate AI content first')
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

      let descriptionHtml

      if (aiMode && aiResult) {
        descriptionHtml = getSelectedDescription()

        // If using original text and it's plain text, wrap in HTML
        if (descriptionChoice === 'original' && descriptionHtml && !descriptionHtml.includes('<')) {
          // Build plain text + images
          const mediaHtml = uploadedMedia.map(m => {
            if (m.type === 'video') {
              return `<p><video src="${m.url}" controls style="max-width: 100%;"></video></p>`
            }
            return `<p><img src="${m.url}" alt="" style="max-width: 100%;" /></p>`
          }).join('\n')
          descriptionHtml = `<p>${descriptionHtml}</p>\n${mediaHtml}`
        }
      } else {
        // Normal Quick Add mode
        descriptionHtml = description.trim()
        if (!descriptionHtml) {
          descriptionHtml = uploadedMedia.map(m => {
            if (m.type === 'video') {
              return `<p><video src="${m.url}" controls style="max-width: 100%;"></video></p>`
            }
            return `<p><img src="${m.url}" alt="" style="max-width: 100%;" /></p>`
          }).join('\n')
        } else {
          const mediaHtml = uploadedMedia.map(m => {
            if (m.type === 'video') {
              return `<p><video src="${m.url}" controls style="max-width: 100%;"></video></p>`
            }
            return `<p><img src="${m.url}" alt="" style="max-width: 100%;" /></p>`
          }).join('\n')
          descriptionHtml = `<p>${descriptionHtml}</p>\n${mediaHtml}`
        }
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

      // Save photo captions if AI generated them
      if (aiMode && aiResult?.photo_captions?.length > 0) {
        for (const cap of aiResult.photo_captions) {
          if (cap.image_url && cap.caption) {
            try {
              await apiService.createEventImage({
                event_id: event.id,
                image_url: cap.image_url,
                caption: cap.caption,
                display_order: 0
              })
            } catch (e) {
              console.warn('Failed to save caption for image:', e)
            }
          }
        }
      }

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
  const isPublishDisabled = isSubmitting || uploadingCount > 0 || (aiMode && !aiResult && !isGenerating)

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} ${aiMode ? styles.modalExpanded : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <button className={styles.closeButton} onClick={onClose}>×</button>

          {isSuperuser ? (
            <div className={styles.modeToggle}>
              <button
                className={`${styles.modeButton} ${!aiMode ? styles.activeMode : ''}`}
                onClick={() => setAiMode(false)}
              >
                Quick Add
              </button>
              <button
                className={`${styles.modeButton} ${aiMode ? styles.activeMode : ''}`}
                onClick={() => setAiMode(true)}
              >
                AI Assist
              </button>
            </div>
          ) : (
            <h2 className={styles.title}>Quick Add</h2>
          )}
          <span className={styles.subtitle}>
            {aiMode ? 'Upload photos, describe your event, let AI write the story' : 'Capture now, add details later'}
          </span>
        </div>

        <div className={styles.content}>
          {/* Media Upload Section */}
          <div className={styles.section}>
            <label className={styles.label}>
              Photos/Videos {!aiMode && <span className={styles.required}>*</span>}
              {!aiMode && <span className={styles.requiredTooltip} title="Required">Required</span>}
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
                      {aiMode && !m.uploading && m.url && photoPlaceNames[m.url] && (
                        <span className={styles.placeBadge}>{photoPlaceNames[m.url]}</span>
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
            <span className={styles.hint}>
              {aiMode ? '(GPS data from photos will be used for location. First image becomes cover)' : '(First image becomes cover)'}
            </span>
          </div>

          {/* AI Mode: Voice & Text Input */}
          {aiMode && (
            <div className={styles.section}>
              <label className={styles.label}>Describe Your Event</label>
              <p className={styles.aiHint}>Record a voice note or type a description. The AI will use this along with your photos to write the story.</p>

              {/* Voice Recorder */}
              <div className={styles.voiceSection}>
                {!isRecording && !audioBlob && (
                  <button
                    type="button"
                    className={styles.voiceButton}
                    onClick={startRecording}
                  >
                    🎤 Record Voice Note
                  </button>
                )}

                {isRecording && (
                  <div className={styles.recordingActive}>
                    <span className={styles.recordingDot}></span>
                    <span className={styles.recordingTime}>{formatDuration(duration)}</span>
                    <button
                      type="button"
                      className={styles.stopButton}
                      onClick={stopRecording}
                    >
                      ⏹ Stop
                    </button>
                  </div>
                )}

                {audioBlob && !isRecording && (
                  <div className={styles.audioPreview}>
                    <audio src={audioUrl} controls className={styles.audioPlayer} />
                    <div className={styles.audioActions}>
                      <button
                        type="button"
                        className={styles.transcribeButton}
                        onClick={handleTranscribe}
                        disabled={isTranscribing}
                      >
                        {isTranscribing ? 'Transcribing...' : '📝 Transcribe'}
                      </button>
                      <button
                        type="button"
                        className={styles.clearAudioButton}
                        onClick={clearRecording}
                      >
                        ✕ Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Text Input */}
              <textarea
                className={styles.textarea}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Type or dictate your event description... (optional if you have photos)"
                rows={4}
              />

              {/* Generate Button */}
              <button
                type="button"
                className={styles.generateButton}
                onClick={handleGenerateAI}
                disabled={isGenerating || uploadingCount > 0}
              >
                {isGenerating ? (
                  <>
                    <span className={styles.spinner}></span>
                    Generating story...
                  </>
                ) : (
                  '✨ Generate with AI'
                )}
              </button>
            </div>
          )}

          {/* AI Result Preview */}
          {aiMode && aiResult && (
            <div className={styles.section}>
              <label className={styles.label}>AI Result</label>

              <div className={styles.resultPanels}>
                {/* Original panel */}
                <div className={styles.resultPanel}>
                  <div className={styles.panelHeader}>
                    <span>Your Original</span>
                    <button
                      type="button"
                      className={`${styles.panelSelect} ${descriptionChoice === 'original' ? styles.panelActive : ''}`}
                      onClick={() => setDescriptionChoice('original')}
                    >
                      {descriptionChoice === 'original' ? 'Selected' : 'Use This'}
                    </button>
                  </div>
                  <div className={styles.panelContent}>
                    {aiResult.original_text
                      ? <p className={styles.originalText}>{aiResult.original_text}</p>
                      : <p className={styles.noContent}>Photos only - no text provided</p>
                    }
                  </div>
                </div>

                {/* Enhanced panel */}
                <div className={styles.resultPanel}>
                  <div className={styles.panelHeader}>
                    <span>AI Enhanced</span>
                    <button
                      type="button"
                      className={`${styles.panelSelect} ${descriptionChoice === 'enhanced' ? styles.panelActive : ''}`}
                      onClick={() => setDescriptionChoice('enhanced')}
                    >
                      {descriptionChoice === 'enhanced' ? 'Selected' : 'Use This'}
                    </button>
                  </div>
                  <div
                    className={styles.panelContent}
                    dangerouslySetInnerHTML={{ __html: aiResult.story_html }}
                  />
                </div>
              </div>

              {/* Custom edit option */}
              <div className={styles.customEditToggle}>
                <button
                  type="button"
                  className={`${styles.panelSelect} ${descriptionChoice === 'custom' ? styles.panelActive : ''}`}
                  onClick={() => {
                    setDescriptionChoice('custom')
                    if (!customHtml) setCustomHtml(aiResult.story_html)
                  }}
                >
                  Edit Custom
                </button>
              </div>

              {descriptionChoice === 'custom' && (
                <textarea
                  className={`${styles.textarea} ${styles.customEditor}`}
                  value={customHtml}
                  onChange={(e) => setCustomHtml(e.target.value)}
                  rows={8}
                  placeholder="Edit the HTML content..."
                />
              )}
            </div>
          )}

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
              placeholder={aiMode ? 'AI will suggest a title, or type your own' : "What's this memory about?"}
            />
          </div>

          {/* Optional Section Divider */}
          {!aiMode && (
            <div className={styles.optionalDivider}>
              <span>Optional</span>
            </div>
          )}

          {/* Description Toggle (normal mode only) */}
          {!aiMode && (
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
          )}

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
            {aiMode
              ? '✨ AI will analyze your photos and text to create a structured story with headings'
              : '💡 You can always add a description, tag people, and more by editing later'
            }
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
