import { Link } from 'react-router-dom'
import styles from './ShareSignUpBanner.module.css'

export default function ShareSignUpBanner({ shareContext, onClose }) {
  const authorUsername = shareContext?.author_username || 'this creator'

  return (
    <div className={styles.banner}>
      <div className={styles.bannerContent}>
        <div className={styles.bannerText}>
          <strong className={styles.bannerTitle}>Discover more family memories</strong>
          <p className={styles.bannerDescription}>
            Sign up free to follow @{authorUsername} and see all their events
          </p>
        </div>
        <a href="https://ourfamilysocials.com" className={styles.logoLink}>
          Our Family Socials
        </a>
        <div className={styles.bannerActions}>
          <Link to="/login?signup=true" className={styles.signUpButton}>
            Sign Up Free
          </Link>
          <Link to="/login" className={styles.loginLink}>
            Already have an account?
          </Link>
        </div>
        <button onClick={onClose} className={styles.closeButton} aria-label="Dismiss banner">
          &times;
        </button>
      </div>
    </div>
  )
}
