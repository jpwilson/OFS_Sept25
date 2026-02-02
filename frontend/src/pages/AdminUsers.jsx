import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import apiService from '../services/api'
import { useToast } from '../components/Toast'
import styles from './AdminUsers.module.css'

function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const limit = 50
  const { showToast } = useToast()

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0) // Reset to first page on search
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    loadUsers()
  }, [debouncedSearch, page, sortBy, sortOrder])

  async function loadUsers() {
    try {
      setLoading(true)
      const data = await apiService.getAdminUsers(debouncedSearch, page * limit, limit, sortBy, sortOrder)
      setUsers(data.users)
      setTotal(data.total)
    } catch (err) {
      console.error('Failed to load users:', err)
      showToast('Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleSuperuser(userId, currentStatus) {
    try {
      await apiService.toggleSuperuser(userId, !currentStatus)
      // Update local state
      setUsers(users.map(u =>
        u.id === userId ? { ...u, is_superuser: !currentStatus } : u
      ))
      showToast(`Superuser status ${!currentStatus ? 'granted' : 'revoked'}`, 'success')
    } catch (err) {
      console.error('Failed to toggle superuser:', err)
      showToast('Failed to update superuser status', 'error')
    }
  }

  function handleSort(column) {
    if (sortBy === column) {
      // Toggle order if same column
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
        <h1 className={styles.title}>User Management</h1>
        <p className={styles.subtitle}>{total} total users</p>
      </header>

      {/* Search */}
      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Search by username or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Users Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <SortHeader column="username" label="User" />
              <SortHeader column="email" label="Email" />
              <SortHeader column="subscription_tier" label="Subscription" />
              <SortHeader column="created_at" label="Joined" />
              <SortHeader column="last_login" label="Last Login" />
              <th>Events</th>
              <th>Earliest Event</th>
              <th>Latest Event</th>
              <th>Superuser</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className={styles.loadingCell}>Loading...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="9" className={styles.emptyCell}>No users found</td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className={styles.userCell}>
                      <Link to={`/profile/${user.username}`} className={styles.username}>
                        @{user.username}
                      </Link>
                      {user.display_name && (
                        <span className={styles.displayName}>{user.display_name}</span>
                      )}
                    </div>
                  </td>
                  <td className={styles.email}>{user.email}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[user.subscription_tier]}`}>
                      {user.subscription_tier}
                    </span>
                  </td>
                  <td className={styles.date}>{formatDate(user.created_at)}</td>
                  <td className={styles.date}>{formatDate(user.last_login)}</td>
                  <td className={styles.number}>{user.event_count || 0}</td>
                  <td className={styles.date}>{formatDate(user.earliest_event)}</td>
                  <td className={styles.date}>{formatDate(user.latest_event)}</td>
                  <td>
                    <button
                      onClick={() => handleToggleSuperuser(user.id, user.is_superuser)}
                      className={`${styles.toggleBtn} ${user.is_superuser ? styles.active : ''}`}
                    >
                      {user.is_superuser ? '✓ Superuser' : 'Make Superuser'}
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

export default AdminUsers
