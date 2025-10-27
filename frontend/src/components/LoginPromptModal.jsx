import { Link } from 'react-router-dom'
import styles from './LoginPromptModal.module.css'

function LoginPromptModal({ isOpen, onClose, action = "continue" }) {
  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>

        <div className={styles.content}>
          <div className={styles.icon}>🔒</div>
          <h2 className={styles.title}>Login Required</h2>
          <p className={styles.message}>
            You need to be logged in to {action}. Join Our Family Socials to start
            sharing and preserving your family's precious moments!
          </p>

          <div className={styles.actions}>
            <Link to="/login" className={styles.loginButton}>
              Login or Sign Up
            </Link>
            <button onClick={onClose} className={styles.cancelButton}>
              Maybe Later
            </button>
          </div>

          <p className={styles.note}>
            Free forever for up to 5 events. No credit card required.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPromptModal
