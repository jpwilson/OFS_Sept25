import { Link } from 'react-router-dom'
import styles from './TagBadge.module.css'

function TagBadge({ tag, showRemove = false, onRemove }) {
  const isUser = tag.tagged_user_id != null
  const isProfile = tag.tag_profile_id != null

  const getLabel = () => {
    if (isUser) {
      return tag.tagged_user_display_name || tag.tagged_user_username
    }
    if (isProfile) {
      return tag.tag_profile_name
    }
    return 'Unknown'
  }

  const getLink = () => {
    if (isUser) {
      return `/profile/${tag.tagged_user_username}`
    }
    if (isProfile) {
      return `/tag-profile/${tag.tag_profile_id}`
    }
    return '#'
  }

  const getAvatar = () => {
    if (isUser) {
      return tag.tagged_user_avatar_url
    }
    if (isProfile) {
      return tag.tag_profile_photo_url
    }
    return null
  }

  const isPending = tag.status === 'pending'

  return (
    <div className={`${styles.badge} ${isPending ? styles.pending : ''}`}>
      <Link to={getLink()} className={styles.link}>
        {getAvatar() ? (
          <img src={getAvatar()} alt="" className={styles.avatar} />
        ) : (
          <div className={styles.avatarPlaceholder}>
            {isUser ? '@' : '#'}
          </div>
        )}
        <span className={styles.label}>{getLabel()}</span>
      </Link>
      {isPending && (
        <span className={styles.pendingLabel}>Pending</span>
      )}
      {showRemove && onRemove && (
        <button
          type="button"
          className={styles.removeButton}
          onClick={(e) => {
            e.preventDefault()
            onRemove(tag)
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}

export default TagBadge
