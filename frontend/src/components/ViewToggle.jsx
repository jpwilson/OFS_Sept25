import styles from './ViewToggle.module.css'

const VIEW_CONFIG = [
  { id: 'feed', label: 'Feed', icon: '⊞' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'map', label: 'Map', icon: '🗺️' },
  { id: 'timeline', label: 'Timeline', icon: '⏳' }
]

export default function ViewToggle({ activeView, onChange }) {
  return (
    <div className={styles.container}>
      {VIEW_CONFIG.map(view => (
        <button
          key={view.id}
          className={`${styles.button} ${activeView === view.id ? styles.active : ''}`}
          onClick={() => onChange(view.id)}
          aria-pressed={activeView === view.id}
        >
          <span className={styles.icon}>{view.icon}</span>
          <span className={styles.label}>{view.label}</span>
        </button>
      ))}
    </div>
  )
}
