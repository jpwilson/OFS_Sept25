import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import ImageCropper from '../components/ImageCropper'
import apiService from '../services/api'
import styles from './EditProfile.module.css'

function EditProfile() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()

  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    avatar_url: '',
    banner_url: ''
  })

  // Theme preference
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  })

  const [avatarPreview, setAvatarPreview] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [cropperImage, setCropperImage] = useState(null)
  const [cropperType, setCropperType] = useState(null) // 'avatar' or 'banner'
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const avatarInputRef = useRef(null)
  const bannerInputRef = useRef(null)

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        bio: user.bio || '',
        avatar_url: user.avatar_url || '',
        banner_url: user.banner_url || ''
      })
      setAvatarPreview(user.avatar_url)
      setBannerPreview(user.banner_url)
    }
  }, [user])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAvatarClick = () => {
    avatarInputRef.current?.click()
  }

  const handleBannerClick = () => {
    bannerInputRef.current?.click()
  }

  const handleFileSelect = (e, type) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image must be less than 10MB', 'error')
      return
    }

    // Create preview URL for cropper
    const reader = new FileReader()
    reader.onload = () => {
      setCropperImage(reader.result)
      setCropperType(type)
    }
    reader.readAsDataURL(file)

    // Reset input
    e.target.value = ''
  }

  const handleCropComplete = async (croppedBlob) => {
    setUploading(true)
    setCropperImage(null)

    try {
      // Upload using apiService (handles Supabase auth tokens correctly)
      const file = new File([croppedBlob], 'image.jpg', { type: 'image/jpeg' })
      const data = await apiService.uploadImage(file)

      // Backend returns: { url: "...", urls: { medium: "...", full: "..." } }
      const imageUrl = data.url || data.urls?.medium || data.urls?.full

      console.log('🟢 IMAGE UPLOAD SUCCESS:', { imageUrl, fullResponse: data })

      if (!imageUrl) {
        throw new Error('No URL returned from upload')
      }

      // Update preview and form data
      if (cropperType === 'avatar') {
        setAvatarPreview(imageUrl)
        setFormData(prev => ({ ...prev, avatar_url: imageUrl }))
        console.log('✅ Avatar URL set to:', imageUrl)
        showToast('Avatar uploaded successfully', 'success')
      } else {
        setBannerPreview(imageUrl)
        setFormData(prev => ({ ...prev, banner_url: imageUrl }))
        console.log('✅ Banner URL set to:', imageUrl)
        showToast('Banner uploaded successfully', 'success')
      }
    } catch (error) {
      console.error('🔴 Upload error:', error)
      showToast('Failed to upload image', 'error')
    } finally {
      setUploading(false)
      setCropperType(null)
    }
  }

  const handleCropCancel = () => {
    setCropperImage(null)
    setCropperType(null)
  }

  const handleRemoveAvatar = () => {
    setAvatarPreview(null)
    setFormData(prev => ({ ...prev, avatar_url: '' }))
  }

  const handleRemoveBanner = () => {
    setBannerPreview(null)
    setFormData(prev => ({ ...prev, banner_url: '' }))
  }

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      console.log('🔵 PROFILE UPDATE: Starting save...')
      console.log('🔵 Form data being sent:', formData)

      const updatedUser = await apiService.updateProfile(formData)

      console.log('🟢 PROFILE UPDATE: Received response:', updatedUser)

      updateUser(updatedUser)
      showToast('Profile updated successfully', 'success')
      navigate(`/profile/${user.username}`)
    } catch (error) {
      console.error('🔴 PROFILE UPDATE ERROR:', error)
      showToast(error.message || 'Failed to update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Edit Profile</h1>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => navigate(`/profile/${user.username}`)}
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Banner Section */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Banner Image</label>
            <div className={styles.bannerContainer}>
              {bannerPreview ? (
                <div className={styles.bannerPreview}>
                  <img src={bannerPreview} alt="Banner" className={styles.bannerImage} />
                  <div className={styles.bannerOverlay}>
                    <button
                      type="button"
                      className={styles.changeBannerButton}
                      onClick={handleBannerClick}
                      disabled={uploading}
                    >
                      Change Banner
                    </button>
                    <button
                      type="button"
                      className={styles.removeBannerButton}
                      onClick={handleRemoveBanner}
                      disabled={uploading}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.bannerPlaceholder} onClick={handleBannerClick}>
                  <div className={styles.bannerPlaceholderContent}>
                    <span className={styles.uploadIcon}>📷</span>
                    <span className={styles.uploadText}>Upload Banner</span>
                    <span className={styles.uploadHint}>1500 x 500 recommended</span>
                  </div>
                </div>
              )}
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, 'banner')}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Avatar Section */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Profile Photo</label>
            <div className={styles.avatarContainer}>
              <div className={styles.avatarPreviewWrapper}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className={styles.avatarImage} />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {user.full_name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className={styles.avatarActions}>
                <button
                  type="button"
                  className={styles.changeAvatarButton}
                  onClick={handleAvatarClick}
                  disabled={uploading}
                >
                  {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    className={styles.removeAvatarButton}
                    onClick={handleRemoveAvatar}
                    disabled={uploading}
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, 'avatar')}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Profile Information */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Profile Information</label>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Username</label>
              <input
                type="text"
                value={user.username}
                disabled
                className={`${styles.input} ${styles.inputDisabled}`}
              />
              <span className={styles.hint}>Username cannot be changed</span>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className={`${styles.input} ${styles.inputDisabled}`}
              />
              <span className={styles.hint}>Email cannot be changed</span>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                className={styles.input}
                maxLength={100}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself..."
                className={styles.textarea}
                rows={4}
                maxLength={500}
              />
              <span className={styles.hint}>
                {formData.bio?.length || 0} / 500 characters
              </span>
            </div>
          </div>

          {/* Preferences Section */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Preferences</label>
            <div className={styles.preferenceRow}>
              <div className={styles.preferenceInfo}>
                <span className={styles.preferenceLabel}>Theme</span>
                <span className={styles.preferenceDescription}>
                  Choose your preferred color scheme
                </span>
              </div>
              <button
                type="button"
                className={styles.themeToggleButton}
                onClick={handleThemeToggle}
              >
                <span className={styles.themeIcon}>{theme === 'dark' ? '🌙' : '☀️'}</span>
                <span className={styles.themeText}>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButtonBottom}
              onClick={() => navigate(`/profile/${user.username}`)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={saving || uploading}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Image Cropper Modal */}
      {cropperImage && (
        <ImageCropper
          image={cropperImage}
          aspect={cropperType === 'avatar' ? 1 : 3}
          shape={cropperType === 'avatar' ? 'round' : 'rect'}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      {/* Uploading Overlay */}
      {uploading && (
        <div className={styles.uploadingOverlay}>
          <div className={styles.uploadingMessage}>Uploading...</div>
        </div>
      )}
    </div>
  )
}

export default EditProfile
