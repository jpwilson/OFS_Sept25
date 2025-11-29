import { useState } from 'react'
import styles from './CategorySelector.module.css'

/**
 * Category Selector Component
 *
 * Predefined categories + custom text input option
 */
function CategorySelector({ value, onChange }) {
  const [isCustom, setIsCustom] = useState(false)

  const predefinedCategories = [
    { value: 'Birthday', icon: '🎂', color: '#ff6b9d' },
    { value: 'Anniversary', icon: '💝', color: '#c44569' },
    { value: 'Vacation', icon: '✈️', color: '#4a90e2' },
    { value: 'Family Gathering', icon: '👨‍👩‍👧‍👦', color: '#6c5ce7' },
    { value: 'Holiday', icon: '🎄', color: '#00b894' },
    { value: 'Project', icon: '🛠️', color: '#fdcb6e' },
    { value: 'Daily Life', icon: '☕', color: '#74b9ff' },
    { value: 'Milestone', icon: '🏆', color: '#fab1a0' }
  ]

  // Check if current value is a predefined category
  const isPredefined = predefinedCategories.some(cat => cat.value === value)

  function handleCategoryClick(category) {
    setIsCustom(false)
    onChange(category)
  }

  function handleCustomClick() {
    setIsCustom(true)
    onChange('')
  }

  function handleCustomInput(e) {
    onChange(e.target.value)
  }

  return (
    <div className={styles.container}>
      <label className={styles.label}>Event Category (Optional)</label>

      <div className={styles.categories}>
        {predefinedCategories.map(category => (
          <button
            key={category.value}
            type="button"
            className={`${styles.category} ${value === category.value ? styles.selected : ''}`}
            onClick={() => handleCategoryClick(category.value)}
            style={{
              '--category-color': category.color
            }}
          >
            <span className={styles.categoryIcon}>{category.icon}</span>
            <span className={styles.categoryLabel}>{category.value}</span>
          </button>
        ))}

        {/* Custom Category Button */}
        <button
          type="button"
          className={`${styles.category} ${styles.customCategory} ${isCustom || (!isPredefined && value) ? styles.selected : ''}`}
          onClick={handleCustomClick}
        >
          <span className={styles.categoryIcon}>✏️</span>
          <span className={styles.categoryLabel}>Custom</span>
        </button>
      </div>

      {/* Custom Category Input */}
      {(isCustom || (!isPredefined && value)) && (
        <div className={styles.customInput}>
          <input
            type="text"
            placeholder="Enter custom category..."
            value={value}
            onChange={handleCustomInput}
            className={styles.input}
            maxLength={50}
          />
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => {
              setIsCustom(false)
              onChange('')
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

export default CategorySelector
