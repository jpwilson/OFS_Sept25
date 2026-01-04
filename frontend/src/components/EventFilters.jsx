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
  followingUsers,  // Full user objects for the dropdown
  selectedUsers,
  setSelectedUsers,
  onFollowingUpdate
}) {
  const { showToast } = useToast()
  const [filtersExpanded, setFiltersExpanded] = useState(() => {
    return window.innerWidth > 768
  })
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryDropdownOpen && !e.target.closest(`.${styles.categoryDropdownWrapper}`)) {
        setCategoryDropdownOpen(false)
      }
      if (userDropdownOpen && !e.target.closest(`.${styles.userDropdownWrapper}`)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [categoryDropdownOpen, userDropdownOpen])

  return (
    <div className={styles.filtersContainer}>
      {/* Show toggle in header only when collapsed */}
      {!filtersExpanded && (
        <div className={styles.filtersHeader}>
          <button
            className={styles.filterToggle}
            onClick={() => setFiltersExpanded(true)}
          >
            <span className={styles.arrowGreen}>▼</span>
            {' Show Filters'}
          </button>
        </div>
      )}

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

            {/* User Multi-Select */}
            <div className={styles.categorySelector}>
              <label>User:</label>
              <div className={styles.userDropdownWrapper}>
                <button
                  className={styles.categoryDropdownButton}
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                >
                  {!selectedUsers || selectedUsers.length === 0
                    ? 'All Users'
                    : `${selectedUsers.length} selected`}
                  <span className={styles.dropdownArrow}>{userDropdownOpen ? '▲' : '▼'}</span>
                </button>
                {userDropdownOpen && (
                  <div className={styles.categoryDropdownMenu}>
                    {followingUsers && followingUsers.length > 0 ? (
                      <>
                        {followingUsers.map(user => (
                          <label key={user.username} className={styles.categoryOption}>
                            <input
                              type="checkbox"
                              checked={selectedUsers?.includes(user.username) || false}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsers(prev => [...(prev || []), user.username])
                                } else {
                                  setSelectedUsers(prev => (prev || []).filter(u => u !== user.username))
                                }
                              }}
                            />
                            <span>{user.full_name || user.username}</span>
                          </label>
                        ))}
                        {selectedUsers && selectedUsers.length > 0 && (
                          <button
                            className={styles.clearCategoriesBtn}
                            onClick={() => setSelectedUsers([])}
                          >
                            Clear All
                          </button>
                        )}
                      </>
                    ) : (
                      <div className={styles.noUsersMessage}>
                        Follow users to filter by them
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Person Filter Buttons + Hide Filters */}
            <div className={styles.personFilterRow}>
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
              <button
                className={styles.filterToggle}
                onClick={() => setFiltersExpanded(false)}
              >
                <span className={styles.arrowRed}>▲</span>
                {' Hide Filters'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
