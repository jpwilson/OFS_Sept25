import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './EventFilters.module.css'
import apiService from '../services/api'
import { useToast } from './Toast'
import { useAuth } from '../context/AuthContext'

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
  onFollowingUpdate,
  orderBy,
  setOrderBy
}) {
  const { showToast } = useToast()
  const { user } = useAuth()
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
        // Filter out the current user from search results
        const filteredResults = results.filter(r => r.username !== user?.username)
        setUserSearchResults(filteredResults)
        setSearchingUsers(false)
      } else {
        setUserSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [userSearchQuery, user])

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
          {/* Main filter row - search + filters inline on large screens */}
          <div className={styles.mainFilterRow}>
            {/* User Search */}
            <div className={styles.userSearchSection}>
              <div className={styles.searchInputWrapper}>
                <span className={styles.searchIcon}>🔍</span>
                <input
                  type="text"
                  id="user-search"
                  placeholder="Find family & friends"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className={styles.userSearchInput}
                />
              </div>
              {searchingUsers && (
                <div className={styles.searchLoading}>Searching...</div>
              )}
              {userSearchResults.length > 0 && (
                <div className={styles.userSearchResults}>
                  {userSearchResults.map(result => {
                    const isFollowing = following.includes(result.username)
                    const isPending = result.followRequested
                    const canClickProfile = isFollowing || (!isPending && !isFollowing)

                    return (
                      <div key={result.id} className={styles.userSearchResult}>
                        {canClickProfile ? (
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
                        ) : (
                          <div className={styles.userSearchInfoDisabled}>
                            <div className={styles.userSearchAvatar}>
                              {result.full_name?.charAt(0) || result.username.charAt(0)}
                            </div>
                            <div className={styles.userSearchDetails}>
                              <div className={styles.userSearchName}>
                                {result.full_name || result.username}
                              </div>
                              <div className={styles.userSearchUsername}>@{result.username}</div>
                            </div>
                          </div>
                        )}
                        {isPending ? (
                          <span className={styles.requestSentText}>Request Sent</span>
                        ) : isFollowing ? (
                          <span className={styles.followingText}>Following</span>
                        ) : (
                          <button
                            className={styles.followButton}
                            onClick={() => handleFollowUser(result.username)}
                          >
                            Request to Follow
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className={styles.filterRow}>
            {/* Order By Toggle - slider style */}
            <div className={styles.orderByToggle}>
              <button
                className={`${styles.orderByButton} ${styles.orderByLeft} ${orderBy === 'upload_date' ? styles.active : ''}`}
                onClick={() => setOrderBy('upload_date')}
                title="Sort by when the event was uploaded"
              >
                Upload Date
              </button>
              <button
                className={`${styles.orderByButton} ${styles.orderByRight} ${orderBy === 'event_date' ? styles.active : ''}`}
                onClick={() => setOrderBy('event_date')}
                title="Sort by when the event occurred"
              >
                Event Date
              </button>
            </div>

            {/* Date Dropdown */}
            <div className={styles.dateDropdownWrapper}>
              <button
                className={`${styles.dropdownButton} ${(selectedDateRange.start || selectedDateRange.end) ? styles.hasSelection : ''}`}
                onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              >
                {(selectedDateRange.start || selectedDateRange.end) ? getDateLabel() : 'Date Range'}
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
                {selectedCategories.length === 0 ? 'Categories' : `${selectedCategories.length} selected`}
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
                {!selectedUsers || selectedUsers.length === 0 ? 'Users' : `${selectedUsers.length} selected`}
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
                My Events
              </button>
            </div>

            {/* Hide Filters - right aligned */}
            <div className={styles.hideFilterWrapper}>
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
        </div>
      )}
    </div>
  )
}
