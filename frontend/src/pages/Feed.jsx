import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import styles from './Feed.module.css'
import apiService from '../services/api'
import { FeedSkeleton } from '../components/Skeleton'
import { useAuth } from '../context/AuthContext'
import InvitedViewerBanner from '../components/InvitedViewerBanner'
import ViewToggle from '../components/ViewToggle'
import EventFilters from '../components/EventFilters'
import FeedView from '../components/FeedView'
import CalendarView from '../components/CalendarView'
import MapView from '../components/MapView'
import TimelineView from '../components/TimelineView'

function Feed() {
  const { user, canAccessContent, isTrialExpired } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // View state - default to 'feed', or read from URL for legacy redirects
  const [activeView, setActiveView] = useState(() => {
    const viewParam = searchParams.get('view')
    if (['feed', 'calendar', 'map', 'timeline'].includes(viewParam)) {
      return viewParam
    }
    return 'feed'
  })

  const [events, setEvents] = useState([])
  const [filteredEvents, setFilteredEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, following, self
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: '',
    end: ''
  })
  const [following, setFollowing] = useState([])
  const [followingUsers, setFollowingUsers] = useState([]) // Full user objects
  const [selectedCategories, setSelectedCategories] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([]) // Multi-select user filter
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [orderBy, setOrderBy] = useState('upload_date') // 'event_date' or 'upload_date'
  const [sortDirection, setSortDirection] = useState('desc') // 'asc' or 'desc'
  const [mutedUsers, setMutedUsers] = useState([])

  // Require login to view Feed
  useEffect(() => {
    if (!user && !loading) {
      navigate('/login', { state: { from: '/feed', message: 'Please sign in to view your feed' } })
    }
  }, [user, loading, navigate])

  useEffect(() => {
    if (user) {
      loadEvents()
      loadFollowing()
      loadMutedUsers()
    }
  }, [user, orderBy])  // Reload when orderBy changes

  const loadFollowing = async () => {
    if (user) {
      const followingList = await apiService.getFollowing()
      setFollowingUsers(followingList) // Store full user objects
      setFollowing(followingList.map(u => u.username))
    }
  }

  const loadMutedUsers = async () => {
    if (user) {
      const muted = await apiService.getMutedUsers()
      setMutedUsers(muted)
    }
  }

  const handleMutedUsersChange = () => {
    // Reload muted users and events when mute state changes
    loadMutedUsers()
    loadEvents()
  }

  useEffect(() => {
    applyFilters()
  }, [filter, selectedCategories, selectedUsers, selectedDateRange, events, following, orderBy, sortDirection])

  async function loadEvents() {
    const data = await apiService.getEvents(orderBy)
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

    // Apply user filter (multi-select)
    if (selectedUsers.length > 0) {
      filtered = filtered.filter(event => selectedUsers.includes(event.author_username))
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

    // Sort based on orderBy preference and direction
    // desc = most recent first (default), asc = oldest first
    const sortMultiplier = sortDirection === 'desc' ? 1 : -1
    if (orderBy === 'upload_date') {
      filtered.sort((a, b) => sortMultiplier * (new Date(b.created_at) - new Date(a.created_at)))
    } else {
      filtered.sort((a, b) => sortMultiplier * (new Date(b.start_date) - new Date(a.start_date)))
    }

    setFilteredEvents(filtered)
  }

  // Handle view change
  const handleViewChange = (view) => {
    setActiveView(view)
    // Don't update URL params - keep single URL
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
          <h1 className={styles.pageTitle}>Explore Events</h1>
          <ViewToggle activeView={activeView} onChange={handleViewChange} />
        </div>

        {filteredEvents.length !== events.length && (
          <div className={styles.filterInfo}>
            Showing {filteredEvents.length} of {events.length} events
          </div>
        )}
      </div>

      <EventFilters
        filter={filter}
        setFilter={setFilter}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        selectedDateRange={selectedDateRange}
        setSelectedDateRange={setSelectedDateRange}
        following={following}
        followingUsers={followingUsers}
        selectedUsers={selectedUsers}
        setSelectedUsers={setSelectedUsers}
        onFollowingUpdate={loadFollowing}
        orderBy={orderBy}
        setOrderBy={setOrderBy}
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
        mutedUsers={mutedUsers}
        onMutedUsersChange={handleMutedUsersChange}
      />

      <div className={styles.viewContent}>
        {activeView === 'feed' && (
          <FeedView
            events={filteredEvents}
            following={following}
            onUpgradePrompt={() => setShowUpgradePrompt(true)}
          />
        )}
        {activeView === 'calendar' && (
          <CalendarView events={filteredEvents} />
        )}
        {activeView === 'map' && (
          <MapView events={filteredEvents} />
        )}
        {activeView === 'timeline' && (
          <TimelineView events={filteredEvents} />
        )}
      </div>
    </div>
  )
}

export default Feed
