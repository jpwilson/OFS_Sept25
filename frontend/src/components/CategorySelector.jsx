import { useState } from 'react'
import styles from './CategorySelector.module.css'

/**
 * Category Selector Component
 *
 * Allows selecting up to 2 predefined categories + custom text input option
 */
function CategorySelector({ value, value2, onChange, onChange2 }) {
  const [isCustom, setIsCustom] = useState(false)
  const [customValue, setCustomValue] = useState('')

  const predefinedCategories = [
    { value: 'Birthday', label: 'Birthdays', icon: '🎂', color: '#ff6b9d' },
    { value: 'Anniversary', label: 'Anniversaries', icon: '💝', color: '#c44569' },
    { value: 'Vacation', label: 'Vacations', icon: '✈️', color: '#4a90e2' },
    { value: 'Family Gathering', label: 'Family Gatherings', icon: '👨‍👩‍👧‍👦', color: '#6c5ce7' },
    { value: 'Holiday', label: 'Holidays', icon: '🎄', color: '#00b894' },
    { value: 'Project', label: 'Projects', icon: '🛠️', color: '#fdcb6e' },
    { value: 'Daily Life', label: 'Daily Life', icon: '☕', color: '#74b9ff' },
    { value: 'Milestone', label: 'Milestones', icon: '🏆', color: '#fab1a0' }
  ]

  // Check if a category is selected (in either slot)
  const isSelected = (cat) => cat === value || cat === value2

  // Check if current values are predefined categories
  const isPredefinedValue = predefinedCategories.some(cat => cat.value === value)
  const isPredefinedValue2 = predefinedCategories.some(cat => cat.value === value2)

  // Count selected categories
  const selectedCount = (value ? 1 : 0) + (value2 ? 1 : 0)

  function handleCategoryClick(category) {
    if (isSelected(category)) {
      // Deselect: remove from whichever slot it's in
      if (value === category) {
        // Move value2 to value, clear value2
        onChange(value2 || '')
        onChange2('')
      } else {
        onChange2('')
      }
    } else {
      // Select: add to first available slot
      if (!value) {
        onChange(category)
      } else if (!value2) {
        onChange2(category)
      } else {
        // Both slots full - replace value2
        onChange2(category)
      }
    }
    setIsCustom(false)
  }

  function handleCustomClick() {
    setIsCustom(true)
  }

  function handleCustomInput(e) {
    const newValue = e.target.value
    setCustomValue(newValue)
  }

  function handleCustomSubmit() {
    if (!customValue.trim()) return

    // Add custom category to first available slot
    if (!value) {
      onChange(customValue.trim())
    } else if (!value2) {
      onChange2(customValue.trim())
    } else {
      // Both slots full - replace value2
      onChange2(customValue.trim())
    }
    setCustomValue('')
    setIsCustom(false)
  }

  function clearAll() {
    onChange('')
    onChange2('')
    setIsCustom(false)
    setCustomValue('')
  }

  // Check if there's a custom (non-predefined) value selected
  const hasCustomSelection = (value && !isPredefinedValue) || (value2 && !isPredefinedValue2)

  return (
    <div className={styles.container}>
      <div className={styles.labelRow}>
        <label className={styles.label}>Event Category (Optional)</label>
        <span className={styles.hint}>Select up to 2</span>
      </div>

      {/* Selected categories indicator */}
      {selectedCount > 0 && (
        <div className={styles.selectedIndicator}>
          <span className={styles.selectedCount}>{selectedCount}/2 selected</span>
          <button type="button" className={styles.clearAllBtn} onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}

      <div className={styles.categories}>
        {predefinedCategories.map(category => (
          <button
            key={category.value}
            type="button"
            className={`${styles.category} ${isSelected(category.value) ? styles.selected : ''}`}
            onClick={() => handleCategoryClick(category.value)}
            style={{
              '--category-color': category.color
            }}
          >
            <span className={styles.categoryIcon}>{category.icon}</span>
            <span className={styles.categoryLabel}>{category.label}</span>
          </button>
        ))}

        {/* Custom Category Button */}
        <button
          type="button"
          className={`${styles.category} ${styles.customCategory} ${isCustom || hasCustomSelection ? styles.selected : ''}`}
          onClick={handleCustomClick}
        >
          <span className={styles.categoryIcon}>✏️</span>
          <span className={styles.categoryLabel}>Custom</span>
        </button>
      </div>

      {/* Custom Category Input */}
      {isCustom && (
        <div className={styles.customInput}>
          <input
            type="text"
            placeholder="Enter custom category..."
            value={customValue}
            onChange={handleCustomInput}
            className={styles.input}
            maxLength={50}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCustomSubmit())}
          />
          <button
            type="button"
            className={styles.addButton}
            onClick={handleCustomSubmit}
            disabled={!customValue.trim()}
          >
            Add
          </button>
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => {
              setIsCustom(false)
              setCustomValue('')
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Show custom values that are selected */}
      {hasCustomSelection && !isCustom && (
        <div className={styles.customSelected}>
          {value && !isPredefinedValue && (
            <span className={styles.customTag}>
              {value}
              <button type="button" onClick={() => { onChange(value2 || ''); onChange2(''); }}>×</button>
            </span>
          )}
          {value2 && !isPredefinedValue2 && (
            <span className={styles.customTag}>
              {value2}
              <button type="button" onClick={() => onChange2('')}>×</button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default CategorySelector
