import styles from './ViewToggle.module.css'

const VIEW_CONFIG = [
  { id: 'feed', label: 'Feed', icon: '⊞', color: '#4a9eff' },
  { id: 'calendar', label: 'Calendar', icon: '📅', color: '#a855f7' },
  { id: 'map', label: 'Map', icon: '🗺️', color: '#22c55e' },
  { id: 'timeline', label: 'Timeline', icon: '⏳', color: '#f97316' }
]

export default function ViewToggle({ activeView, onChange }) {
  const activeConfig = VIEW_CONFIG.find(v => v.id === activeView)

  return (
    <div className={styles.container}>
      {VIEW_CONFIG.map(view => (
        <button
          key={view.id}
          className={`${styles.button} ${activeView === view.id ? styles.active : ''}`}
          style={activeView === view.id ? {
            background: view.color,
            boxShadow: `0 2px 12px ${view.color}50`
          } : undefined}
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
