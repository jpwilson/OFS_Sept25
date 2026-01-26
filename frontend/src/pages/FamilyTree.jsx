import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import apiService from '../services/api'
import { transformToFamilyChart } from '../utils/familyTreeTransform'
import styles from './FamilyTree.module.css'

// Lazy load the graph component to reduce initial bundle size
const FamilyTreeGraph = lazy(() => import('../components/FamilyTreeGraph'))

// Group relationships by type for display
const RELATIONSHIP_GROUPS = {
  'Spouse': ['wife', 'husband', 'spouse', 'partner'],
  'Parents': ['mother', 'father', 'parent', 'stepmother', 'stepfather'],
  'Children': ['daughter', 'son', 'child', 'stepdaughter', 'stepson'],
  'Siblings': ['sister', 'brother', 'sibling', 'half-sister', 'half-brother', 'stepsister', 'stepbrother'],
  'Grandparents': ['grandmother', 'grandfather', 'grandparent'],
  'Grandchildren': ['granddaughter', 'grandson', 'grandchild'],
  'Extended Family': ['aunt', 'uncle', 'niece', 'nephew', 'cousin'],
  'In-Laws': ['mother-in-law', 'father-in-law', 'sister-in-law', 'brother-in-law', 'daughter-in-law', 'son-in-law'],
  'Friends': ['friend', 'best friend', 'close friend'],
  'Pets': ['pet', 'pet owner', 'dog', 'cat']
}

function getGroupForRelationship(relationship) {
  const lowerRel = relationship?.toLowerCase() || ''
  for (const [group, types] of Object.entries(RELATIONSHIP_GROUPS)) {
    if (types.some(t => lowerRel.includes(t))) {
      return group
    }
  }
  return 'Other'
}

export default function FamilyTree() {
  const { user, canAccessContent, isExpired, isTrialExpired } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [relationships, setRelationships] = useState([])
  const [tagProfiles, setTagProfiles] = useState([])
  const [view, setView] = useState('list') // 'list' or 'tree'

  // Transform data for the tree graph view
  const graphData = useMemo(() => {
    if (!user || (relationships.length === 0 && tagProfiles.length === 0)) {
      return []
    }
    return transformToFamilyChart(user, relationships, tagProfiles)
  }, [user, relationships, tagProfiles])

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadData()
  }, [user])

  async function loadData() {
    setLoading(true)
    try {
      const [relData, tagData] = await Promise.all([
        apiService.getRelationships(),
        apiService.getMyTagProfiles()
      ])
      setRelationships(relData || [])
      setTagProfiles(tagData || [])
    } catch (error) {
      console.error('Failed to load family tree data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group relationships by category
  const groupedRelationships = relationships.reduce((acc, rel) => {
    const group = getGroupForRelationship(rel.relationship_to_you)
    if (!acc[group]) acc[group] = []
    acc[group].push(rel)
    return acc
  }, {})

  // Group tag profiles by relationship
  const groupedTagProfiles = tagProfiles.reduce((acc, profile) => {
    const group = getGroupForRelationship(profile.relationship_to_creator)
    if (!acc[group]) acc[group] = []
    acc[group].push(profile)
    return acc
  }, {})

  // Merge the groups
  const allGroups = new Set([...Object.keys(groupedRelationships), ...Object.keys(groupedTagProfiles)])

  // Sort groups in a logical order
  const groupOrder = ['Spouse', 'Children', 'Parents', 'Siblings', 'Grandchildren', 'Grandparents', 'Extended Family', 'In-Laws', 'Friends', 'Other']
  const sortedGroups = [...allGroups].sort((a, b) => {
    const aIndex = groupOrder.indexOf(a)
    const bIndex = groupOrder.indexOf(b)
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b)
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  const totalConnections = relationships.length + tagProfiles.length

  const isBlocked = user && !canAccessContent && (isExpired || isTrialExpired)

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading your family tree...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {isBlocked && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '20px 28px',
          textAlign: 'center',
          color: 'white',
          fontSize: '15px',
          fontWeight: 500,
          borderRadius: '12px',
          margin: '20px auto',
          maxWidth: '600px'
        }}>
          <div style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 700 }}>
            Family Tree is a Pro feature
          </div>
          <div style={{ opacity: 0.9, marginBottom: '12px' }}>
            Upgrade to Pro to build and explore your family tree.
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
      <div className={`${styles.content} ${view === 'tree' ? styles.contentWide : ''}`}
        style={isBlocked ? { opacity: 0.3, pointerEvents: 'none', filter: 'grayscale(0.5)' } : undefined}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1 className={styles.title}>Family Tree</h1>
          <p className={styles.subtitle}>{totalConnections} connection{totalConnections !== 1 ? 's' : ''}</p>

          {/* View Toggle */}
          {totalConnections > 0 && (
            <div className={styles.viewToggle}>
              <button
                className={`${styles.viewButton} ${view === 'list' ? styles.active : ''}`}
                onClick={() => setView('list')}
              >
                List
              </button>
              <button
                className={`${styles.viewButton} ${view === 'tree' ? styles.active : ''}`}
                onClick={() => setView('tree')}
              >
                Tree
              </button>
            </div>
          )}
        </div>

        {totalConnections === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🌳</span>
            <h2>Grow Your Family Tree</h2>
            <p>Connect with family and friends to build your tree.</p>
            <div className={styles.emptyActions}>
              <Link to={`/profile/${user?.username}`} className={styles.actionButton}>
                View Your Profile
              </Link>
            </div>
            <div className={styles.tips}>
              <h3>How to add connections:</h3>
              <ul>
                <li><strong>Verified relationships:</strong> Follow someone, have them follow you back, then propose a relationship from their profile.</li>
                <li><strong>Tag profiles:</strong> Create profiles for family members who don't have accounts (like kids or pets) in Notifications → Tags.</li>
              </ul>
            </div>
          </div>
        ) : view === 'tree' ? (
          /* Tree/Graph View */
          <Suspense fallback={<div className={styles.loading}>Loading tree visualization...</div>}>
            <FamilyTreeGraph
              data={graphData}
              currentUserId={user?.id}
              relationships={relationships}
            />
          </Suspense>
        ) : (
          /* List View */
          <div className={styles.treeContainer}>
            {/* User at center */}
            <div className={styles.selfCard}>
              <Link to={`/profile/${user?.username}`} className={styles.selfInfo}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className={styles.selfAvatar} />
                ) : (
                  <div className={styles.selfAvatarPlaceholder}>
                    {user?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className={styles.selfDetails}>
                  <strong>{user?.full_name || user?.username}</strong>
                  <span>You</span>
                </div>
              </Link>
            </div>

            {/* Grouped connections */}
            {sortedGroups.map(group => {
              const userRelationships = groupedRelationships[group] || []
              const tagProfilesInGroup = groupedTagProfiles[group] || []
              const groupTotal = userRelationships.length + tagProfilesInGroup.length

              return (
                <div key={group} className={styles.groupSection}>
                  <h2 className={styles.groupTitle}>
                    {group}
                    <span className={styles.groupCount}>{groupTotal}</span>
                  </h2>
                  <div className={styles.connectionsList}>
                    {/* Verified user relationships */}
                    {userRelationships.map(rel => (
                      <Link
                        key={`rel-${rel.id}`}
                        to={`/profile/${rel.other_user_username}`}
                        className={styles.connectionCard}
                      >
                        {rel.other_user_avatar_url ? (
                          <img src={rel.other_user_avatar_url} alt="" className={styles.connectionAvatar} />
                        ) : (
                          <div className={styles.connectionAvatarPlaceholder}>
                            {rel.other_user_username?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div className={styles.connectionDetails}>
                          <strong>{rel.other_user_display_name || rel.other_user_username}</strong>
                          <span className={styles.relationshipLabel}>{rel.relationship_to_you}</span>
                        </div>
                        <span className={styles.verifiedBadge} title="Verified relationship">✓</span>
                      </Link>
                    ))}

                    {/* Tag profiles (non-users) */}
                    {tagProfilesInGroup.map(profile => (
                      <Link
                        key={`tag-${profile.id}`}
                        to={`/tag-profile/${profile.id}`}
                        className={`${styles.connectionCard} ${styles.tagProfile}`}
                      >
                        {profile.photo_url ? (
                          <img src={profile.photo_url} alt="" className={styles.connectionAvatar} />
                        ) : (
                          <div className={styles.connectionAvatarPlaceholder}>
                            {profile.name?.[0]?.toUpperCase() || '#'}
                          </div>
                        )}
                        <div className={styles.connectionDetails}>
                          <strong>{profile.name}</strong>
                          <span className={styles.relationshipLabel}>{profile.relationship_to_creator}</span>
                        </div>
                        <span className={styles.tagBadge} title="Tag profile (no account)">Tag</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
