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
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'published', 'draft'
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
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
  }, [debouncedSearch, includeDeleted, statusFilter, sortBy, sortOrder, page])

  async function loadEvents() {
    try {
      setLoading(true)
      const data = await apiService.getAdminEvents(
        debouncedSearch,
        includeDeleted,
        page * limit,
        limit,
        sortBy,
        sortOrder,
        statusFilter
      )
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

  function handleSort(column) {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
    setPage(0)
  }

  function SortHeader({ column, label }) {
    const isActive = sortBy === column
    return (
      <th
        className={`${styles.sortableHeader} ${isActive ? styles.activeSort : ''}`}
        onClick={() => handleSort(column)}
      >
        {label}
        <span className={styles.sortIcon}>
          {isActive ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </th>
    )
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString()
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

        {/* Status filter tabs */}
        <div className={styles.statusTabs}>
          {['all', 'published', 'draft'].map(status => (
            <button
              key={status}
              className={`${styles.statusTab} ${statusFilter === status ? styles.activeTab : ''}`}
              onClick={() => { setStatusFilter(status); setPage(0) }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => {
              setIncludeDeleted(e.target.checked)
              setPage(0)
            }}
          />
          <span>Include hidden</span>
        </label>
      </div>

      {/* Events Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <SortHeader column="title" label="Event" />
              <th>Creator</th>
              <SortHeader column="start_date" label="Event Date" />
              <th>Photos</th>
              <th>Videos</th>
              <th>Reactions</th>
              <th>Comments</th>
              <SortHeader column="is_published" label="Status" />
              <th>Hide</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className={styles.loadingCell}>Loading...</td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan="9" className={styles.emptyCell}>No events found</td>
              </tr>
            ) : (
              events.map(event => (
                <tr key={event.id} className={event.is_deleted ? styles.deletedRow : ''}>
                  <td>
                    <Link to={`/event/${event.slug || event.id}`} className={styles.eventTitle}>
                      {event.title}
                    </Link>
                  </td>
                  <td>
                    {event.author_username ? (
                      <Link to={`/profile/${event.author_username}`} className={styles.creator}>
                        @{event.author_username}
                      </Link>
                    ) : (
                      <span className={styles.unknownCreator}>Unknown</span>
                    )}
                  </td>
                  <td className={styles.date}>{formatDate(event.start_date)}</td>
                  <td className={styles.number}>{event.photo_count || 0}</td>
                  <td className={styles.number}>{event.video_count || 0}</td>
                  <td className={styles.number}>{event.reaction_count || 0}</td>
                  <td className={styles.number}>{event.comment_count || 0}</td>
                  <td>
                    {event.is_published ? (
                      <span className={`${styles.badge} ${styles.published}`}>Published</span>
                    ) : (
                      <span className={`${styles.badge} ${styles.draft}`}>Draft</span>
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
