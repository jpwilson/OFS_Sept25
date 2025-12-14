import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styles from './Feed.module.css'
import apiService from '../services/api'
import { FeedSkeleton } from '../components/Skeleton'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import ShortLocation from '../components/ShortLocation'
import InvitedViewerBanner from '../components/InvitedViewerBanner'

// Predefined categories (matching CategorySelector)
const CATEGORIES = [
  'Birthday',
  'Anniversary',
  'Vacation',
  'Family Gathering',
  'Holiday',
  'Project',
  'Daily Life',
  'Milestone'
]

function Feed() {
  const { user, canAccessContent, isTrialExpired } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [filteredEvents, setFilteredEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, following, self
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: '',
    end: ''
  })
  const [following, setFollowing] = useState([])
  const [filtersExpanded, setFiltersExpanded] = useState(() => {
    // Default: open on desktop (>768px), closed on mobile
    return window.innerWidth > 768
  })
  const [selectedCategories, setSelectedCategories] = useState([]) // empty = all categories
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [cardSize, setCardSize] = useState('small') // large, medium, small
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)

  useEffect(() => {
    loadEvents()
    loadFollowing()
  }, [])

  // Helper to get clean excerpt text
  const getExcerpt = (event) => {
    // Use summary if available
    if (event.summary && event.summary.trim()) {
      return event.summary
    }

    // Otherwise, strip HTML from description and limit length
    if (event.description) {
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = event.description
      const plainText = tempDiv.textContent || tempDiv.innerText || ''
      return plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '')
    }

    return ''
  }

  // Helper to shorten title to max 4 words
  const getShortenedTitle = (title) => {
    if (!title) return ''
    const words = title.trim().split(/\s+/)
    if (words.length <= 4) return title
    return words.slice(0, 4).join(' ') + '...'
  }

  const loadFollowing = async () => {
    if (user) {
      const followingList = await apiService.getFollowing()
      setFollowing(followingList.map(u => u.username))
    }
  }

  useEffect(() => {
    applyFilters()
  }, [filter, selectedCategories, selectedDateRange, events])

  async function loadEvents() {
    const data = await apiService.getEvents()
    setEvents(data)
    setFilteredEvents(data)
    setLoading(false)
  }

  const applyFilters = () => {
    let filtered = [...events]

    // Apply person filter
    if (filter === 'self' && user) {
      filtered = filtered.filter(event => event.author_username === user.username)
    } else if (filter === 'following') {
      filtered = filtered.filter(event => following.includes(event.author_username))
    }

    // Apply category filter (multi-select)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(event => selectedCategories.includes(event.category))
    }

    // Apply date filter
    if (selectedDateRange.start) {
      filtered = filtered.filter(event =>
        new Date(event.start_date) >= new Date(selectedDateRange.start)
      )
    }
    if (selectedDateRange.end) {
      filtered = filtered.filter(event =>
        new Date(event.end_date || event.start_date) <= new Date(selectedDateRange.end)
      )
    }

    // Sort by event start_date (most recent first)
    filtered.sort((a, b) => new Date(b.start_date) - new Date(a.start_date))

    setFilteredEvents(filtered)
  }

  // User search with debouncing
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (userSearchQuery.trim().length >= 2) {
        setSearchingUsers(true)
        const results = await apiService.searchUsers(userSearchQuery)
        setUserSearchResults(results)
        setSearchingUsers(false)
      } else {
        setUserSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [userSearchQuery])

  const handleFollowUser = async (username) => {
    try {
      await apiService.followUser(username)
      showToast('Follow request sent!', 'success')
      // Remove from search results or mark as followed
      setUserSearchResults(prev => prev.map(u =>
        u.username === username ? { ...u, followRequested: true } : u
      ))
      loadFollowing()
    } catch (error) {
      console.error('Error following user:', error)
      showToast('Failed to send follow request', 'error')
    }
  }

  // Handle card click - check subscription access for expired users
  const handleEventClick = (event) => {
    // If user has full access, navigate normally
    if (!user || canAccessContent) {
      navigate(`/event/${event.id}`)
      return
    }

    // Expired user - check if they follow this author or if event is public
    const isFollowingAuthor = following.includes(event.author_username)
    const isPublicEvent = event.privacy_level === 'public'

    if (isFollowingAuthor || isPublicEvent) {
      navigate(`/event/${event.id}`)
    } else {
      // Show upgrade prompt
      setShowUpgradePrompt(true)
    }
  }

  function formatDateRange(start, end) {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const options = { month: 'long', day: 'numeric', year: 'numeric' }

    if (start === end || !end) {
      return startDate.toLocaleDateString('en-US', options)
    }

    const startMonth = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    return `${startMonth} - ${endDate.toLocaleDateString('en-US', options)}`
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.feed}>
          <FeedSkeleton />
        </div>
      </div>
    )
  }


  return (
    <div className={styles.container}>
      {user && <InvitedViewerBanner />}

      {/* Expired trial banner */}
      {user && isTrialExpired && !canAccessContent && (
        <div className={styles.expiredBanner}>
          <div className={styles.expiredBannerContent}>
            <span className={styles.expiredBannerIcon}>🔒</span>
            <div>
              <strong>Your free trial has ended</strong>
              <p>You can view events from people you follow. Subscribe to see all events.</p>
            </div>
            <Link to="/billing" className={styles.expiredBannerButton}>
              Upgrade
            </Link>
          </div>
        </div>
      )}

      {/* Upgrade prompt modal */}
      {showUpgradePrompt && (
        <div className={styles.upgradeModal} onClick={() => setShowUpgradePrompt(false)}>
          <div className={styles.upgradeModalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.upgradeModalClose} onClick={() => setShowUpgradePrompt(false)}>×</button>
            <div className={styles.upgradeModalIcon}>🔒</div>
            <h3>Premium Content</h3>
            <p>This event is from someone you don't follow. Follow them to see their events, or upgrade to Premium for full access.</p>
            <div className={styles.upgradeModalActions}>
              <Link to="/billing" className={styles.upgradeModalButton}>
                View Plans
              </Link>
              <button className={styles.upgradeModalSecondary} onClick={() => setShowUpgradePrompt(false)}>
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.pageTitle}>Event Feed</h1>
          <div className={styles.headerControls}>
            <div className={styles.cardSizeSelector}>
              <button
                className={`${styles.sizeButton} ${cardSize === 'small' ? styles.active : ''}`}
                onClick={() => setCardSize('small')}
                title="Small cards (3 columns)"
              >
                ⊞⊞⊞
              </button>
              <button
                className={`${styles.sizeButton} ${cardSize === 'medium' ? styles.active : ''}`}
                onClick={() => setCardSize('medium')}
                title="Medium cards (2 columns)"
              >
                ⊞⊞
              </button>
              <button
                className={`${styles.sizeButton} ${cardSize === 'large' ? styles.active : ''}`}
                onClick={() => setCardSize('large')}
                title="Large cards (1 column)"
              >
                ⊞
              </button>
            </div>
            <button
              className={styles.filterToggle}
              onClick={() => setFiltersExpanded(!filtersExpanded)}
            >
              <span className={filtersExpanded ? styles.arrowRed : styles.arrowGreen}>
                {filtersExpanded ? '▲' : '▼'}
              </span>
              {filtersExpanded ? ' Hide Filters' : ' Show Filters'}
            </button>
          </div>
        </div>

        {filtersExpanded && (
          <div className={styles.filters}>
            {/* User Search */}
            <div className={styles.userSearchSection}>
              <label htmlFor="user-search">Find your family and friends</label>
              <input
                type="text"
                id="user-search"
                placeholder="Search for users by name or username"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className={styles.userSearchInput}
              />
              {searchingUsers && (
                <div className={styles.searchLoading}>Searching...</div>
              )}
              {userSearchResults.length > 0 && (
                <div className={styles.userSearchResults}>
                  {userSearchResults.map(result => (
                    <div key={result.id} className={styles.userSearchResult}>
                      <Link to={`/profile/${result.username}`} className={styles.userSearchInfo}>
                        <div className={styles.userSearchAvatar}>
                          {result.full_name?.charAt(0) || result.username.charAt(0)}
                        </div>
                        <div className={styles.userSearchDetails}>
                          <div className={styles.userSearchName}>
                            {result.full_name || result.username}
                          </div>
                          <div className={styles.userSearchUsername}>@{result.username}</div>
                        </div>
                      </Link>
                      {result.followRequested ? (
                        <button className={styles.followRequestedButton} disabled>
                          Request Sent
                        </button>
                      ) : following.includes(result.username) ? (
                        <button className={styles.followingButton} disabled>
                          Following
                        </button>
                      ) : (
                        <button
                          className={styles.followButton}
                          onClick={() => handleFollowUser(result.username)}
                        >
                          Follow
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.dateSelector}>
              <span>From:</span>
              <input
                type="date"
                value={selectedDateRange.start}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
              <span>To:</span>
              <input
                type="date"
                value={selectedDateRange.end}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>

            <div className={styles.categorySelector}>
              <label htmlFor="category-filter">Category:</label>
              <div className={styles.categoryDropdownWrapper}>
                <button
                  className={styles.categoryDropdownButton}
                  onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                >
                  {selectedCategories.length === 0
                    ? 'All Categories'
                    : `${selectedCategories.length} selected`}
                  <span className={styles.dropdownArrow}>{categoryDropdownOpen ? '▲' : '▼'}</span>
                </button>
                {categoryDropdownOpen && (
                  <div className={styles.categoryDropdownMenu}>
                    {CATEGORIES.map(cat => (
                      <label key={cat} className={styles.categoryOption}>
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategories(prev => [...prev, cat])
                            } else {
                              setSelectedCategories(prev => prev.filter(c => c !== cat))
                            }
                          }}
                        />
                        <span>{cat}</span>
                      </label>
                    ))}
                    {selectedCategories.length > 0 && (
                      <button
                        className={styles.clearCategoriesBtn}
                        onClick={() => setSelectedCategories([])}
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
              onClick={() => setFilter('all')}
            >
              All Events
            </button>
            <button
              className={`${styles.filterButton} ${filter === 'following' ? styles.active : ''}`}
              onClick={() => setFilter('following')}
            >
              Following
            </button>
            <button
              className={`${styles.filterButton} ${filter === 'self' ? styles.active : ''}`}
              onClick={() => setFilter('self')}
            >
              My Events
            </button>
          </div>
        )}

        {filteredEvents.length !== events.length && (
          <div className={styles.filterInfo}>
            Showing {filteredEvents.length} of {events.length} events
          </div>
        )}
      </div>

      <div className={`${styles.feed} ${styles[cardSize]}`}>
        {filteredEvents.map(event => (
          <div
            key={event.id}
            className={styles.eventCard}
            onClick={() => handleEventClick(event)}
          >
            <div
              className={styles.eventImage}
              style={{ backgroundImage: `url(${event.cover_image_url})` }}
            >
              <div className={styles.overlay}>
                <h2 className={styles.title}>{getShortenedTitle(event.title)}</h2>
                <div className={styles.meta}>
                  <Link
                    to={`/profile/${event.author_username}`}
                    className={styles.authorLink}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {event.author_full_name || event.author_username}
                  </Link>
                  <span>·</span>
                  <span>{formatDateRange(event.start_date, event.end_date)}</span>
                  <span>·</span>
                  <ShortLocation locationName={event.location_name} maxWords={3} />
                </div>
                <p className={styles.excerpt}>{getExcerpt(event)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Feed