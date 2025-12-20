import { useState } from 'react'
import api from '../services/api'
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

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
    setError('')
    onClose()
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

          <div className={styles.field}>
            <label htmlFor="photo">Photo URL (optional)</label>
            <input
              id="photo"
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
            />
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
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateTagProfileModal
