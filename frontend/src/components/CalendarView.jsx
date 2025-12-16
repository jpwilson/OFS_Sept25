import { useState } from 'react'
import { Link } from 'react-router-dom'
import styles from './CalendarView.module.css'

// Predefined categories with icons and colors
const CATEGORIES = [
  { value: 'Birthday', icon: '🎂', color: 'rgba(236, 72, 153, 0.15)' },
  { value: 'Anniversary', icon: '💝', color: 'rgba(239, 68, 68, 0.15)' },
  { value: 'Vacation', icon: '✈️', color: 'rgba(59, 130, 246, 0.15)' },
  { value: 'Family Gathering', icon: '👨‍👩‍👧‍👦', color: 'rgba(168, 85, 247, 0.15)' },
  { value: 'Holiday', icon: '🎄', color: 'rgba(34, 197, 94, 0.15)' },
  { value: 'Project', icon: '🛠️', color: 'rgba(245, 158, 11, 0.15)' },
  { value: 'Daily Life', icon: '☕', color: 'rgba(107, 114, 128, 0.12)' },
  { value: 'Milestone', icon: '🏆', color: 'rgba(251, 191, 36, 0.15)' }
]

// Helper to get category icon
const getCategoryIcon = (category) => {
  const cat = CATEGORIES.find(c => c.value === category)
  return cat ? cat.icon : '📅'
}

// Helper to get category background color
const getCategoryColor = (category) => {
  const cat = CATEGORIES.find(c => c.value === category)
  return cat ? cat.color : 'transparent'
}

// Get dominant category color for a day (based on first event or blended)
const getDayBackgroundColor = (events) => {
  if (!events || events.length === 0) return 'transparent'
  // Use the first event's category color
  return getCategoryColor(events[0].category)
}

export default function CalendarView({ events = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)

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

    return events.filter(event => {
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

  return (
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
            style={{
              backgroundColor: dayData.events.length > 0
                ? getDayBackgroundColor(dayData.events)
                : undefined
            }}
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
  )
}
