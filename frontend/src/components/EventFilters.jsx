import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import styles from './EventFilters.module.css'
import apiService from '../services/api'
import { useToast } from './Toast'
import { useAuth } from '../context/AuthContext'

// Predefined categories (simple list for dropdown)
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

// Categories with icons for the visual ribbon
const CATEGORIES_WITH_ICONS = [
  { value: 'Birthday', icon: '🎂', color: '#ff6b9d' },
  { value: 'Anniversary', icon: '💝', color: '#c44569' },
  { value: 'Vacation', icon: '✈️', color: '#4a90e2' },
  { value: 'Family Gathering', icon: '👨‍👩‍👧‍👦', color: '#6c5ce7' },
  { value: 'Holiday', icon: '🎄', color: '#00b894' },
  { value: 'Project', icon: '🛠️', color: '#fdcb6e' },
  { value: 'Daily Life', icon: '☕', color: '#74b9ff' },
  { value: 'Milestone', icon: '🏆', color: '#fab1a0' }
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
  setOrderBy,
  sortDirection,
  setSortDirection,
  mutedUsers,
  onMutedUsersChange
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
  const [muteDropdownOpen, setMuteDropdownOpen] = useState(false)
  const [muteSearchQuery, setMuteSearchQuery] = useState('')
  const [muteSearchResults, setMuteSearchResults] = useState([])
  const [searchingMuteUsers, setSearchingMuteUsers] = useState(false)

  // Category ribbon scroll state
  const ribbonRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Check scroll position to show/hide arrows
  const checkScrollPosition = useCallback(() => {
    const ribbon = ribbonRef.current
    if (!ribbon) return

    const { scrollLeft, scrollWidth, clientWidth } = ribbon
    setCanScrollLeft(scrollLeft > 5)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5)
  }, [])

  // Scroll ribbon left or right
  const scrollRibbon = (direction) => {
    const ribbon = ribbonRef.current
    if (!ribbon) return

    const scrollAmount = 200
    ribbon.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }

  // Check scroll on mount and when content changes
  useEffect(() => {
    checkScrollPosition()
    window.addEventListener('resize', checkScrollPosition)
    return () => window.removeEventListener('resize', checkScrollPosition)
  }, [checkScrollPosition])

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

  // Mute user search with debouncing
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (muteSearchQuery.trim().length >= 2) {
        setSearchingMuteUsers(true)
        const results = await apiService.searchUsers(muteSearchQuery)
        // Filter out current user and already muted users
        const mutedIds = mutedUsers?.map(m => m.id) || []
        const filteredResults = results.filter(r =>
          r.username !== user?.username && !mutedIds.includes(r.id)
        )
        setMuteSearchResults(filteredResults)
        setSearchingMuteUsers(false)
      } else {
        setMuteSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [muteSearchQuery, user, mutedUsers])

  const handleMuteUser = async (userId, username) => {
    try {
      await apiService.muteUser(userId)
      showToast(`Muted @${username}`, 'success')
      setMuteSearchQuery('')
      setMuteSearchResults([])
      if (onMutedUsersChange) {
        onMutedUsersChange()
      }
    } catch (error) {
      console.error('Error muting user:', error)
      showToast('Failed to mute user', 'error')
    }
  }

  const handleUnmuteUser = async (userId, username) => {
    try {
      await apiService.unmuteUser(userId)
      showToast(`Unmuted @${username}`, 'success')
      if (onMutedUsersChange) {
        onMutedUsersChange()
      }
    } catch (error) {
      console.error('Error unmuting user:', error)
      showToast('Failed to unmute user', 'error')
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
      if (muteDropdownOpen && !e.target.closest(`.${styles.muteDropdownWrapper}`)) {
        setMuteDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [dateDropdownOpen, categoryDropdownOpen, userDropdownOpen, muteDropdownOpen])

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
              <button
                className={styles.sortDirectionButton}
                onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
                title={sortDirection === 'desc' ? 'Currently: Most recent first' : 'Currently: Oldest first'}
              >
                {sortDirection === 'desc' ? '↓' : '↑'}
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

            {/* Mute Dropdown */}
            <div className={styles.muteDropdownWrapper}>
              <button
                className={`${styles.dropdownButton} ${mutedUsers?.length > 0 ? styles.hasSelection : ''}`}
                onClick={() => setMuteDropdownOpen(!muteDropdownOpen)}
              >
                Mute {mutedUsers?.length > 0 && `(${mutedUsers.length})`}
                <span className={styles.dropdownArrow}>{muteDropdownOpen ? '▲' : '▼'}</span>
              </button>
              {muteDropdownOpen && (
                <div className={styles.muteDropdownMenu}>
                  {/* Search section */}
                  <div className={styles.muteSearchSection}>
                    <input
                      type="text"
                      placeholder="Search users to mute..."
                      value={muteSearchQuery}
                      onChange={(e) => setMuteSearchQuery(e.target.value)}
                      className={styles.muteSearchInput}
                    />
                    {searchingMuteUsers && (
                      <div className={styles.muteSearchLoading}>Searching...</div>
                    )}
                    {muteSearchResults.length > 0 && (
                      <div className={styles.muteSearchResults}>
                        {muteSearchResults.map(result => (
                          <div key={result.id} className={styles.muteSearchResult}>
                            <div className={styles.muteUserInfo}>
                              <span className={styles.muteUserName}>
                                {result.full_name || result.username}
                              </span>
                              <span className={styles.muteUserUsername}>@{result.username}</span>
                            </div>
                            <button
                              className={styles.muteButton}
                              onClick={() => handleMuteUser(result.id, result.username)}
                            >
                              Mute
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Muted users list */}
                  {mutedUsers && mutedUsers.length > 0 && (
                    <>
                      <div className={styles.muteDivider}></div>
                      <div className={styles.mutedUsersList}>
                        <div className={styles.mutedUsersHeader}>Muted Users:</div>
                        {mutedUsers.map(mutedUser => (
                          <label key={mutedUser.id} className={styles.mutedUserItem}>
                            <input
                              type="checkbox"
                              checked={true}
                              onChange={() => handleUnmuteUser(mutedUser.id, mutedUser.username)}
                            />
                            <span className={styles.mutedUserName}>
                              {mutedUser.full_name || mutedUser.username}
                            </span>
                            <span className={styles.mutedUserUsername}>@{mutedUser.username}</span>
                          </label>
                        ))}
                        <div className={styles.mutedUsersHint}>Uncheck to unmute</div>
                      </div>
                    </>
                  )}

                  {(!mutedUsers || mutedUsers.length === 0) && muteSearchResults.length === 0 && !muteSearchQuery && (
                    <div className={styles.noMutedUsers}>
                      Search for users to mute
                    </div>
                  )}
                </div>
              )}
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

          {/* Category Ribbon with scroll arrows */}
          <div className={styles.categoryRibbonWrapper}>
            <button
              className={`${styles.scrollArrow} ${styles.scrollArrowLeft} ${!canScrollLeft ? styles.hidden : ''}`}
              onClick={() => scrollRibbon('left')}
              aria-label="Scroll categories left"
            >
              ‹
            </button>

            <div
              className={styles.categoryRibbon}
              ref={ribbonRef}
              onScroll={checkScrollPosition}
            >
              <button
                className={`${styles.categoryChip} ${styles.allChip} ${selectedCategories.length === 0 ? styles.selected : ''}`}
                onClick={() => setSelectedCategories([])}
              >
                <span className={styles.chipIcon}>✨</span>
                <span className={styles.chipLabel}>All</span>
              </button>

              {CATEGORIES_WITH_ICONS.map(cat => (
                <button
                  key={cat.value}
                  className={`${styles.categoryChip} ${selectedCategories.includes(cat.value) ? styles.selected : ''}`}
                  onClick={() => {
                    if (selectedCategories.includes(cat.value)) {
                      setSelectedCategories(prev => prev.filter(c => c !== cat.value))
                    } else {
                      setSelectedCategories(prev => [...prev, cat.value])
                    }
                  }}
                  style={{ '--chip-color': cat.color }}
                >
                  <span className={styles.chipIcon}>{cat.icon}</span>
                  <span className={styles.chipLabel}>{cat.value}</span>
                </button>
              ))}
            </div>

            <button
              className={`${styles.scrollArrow} ${styles.scrollArrowRight} ${!canScrollRight ? styles.hidden : ''}`}
              onClick={() => scrollRibbon('right')}
              aria-label="Scroll categories right"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
