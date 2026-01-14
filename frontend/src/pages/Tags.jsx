import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import CreateTagProfileModal from '../components/CreateTagProfileModal'
import apiService from '../services/api'
import styles from './Tags.module.css'

export default function Tags() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [myTagProfiles, setMyTagProfiles] = useState([])
  const [showCreateTagModal, setShowCreateTagModal] = useState(false)

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadTagProfiles()
  }, [user])

  async function loadTagProfiles() {
    setLoading(true)
    try {
      const profiles = await apiService.getMyTagProfiles()
      setMyTagProfiles(profiles || [])
    } catch (error) {
      console.error('Failed to load tag profiles:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleTagProfileCreated(profile) {
    setMyTagProfiles(prev => [profile, ...prev])
    showToast('Tag profile created', 'success')
  }

  if (loading) {
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
          <button className={styles.backButton} onClick={() => navigate(`/profile/${user?.username}`)}>
            ← Back to Profile
          </button>
          <h1 className={styles.title}>Tag Profiles</h1>
          <p className={styles.subtitle}>People without accounts that you've created for tagging</p>
        </div>

        {/* Tag Profiles Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionInfo}>
              <h2 className={styles.sectionTitle}>Your Tag Profiles</h2>
              <span className={styles.count}>{myTagProfiles.length}</span>
            </div>
            <button
              className={styles.createButton}
              onClick={() => setShowCreateTagModal(true)}
            >
              + Create New
            </button>
          </div>

          {myTagProfiles.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>👤</span>
              <p>No tag profiles created yet</p>
              <p className={styles.emptySubtext}>
                Create tag profiles for family members, friends, or pets who don't have accounts.
                You can then tag them in your events!
              </p>
              <button
                className={styles.createButtonLarge}
                onClick={() => setShowCreateTagModal(true)}
              >
                + Create Your First Tag Profile
              </button>
            </div>
          ) : (
            <div className={styles.tagProfilesList}>
              {myTagProfiles.map(profile => (
                <Link
                  key={profile.id}
                  to={`/tag-profile/${profile.id}`}
                  className={styles.tagProfileItem}
                >
                  <div className={styles.tagProfileInfo}>
                    {profile.photo_url ? (
                      <img src={profile.photo_url} alt="" className={styles.tagProfileAvatar} />
                    ) : (
                      <div className={styles.tagProfileAvatarPlaceholder}>
                        {profile.name?.[0]?.toUpperCase() || '#'}
                      </div>
                    )}
                    <div className={styles.tagProfileDetails}>
                      <strong>{profile.name}</strong>
                      {profile.relationship_to_creator && (
                        <p>Your {profile.relationship_to_creator.charAt(0).toUpperCase() + profile.relationship_to_creator.slice(1)}</p>
                      )}
                    </div>
                  </div>
                  <span className={styles.viewArrow}>→</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className={styles.infoSection}>
          <h3>What are tag profiles?</h3>
          <p>
            Tag profiles let you tag family members, friends, or pets in your events even if
            they don't have an Our Family Socials account. Once created, you can:
          </p>
          <ul>
            <li>Tag them in any of your events</li>
            <li>Add a photo and relationship to them</li>
            <li>If they join later, they can claim their profile and merge it with their account</li>
          </ul>
        </div>

        {/* Create Tag Profile Modal */}
        <CreateTagProfileModal
          isOpen={showCreateTagModal}
          onClose={() => setShowCreateTagModal(false)}
          onCreated={handleTagProfileCreated}
        />
      </div>
    </div>
  )
}
