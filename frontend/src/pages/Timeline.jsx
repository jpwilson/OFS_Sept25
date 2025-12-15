import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './Timeline.module.css'
import apiService from '../services/api'
import { useAuth } from '../context/AuthContext'

// Predefined categories with icons (matching CategorySelector)
const CATEGORIES = [
  { value: 'Birthday', icon: '🎂' },
  { value: 'Anniversary', icon: '💝' },
  { value: 'Vacation', icon: '✈️' },
  { value: 'Family Gathering', icon: '👨‍👩‍👧‍👦' },
  { value: 'Holiday', icon: '🎄' },
  { value: 'Project', icon: '🛠️' },
  { value: 'Daily Life', icon: '☕' },
  { value: 'Milestone', icon: '🏆' }
]

// Helper to get category icon
const getCategoryIcon = (category) => {
  const cat = CATEGORIES.find(c => c.value === category)
  return cat ? cat.icon : '📅'
}

function Timeline() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [filteredEvents, setFilteredEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, following, self
  const [selectedCategories, setSelectedCategories] = useState([]) // multi-select
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [selectedDateRange, setSelectedDateRange] = useState({ start: '', end: '' })
  const [following, setFollowing] = useState([])
  const [filtersExpanded, setFiltersExpanded] = useState(() => {
    // Default: open on desktop (>768px), closed on mobile
    return window.innerWidth > 768
  })
  const [viewMode, setViewMode] = useState('calendar') // 'timeline' or 'calendar'
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null) // For day popup

  useEffect(() => {
    loadEvents()
    loadFollowing()
  }, [])

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

    // Sort by date (most recent first for timeline)
    filtered.sort((a, b) => new Date(b.start_date) - new Date(a.start_date))

    setFilteredEvents(filtered)
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  function formatYear(dateString) {
    return new Date(dateString).getFullYear()
  }

  // Group events by year for timeline sections (reversed - newest first)
  const eventsByYear = filteredEvents.reduce((acc, event) => {
    const year = formatYear(event.start_date)
    if (!acc[year]) {
      acc[year] = []
    }
    acc[year].push(event)
    return acc
  }, {})

  const years = Object.keys(eventsByYear).sort((a, b) => b - a) // Newest year first

  // Calendar helpers
  const getMonthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1)
  const getMonthEnd = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const getDaysInMonth = (date) => getMonthEnd(date).getDate()
  const getFirstDayOfWeek = (date) => getMonthStart(date).getDay()

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
    setSelectedDay(null)
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    setSelectedDay(null)
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
    setSelectedDay(null)
  }

  // Get events for a specific day
  const getEventsForDay = (day) => {
    const dayStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const dayEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day + 1)

    return filteredEvents.filter(event => {
      const eventDate = new Date(event.start_date)
      return eventDate >= dayStart && eventDate < dayEnd
    })
  }

  // Generate calendar grid
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDayOfWeek = getFirstDayOfWeek(currentMonth)
    const days = []

    // Empty cells for days before the month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ day: null, events: [] })
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, events: getEventsForDay(day) })
    }

    return days
  }

  const isToday = (day) => {
    if (!day) return false
    const today = new Date()
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    )
  }

  if (loading) {
    return <div className={styles.loading}>Loading timeline...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleAndToggle}>
            <h1 className={styles.pageTitle}>Timeline</h1>
            {/* View Mode Toggle */}
            <div className={styles.viewToggle}>
              <button
                className={`${styles.toggleOption} ${viewMode === 'timeline' ? styles.active : ''}`}
                onClick={() => setViewMode('timeline')}
              >
                Timeline
              </button>
              <button
                className={`${styles.toggleOption} ${viewMode === 'calendar' ? styles.active : ''}`}
                onClick={() => setViewMode('calendar')}
              >
                Calendar
              </button>
            </div>
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

        {filtersExpanded && (
          <div className={styles.filters}>
            {/* Date Range Selector */}
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

            {/* Category Multi-Select Dropdown */}
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
                      <label key={cat.value} className={styles.categoryOption}>
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategories(prev => [...prev, cat.value])
                            } else {
                              setSelectedCategories(prev => prev.filter(c => c !== cat.value))
                            }
                          }}
                        />
                        <span>{cat.icon} {cat.value}</span>
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

            {/* Person Filter Buttons */}
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

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className={styles.calendarContainer}>
          <div className={styles.calendarHeader}>
            <button className={styles.monthNavButton} onClick={prevMonth}>
              ‹
            </button>
            <h2 className={styles.monthTitle}>{formatMonthYear(currentMonth)}</h2>
            <button className={styles.monthNavButton} onClick={nextMonth}>
              ›
            </button>
            <button className={styles.todayButton} onClick={goToToday}>
              Today
            </button>
          </div>

          <div className={styles.calendarGrid}>
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className={styles.dayHeader}>{day}</div>
            ))}

            {/* Calendar days */}
            {generateCalendarDays().map((dayData, index) => (
              <div
                key={index}
                className={`${styles.calendarDay} ${!dayData.day ? styles.emptyDay : ''} ${isToday(dayData.day) ? styles.today : ''} ${dayData.events.length > 0 ? styles.hasEvents : ''}`}
                onClick={() => dayData.day && dayData.events.length > 0 && setSelectedDay(dayData)}
              >
                {dayData.day && (
                  <>
                    <span className={styles.dayNumber}>{dayData.day}</span>
                    {dayData.events.length > 0 && (
                      <div className={styles.dayEvents}>
                        {dayData.events.length <= 4 ? (
                          dayData.events.map((event, i) => (
                            <span key={i} className={styles.eventIcon} title={event.title}>
                              {getCategoryIcon(event.category)}
                            </span>
                          ))
                        ) : (
                          <>
                            {dayData.events.slice(0, 3).map((event, i) => (
                              <span key={i} className={styles.eventIcon} title={event.title}>
                                {getCategoryIcon(event.category)}
                              </span>
                            ))}
                            <span className={styles.moreEvents}>+{dayData.events.length - 3}</span>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Day Detail Popup */}
          {selectedDay && selectedDay.events.length > 0 && (
            <div className={styles.dayPopupOverlay} onClick={() => setSelectedDay(null)}>
              <div className={styles.dayPopup} onClick={(e) => e.stopPropagation()}>
                <div className={styles.dayPopupHeader}>
                  <h3>
                    {new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDay.day).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h3>
                  <button className={styles.closePopup} onClick={() => setSelectedDay(null)}>×</button>
                </div>
                <div className={styles.dayPopupContent}>
                  {selectedDay.events.map(event => (
                    <Link
                      key={event.id}
                      to={`/event/${event.id}`}
                      className={styles.dayPopupEvent}
                    >
                      <span className={styles.popupEventIcon}>{getCategoryIcon(event.category)}</span>
                      <div className={styles.popupEventInfo}>
                        <div className={styles.popupEventTitle}>{event.title}</div>
                        <div className={styles.popupEventMeta}>
                          {event.author_full_name || event.author_username}
                        </div>
                      </div>
                      {event.cover_image_url && (
                        <img
                          src={event.cover_image_url}
                          alt=""
                          className={styles.popupEventImage}
                        />
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className={styles.timeline}>
          <div className={styles.timelineLine}></div>

          {years.map(year => (
            <div key={year} className={styles.yearSection}>
              <div className={styles.yearMarker}>
                <div className={styles.yearDot}></div>
                <div className={styles.yearLabel}>{year}</div>
              </div>

              {eventsByYear[year].map((event, index) => (
                <div
                  key={event.id}
                  className={`${styles.timelineItem} ${index % 2 === 0 ? styles.left : styles.right}`}
                >
                  <div className={styles.timelineContent}>
                    <Link to={`/event/${event.id}`} className={styles.eventCard}>
                      <div
                        className={styles.eventImage}
                        style={{ backgroundImage: `url(${event.cover_image_url})` }}
                      >
                        <div className={styles.categoryBadge}>
                          {getCategoryIcon(event.category)}
                        </div>
                        <div className={styles.eventOverlay}>
                          <h3 className={styles.eventTitle}>{event.title}</h3>
                          <div className={styles.eventMeta}>
                            <Link
                              to={`/profile/${event.author_username}`}
                              className={styles.authorLink}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {event.author_full_name || event.author_username}
                            </Link>
                            {event.location_name && <span> · {event.location_name}</span>}
                          </div>
                        </div>
                      </div>
                    </Link>
                    <div className={styles.eventDate}>{formatDate(event.start_date)}</div>
                  </div>
                  <div className={styles.timelineDot}></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {filteredEvents.length === 0 && (
        <div className={styles.noEvents}>
          <p>No events to display.</p>
        </div>
      )}
    </div>
  )
}

export default Timeline
