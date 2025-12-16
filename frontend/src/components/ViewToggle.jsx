import styles from './ViewToggle.module.css'

const VIEW_CONFIG = [
  { id: 'feed', label: 'Feed', color: '#4a9eff' },
  { id: 'calendar', label: 'Calendar', color: '#a855f7' },
  { id: 'map', label: 'Map', color: '#22c55e' },
  { id: 'timeline', label: 'Timeline', color: '#f97316' }
]

export default function ViewToggle({ activeView, onChange }) {
  return (
    <div className={styles.container}>
      {VIEW_CONFIG.map(view => (
        <button
          key={view.id}
          className={`${styles.button} ${activeView === view.id ? styles.active : ''}`}
          style={{
            '--view-color': view.color,
            '--view-color-light': `${view.color}15`,
            '--view-color-hover': `${view.color}25`
          }}
          onClick={() => onChange(view.id)}
          aria-pressed={activeView === view.id}
        >
          {view.label}
        </button>
      ))}
    </div>
  )
}
