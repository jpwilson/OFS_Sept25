import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Header.module.css'

function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>
        Our Family
      </Link>
      <nav className={styles.nav}>
        <Link to="/">Feed</Link>
        <Link to="/map">Map</Link>
        <Link to="/create">Create</Link>
        {user ? (
          <>
            <Link to={`/profile/${user.username}`}>Profile</Link>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </nav>
    </header>
  )
}

export default Header