import { useState, useRef } from 'react'
import api from '../services/api'
import ImageCropper from './ImageCropper'
import styles from './CreateTagProfileModal.module.css'

const RELATIONSHIP_OPTIONS = [
  'daughter',
  'son',
  'child',
  'pet',
  'dog',
  'cat',
  'mother',
  'father',
  'grandmother',
  'grandfather',
  'sister',
  'brother',
  'aunt',
  'uncle',
  'cousin',
  'niece',
  'nephew',
  'friend',
  'other'
]

function CreateTagProfileModal({ isOpen, onClose, onCreated, initialName = '' }) {
  const [name, setName] = useState(initialName)
  const [relationship, setRelationship] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoPreview, setPhotoPreview] = useState(null)
  const [cropperImage, setCropperImage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const profile = await api.createTagProfile({
        name: name.trim(),
        relationship_to_creator: relationship || null,
        photo_url: photoUrl || null
      })

      onCreated(profile)
      handleClose()
    } catch (err) {
      setError(err.message || 'Failed to create tag profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setName('')
    setRelationship('')
    setPhotoUrl('')
    setPhotoPreview(null)
    setCropperImage(null)
    setError('')
    setIsDragging(false)
    onClose()
  }

  const handleFileSelect = (file) => {
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB')
      return
    }

    // Create preview URL for cropper
    const reader = new FileReader()
    reader.onload = () => {
      setCropperImage(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleCropComplete = async (croppedBlob) => {
    setIsUploading(true)
    setCropperImage(null)
    setError('')

    try {
      const file = new File([croppedBlob], 'tag-profile-photo.jpg', { type: 'image/jpeg' })
      const data = await api.uploadImage(file)

      const imageUrl = data.url || data.urls?.medium || data.urls?.full

      if (!imageUrl) {
        throw new Error('No URL returned from upload')
      }

      setPhotoUrl(imageUrl)
      setPhotoPreview(imageUrl)
    } catch (err) {
      setError('Failed to upload image. Please try again.')
      console.error('Upload error:', err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleCropCancel = () => {
    setCropperImage(null)
  }

  const handleRemovePhoto = () => {
    setPhotoUrl('')
    setPhotoPreview(null)
  }

  const handlePhotoAreaClick = () => {
    fileInputRef.current?.click()
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Create Tag Profile</h2>
          <button className={styles.closeButton} onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <p className={styles.description}>
            Create a profile for someone who isn't on Our Family Socials yet
            (like a pet, child, or relative). They'll be able to claim this
            profile if they join later.
          </p>

          {error && <div className={styles.error}>{error}</div>}

          {/* Photo Upload */}
          <div className={styles.field}>
            <label>Photo (optional)</label>
            {photoPreview ? (
              <div className={styles.photoPreviewContainer}>
                <img src={photoPreview} alt="Preview" className={styles.photoPreview} />
                <div className={styles.photoActions}>
                  <button
                    type="button"
                    className={styles.changePhotoButton}
                    onClick={handlePhotoAreaClick}
                    disabled={isUploading}
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    className={styles.removePhotoButton}
                    onClick={handleRemovePhoto}
                    disabled={isUploading}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ''}`}
                onClick={handlePhotoAreaClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {isUploading ? (
                  <div className={styles.uploading}>Uploading...</div>
                ) : (
                  <>
                    <span className={styles.dropZoneIcon}>📷</span>
                    <span className={styles.dropZoneText}>
                      {isDragging ? 'Drop image here' : 'Tap to select or drag photo here'}
                    </span>
                  </>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              style={{ display: 'none' }}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="name">Name *</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Emma, Buddy, Grandma Rose"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="relationship">Relationship to you</label>
            <select
              id="relationship"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
            >
              <option value="">Select...</option>
              {RELATIONSHIP_OPTIONS.map(rel => (
                <option key={rel} value={rel}>
                  {rel.charAt(0).toUpperCase() + rel.slice(1)}
                </option>
              ))}
            </select>
            <p className={styles.hint}>
              This helps others identify the right person when tagging.
            </p>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting || isUploading || !name.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Image Cropper Modal */}
      {cropperImage && (
        <ImageCropper
          image={cropperImage}
          aspect={1}
          shape="round"
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  )
}

export default CreateTagProfileModal
