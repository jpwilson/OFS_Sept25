import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import apiService from '../services/api'
import { useToast } from '../components/Toast'
import styles from './AdminEvents.module.css'

function AdminEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const limit = 50
  const { showToast } = useToast()

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    loadEvents()
  }, [debouncedSearch, includeDeleted, page])

  async function loadEvents() {
    try {
      setLoading(true)
      const data = await apiService.getAdminEvents(debouncedSearch, includeDeleted, page * limit, limit)
      setEvents(data.events)
      setTotal(data.total)
    } catch (err) {
      console.error('Failed to load events:', err)
      showToast('Failed to load events', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleVisibility(eventId, isCurrentlyDeleted) {
    try {
      await apiService.toggleEventVisibility(eventId)
      // Update local state
      setEvents(events.map(e =>
        e.id === eventId ? { ...e, is_deleted: !isCurrentlyDeleted } : e
      ))
      showToast(isCurrentlyDeleted ? 'Event restored' : 'Event hidden', 'success')
    } catch (err) {
      console.error('Failed to toggle visibility:', err)
      showToast('Failed to update event visibility', 'error')
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <Link to="/admin" className={styles.backLink}>← Back to Dashboard</Link>
        </div>
        <h1 className={styles.title}>Event Management</h1>
        <p className={styles.subtitle}>{total} total events</p>
      </header>

      {/* Filters */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => {
              setIncludeDeleted(e.target.checked)
              setPage(0)
            }}
          />
          <span>Include hidden events</span>
        </label>
      </div>

      {/* Events Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Event</th>
              <th>Creator</th>
              <th>Date</th>
              <th>Photos</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className={styles.loadingCell}>Loading...</td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan="6" className={styles.emptyCell}>No events found</td>
              </tr>
            ) : (
              events.map(event => (
                <tr key={event.id} className={event.is_deleted ? styles.deletedRow : ''}>
                  <td>
                    <Link to={`/event/${event.id}`} className={styles.eventTitle}>
                      {event.title}
                    </Link>
                  </td>
                  <td>
                    <Link to={`/profile/${event.creator_username}`} className={styles.creator}>
                      @{event.creator_username}
                    </Link>
                  </td>
                  <td className={styles.date}>
                    {event.event_date ? new Date(event.event_date).toLocaleDateString() : '—'}
                  </td>
                  <td className={styles.photoCount}>
                    {event.photo_count || 0}
                  </td>
                  <td>
                    {event.is_deleted ? (
                      <span className={`${styles.badge} ${styles.hidden}`}>Hidden</span>
                    ) : (
                      <span className={`${styles.badge} ${styles.visible}`}>Visible</span>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleVisibility(event.id, event.is_deleted)}
                      className={`${styles.actionBtn} ${event.is_deleted ? styles.restore : styles.hide}`}
                    >
                      {event.is_deleted ? 'Restore' : 'Hide'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className={styles.pageBtn}
          >
            ← Previous
          </button>
          <span className={styles.pageInfo}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className={styles.pageBtn}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

export default AdminEvents
