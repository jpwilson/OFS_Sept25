import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './EventFilters.module.css'
import apiService from '../services/api'
import { useToast } from './Toast'

// Predefined categories
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

export default function EventFilters({
  filter,
  setFilter,
  selectedCategories,
  setSelectedCategories,
  selectedDateRange,
  setSelectedDateRange,
  following,
  onFollowingUpdate
}) {
  const { showToast } = useToast()
  const [filtersExpanded, setFiltersExpanded] = useState(() => {
    return window.innerWidth > 768
  })
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState([])
  const [searchingUsers, setSearchingUsers] = useState(false)

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
      setUserSearchResults(prev => prev.map(u =>
        u.username === username ? { ...u, followRequested: true } : u
      ))
      if (onFollowingUpdate) {
        onFollowingUpdate()
      }
    } catch (error) {
      console.error('Error following user:', error)
      showToast('Failed to send follow request', 'error')
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryDropdownOpen && !e.target.closest(`.${styles.categoryDropdownWrapper}`)) {
        setCategoryDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [categoryDropdownOpen])

  return (
    <div className={styles.filtersContainer}>
      <div className={styles.filtersHeader}>
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

      {filtersExpanded && (
        <div className={styles.filters}>
          {/* User Search */}
          <div className={styles.userSearchSection}>
            <h3 className={styles.userSearchHeading}>Find Your Family and Friends</h3>
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

          <div className={styles.filterRow}>
            {/* Date Range */}
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

            {/* Category Multi-Select */}
            <div className={styles.categorySelector}>
              <label>Category:</label>
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

            {/* Person Filter */}
            <div className={styles.personFilter}>
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
          </div>
        </div>
      )}
    </div>
  )
}
