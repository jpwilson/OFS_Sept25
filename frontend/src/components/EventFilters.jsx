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
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false)
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
      if (dateDropdownOpen && !e.target.closest(`.${styles.dateDropdownWrapper}`)) {
        setDateDropdownOpen(false)
      }
      if (categoryDropdownOpen && !e.target.closest(`.${styles.categoryDropdownWrapper}`)) {
        setCategoryDropdownOpen(false)
      }
      if (userDropdownOpen && !e.target.closest(`.${styles.userDropdownWrapper}`)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [dateDropdownOpen, categoryDropdownOpen, userDropdownOpen])

  // Helper to format date range for display
  const getDateLabel = () => {
    if (!selectedDateRange.start && !selectedDateRange.end) {
      return 'Date'
    }
    if (selectedDateRange.start && selectedDateRange.end) {
      const start = new Date(selectedDateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const end = new Date(selectedDateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return `${start} - ${end}`
    }
    if (selectedDateRange.start) {
      const start = new Date(selectedDateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return `From ${start}`
    }
    const end = new Date(selectedDateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `Until ${end}`
  }

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
            {/* Date Dropdown */}
            <div className={styles.dateDropdownWrapper}>
              <button
                className={`${styles.dropdownButton} ${(selectedDateRange.start || selectedDateRange.end) ? styles.hasSelection : ''}`}
                onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              >
                {getDateLabel()}
                <span className={styles.dropdownArrow}>{dateDropdownOpen ? '▲' : '▼'}</span>
              </button>
              {dateDropdownOpen && (
                <div className={styles.dateDropdownMenu}>
                  <div className={styles.dateInputRow}>
                    <label>From:</label>
                    <input
                      type="date"
                      value={selectedDateRange.start}
                      onChange={(e) => setSelectedDateRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                  </div>
                  <div className={styles.dateInputRow}>
                    <label>To:</label>
                    <input
                      type="date"
                      value={selectedDateRange.end}
                      onChange={(e) => setSelectedDateRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                  </div>
                  {(selectedDateRange.start || selectedDateRange.end) && (
                    <button
                      className={styles.clearBtn}
                      onClick={() => setSelectedDateRange({ start: '', end: '' })}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Category Dropdown */}
            <div className={styles.categoryDropdownWrapper}>
              <button
                className={`${styles.dropdownButton} ${selectedCategories.length > 0 ? styles.hasSelection : ''}`}
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              >
                {selectedCategories.length === 0 ? 'Category' : `${selectedCategories.length} cat.`}
                <span className={styles.dropdownArrow}>{categoryDropdownOpen ? '▲' : '▼'}</span>
              </button>
              {categoryDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  {CATEGORIES.map(cat => (
                    <label key={cat} className={styles.dropdownOption}>
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
                      className={styles.clearBtn}
                      onClick={() => setSelectedCategories([])}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div className={styles.userDropdownWrapper}>
              <button
                className={`${styles.dropdownButton} ${selectedUsers?.length > 0 ? styles.hasSelection : ''}`}
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              >
                {!selectedUsers || selectedUsers.length === 0 ? 'User' : `${selectedUsers.length} user`}
                <span className={styles.dropdownArrow}>{userDropdownOpen ? '▲' : '▼'}</span>
              </button>
              {userDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  {followingUsers && followingUsers.length > 0 ? (
                    <>
                      {followingUsers.map(user => (
                        <label key={user.username} className={styles.dropdownOption}>
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
                          className={styles.clearBtn}
                          onClick={() => setSelectedUsers([])}
                        >
                          Clear
                        </button>
                      )}
                    </>
                  ) : (
                    <div className={styles.noUsersMessage}>
                      Follow users to filter
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Person Filter Buttons */}
            <div className={styles.personFilter}>
              <button
                className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
                onClick={() => setFilter('all')}
              >
                All
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
                Mine
              </button>
            </div>

            {/* Hide Filters */}
            <button
              className={styles.filterToggle}
              onClick={() => setFiltersExpanded(false)}
            >
              <span className={styles.arrowRed}>▲</span>
              {' Hide'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
