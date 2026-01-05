import { useState, useEffect } from 'react'
import apiService from '../services/api'
import { useToast } from './Toast'
import styles from './RelationshipProposalModal.module.css'

const RELATIONSHIP_TYPES = [
  { value: 'wife', label: 'Wife' },
  { value: 'husband', label: 'Husband' },
  { value: 'daughter', label: 'Daughter' },
  { value: 'son', label: 'Son' },
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'sister', label: 'Sister' },
  { value: 'brother', label: 'Brother' },
  { value: 'grandmother', label: 'Grandmother' },
  { value: 'grandfather', label: 'Grandfather' },
  { value: 'granddaughter', label: 'Granddaughter' },
  { value: 'grandson', label: 'Grandson' },
  { value: 'aunt', label: 'Aunt' },
  { value: 'uncle', label: 'Uncle' },
  { value: 'niece', label: 'Niece' },
  { value: 'nephew', label: 'Nephew' },
  { value: 'cousin', label: 'Cousin' },
  { value: 'mother-in-law', label: 'Mother-in-law' },
  { value: 'father-in-law', label: 'Father-in-law' },
  { value: 'daughter-in-law', label: 'Daughter-in-law' },
  { value: 'son-in-law', label: 'Son-in-law' },
  { value: 'sister-in-law', label: 'Sister-in-law' },
  { value: 'brother-in-law', label: 'Brother-in-law' },
  { value: 'stepmother', label: 'Stepmother' },
  { value: 'stepfather', label: 'Stepfather' },
  { value: 'stepdaughter', label: 'Stepdaughter' },
  { value: 'stepson', label: 'Stepson' },
  { value: 'friend', label: 'Friend' },
  { value: 'pet', label: 'Pet' },
  { value: 'pet owner', label: 'Pet Owner' },
]

export default function RelationshipProposalModal({
  isOpen,
  onClose,
  otherUser,
  onSuccess
}) {
  const { showToast } = useToast()
  const [myRelationship, setMyRelationship] = useState('')
  const [theirRelationship, setTheirRelationship] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMyRelationship('')
      setTheirRelationship('')
    }
  }, [isOpen])

  if (!isOpen || !otherUser) return null

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!myRelationship || !theirRelationship) {
      showToast('Please select both relationships', 'error')
      return
    }

    setLoading(true)
    try {
      await apiService.proposeRelationship(
        otherUser.id,
        myRelationship,
        theirRelationship
      )
      showToast(`Relationship request sent to ${otherUser.full_name || otherUser.username}!`, 'success')
      onSuccess?.()
      onClose()
    } catch (error) {
      showToast(error.message || 'Failed to send relationship request', 'error')
    } finally {
      setLoading(false)
    }
  }

  const displayName = otherUser.full_name || otherUser.username

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>

        <h2 className={styles.title}>Add Family Relationship</h2>
        <p className={styles.subtitle}>
          Propose a relationship with <strong>{displayName}</strong>
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              {displayName} is my...
            </label>
            <select
              value={myRelationship}
              onChange={(e) => setMyRelationship(e.target.value)}
              className={styles.select}
              required
            >
              <option value="">Select relationship</option>
              {RELATIONSHIP_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              I am {displayName}'s...
            </label>
            <select
              value={theirRelationship}
              onChange={(e) => setTheirRelationship(e.target.value)}
              className={styles.select}
              required
            >
              <option value="">Select relationship</option>
              {RELATIONSHIP_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <p className={styles.hint}>
            {displayName} will receive a request to confirm this relationship.
            Once accepted, you'll appear in each other's Family Tree.
          </p>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading || !myRelationship || !theirRelationship}
            >
              {loading ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
