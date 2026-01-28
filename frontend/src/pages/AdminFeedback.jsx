import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import apiService from '../services/api'
import { useToast } from '../components/Toast'
import styles from './AdminFeedback.module.css'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' }
]

function AdminFeedback() {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState(null)
  const [editingNotes, setEditingNotes] = useState({})
  const limit = 50
  const { showToast } = useToast()

  useEffect(() => {
    loadFeedback()
  }, [statusFilter, page])

  async function loadFeedback() {
    try {
      setLoading(true)
      const data = await apiService.getAdminFeedback(statusFilter, page * limit, limit)
      setFeedback(data.feedback)
      setTotal(data.total)
    } catch (err) {
      console.error('Failed to load feedback:', err)
      showToast('Failed to load feedback', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(id, newStatus) {
    try {
      await apiService.updateAdminFeedback(id, { status: newStatus })
      setFeedback(feedback.map(f =>
        f.id === id ? { ...f, status: newStatus } : f
      ))
      showToast('Status updated', 'success')
    } catch (err) {
      console.error('Failed to update status:', err)
      showToast('Failed to update status', 'error')
    }
  }

  async function handleSaveNotes(id) {
    try {
      const notes = editingNotes[id] || ''
      await apiService.updateAdminFeedback(id, { admin_notes: notes })
      setFeedback(feedback.map(f =>
        f.id === id ? { ...f, admin_notes: notes } : f
      ))
      setEditingNotes(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      showToast('Notes saved', 'success')
    } catch (err) {
      console.error('Failed to save notes:', err)
      showToast('Failed to save notes', 'error')
    }
  }

  function toggleExpand(id) {
    setExpandedId(expandedId === id ? null : id)
  }

  function startEditingNotes(id, currentNotes) {
    setEditingNotes(prev => ({
      ...prev,
      [id]: currentNotes || ''
    }))
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <Link to="/admin" className={styles.backLink}>← Back to Dashboard</Link>
        </div>
        <h1 className={styles.title}>Feedback Management</h1>
        <p className={styles.subtitle}>{total} feedback items</p>
      </header>

      {/* Filters */}
      <div className={styles.filters}>
        <label className={styles.filterLabel}>Status:</label>
        <div className={styles.statusTabs}>
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                setStatusFilter(opt.value)
                setPage(0)
              }}
              className={`${styles.statusTab} ${statusFilter === opt.value ? styles.active : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback List */}
      <div className={styles.feedbackList}>
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : feedback.length === 0 ? (
          <div className={styles.empty}>No feedback found</div>
        ) : (
          feedback.map(item => (
            <div
              key={item.id}
              className={`${styles.feedbackCard} ${expandedId === item.id ? styles.expanded : ''}`}
            >
              <div className={styles.cardHeader} onClick={() => toggleExpand(item.id)}>
                <div className={styles.cardInfo}>
                  <span className={`${styles.typeBadge} ${styles[item.feedback_type]}`}>
                    {item.feedback_type}
                  </span>
                  <span className={styles.date}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  {item.user_username && (
                    <Link
                      to={`/profile/${item.user_username}`}
                      className={styles.username}
                      onClick={(e) => e.stopPropagation()}
                    >
                      @{item.user_username}
                    </Link>
                  )}
                </div>
                <div className={styles.cardActions}>
                  <select
                    value={item.status}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleStatusChange(item.id, e.target.value)
                    }}
                    className={`${styles.statusSelect} ${styles[item.status]}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {STATUS_OPTIONS.filter(o => o.value).map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <span className={styles.expandIcon}>
                    {expandedId === item.id ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              <div className={styles.cardPreview}>
                {item.message.substring(0, 150)}{item.message.length > 150 ? '...' : ''}
              </div>

              {expandedId === item.id && (
                <div className={styles.cardExpanded}>
                  <div className={styles.fullMessage}>
                    <h4>Full Message:</h4>
                    <p>{item.message}</p>
                  </div>

                  {item.page_url && (
                    <div className={styles.metadata}>
                      <strong>Page URL:</strong> {item.page_url}
                    </div>
                  )}

                  {item.user_email && (
                    <div className={styles.metadata}>
                      <strong>Email:</strong> {item.user_email}
                    </div>
                  )}

                  <div className={styles.notesSection}>
                    <h4>Admin Notes:</h4>
                    {editingNotes.hasOwnProperty(item.id) ? (
                      <div className={styles.notesEdit}>
                        <textarea
                          value={editingNotes[item.id]}
                          onChange={(e) => setEditingNotes(prev => ({
                            ...prev,
                            [item.id]: e.target.value
                          }))}
                          className={styles.notesTextarea}
                          placeholder="Add notes about this feedback..."
                        />
                        <div className={styles.notesActions}>
                          <button
                            onClick={() => handleSaveNotes(item.id)}
                            className={styles.saveBtn}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingNotes(prev => {
                              const next = { ...prev }
                              delete next[item.id]
                              return next
                            })}
                            className={styles.cancelBtn}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.notesDisplay}>
                        {item.admin_notes ? (
                          <p>{item.admin_notes}</p>
                        ) : (
                          <p className={styles.noNotes}>No notes yet</p>
                        )}
                        <button
                          onClick={() => startEditingNotes(item.id, item.admin_notes)}
                          className={styles.editNotesBtn}
                        >
                          {item.admin_notes ? 'Edit Notes' : 'Add Notes'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
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

export default AdminFeedback
