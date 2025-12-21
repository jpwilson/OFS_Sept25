import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import styles from './TagPicker.module.css'

function TagPicker({ selectedTags, onTagsChange, onCreateProfile }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Don't close if clicking inside a modal (CreateTagProfileModal, ImageCropper, etc.)
      // Modals have overlay classes or data attributes we can check
      const isInsideModal = e.target.closest('[class*="overlay"]') ||
                            e.target.closest('[class*="modal"]') ||
                            e.target.closest('[class*="Modal"]') ||
                            e.target.closest('[class*="Cropper"]')

      if (isInsideModal) {
        return // Don't close dropdown when interacting with modals
      }

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current.contains(e.target)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search when query changes
  useEffect(() => {
    if (query.length < 1) {
      setResults([])
      return
    }

    const searchTimeout = setTimeout(async () => {
      setIsLoading(true)
      try {
        const data = await api.searchTaggable(query)
        // Filter out already selected tags
        const filtered = data.filter(item => {
          const isSelected = selectedTags.some(tag => {
            if (item.type === 'user' && tag.type === 'user') {
              return tag.id === item.id
            }
            if (item.type === 'profile' && tag.type === 'profile') {
              return tag.id === item.id
            }
            return false
          })
          return !isSelected
        })
        setResults(filtered)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [query, selectedTags])

  const handleSelect = (item) => {
    const newTag = {
      type: item.type,
      id: item.id,
      name: item.name,
      display_name: item.display_name,
      photo_url: item.photo_url,
      username: item.username,
      relationship_to_creator: item.relationship_to_creator,
      created_by_username: item.created_by_username
    }
    onTagsChange([...selectedTags, newTag])
    setQuery('')
    setShowDropdown(false)
  }

  const handleRemove = (tagToRemove) => {
    onTagsChange(selectedTags.filter(tag =>
      !(tag.type === tagToRemove.type && tag.id === tagToRemove.id)
    ))
  }

  const handleCreateNew = () => {
    if (onCreateProfile) {
      onCreateProfile(query)
    }
    setQuery('')
    setShowDropdown(false)
  }

  const getTagLabel = (tag) => {
    if (tag.type === 'user') {
      return tag.display_name || tag.username || tag.name
    }
    // Profile
    let label = tag.name
    if (tag.relationship_to_creator && tag.created_by_username) {
      label += ` (${tag.created_by_username}'s ${tag.relationship_to_creator})`
    } else if (tag.created_by_username) {
      label += ` (via ${tag.created_by_username})`
    }
    return label
  }

  const getResultLabel = (item) => {
    if (item.type === 'user') {
      const name = item.display_name || item.name
      return (
        <span className={styles.resultLabel}>
          <span className={styles.resultName}>{name}</span>
          {item.username && (
            <span className={styles.resultUsername}>@{item.username}</span>
          )}
        </span>
      )
    }
    // Profile
    return (
      <span className={styles.resultLabel}>
        <span className={styles.resultName}>{item.name}</span>
        {item.relationship_to_creator && item.created_by_username && (
          <span className={styles.resultContext}>
            {item.created_by_username}'s {item.relationship_to_creator}
          </span>
        )}
        {!item.relationship_to_creator && item.created_by_username && (
          <span className={styles.resultContext}>via {item.created_by_username}</span>
        )}
      </span>
    )
  }

  return (
    <div className={styles.container}>
      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className={styles.selectedTags}>
          {selectedTags.map((tag, index) => (
            <div key={`${tag.type}-${tag.id}-${index}`} className={styles.tag}>
              {tag.photo_url ? (
                <img
                  src={tag.photo_url}
                  alt=""
                  className={styles.tagAvatar}
                />
              ) : (
                <div className={styles.tagAvatarPlaceholder}>
                  {tag.type === 'user' ? '@' : '#'}
                </div>
              )}
              <span className={styles.tagName}>{getTagLabel(tag)}</span>
              <button
                type="button"
                className={styles.tagRemove}
                onClick={() => handleRemove(tag)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search people to tag..."
          className={styles.input}
        />

        {/* Dropdown */}
        {showDropdown && (query.length > 0 || results.length > 0) && (
          <div ref={dropdownRef} className={styles.dropdown}>
            {isLoading ? (
              <div className={styles.loading}>Searching...</div>
            ) : results.length > 0 ? (
              <>
                {results.map((item, index) => (
                  <button
                    key={`${item.type}-${item.id}-${index}`}
                    type="button"
                    className={styles.resultItem}
                    onClick={() => handleSelect(item)}
                  >
                    {item.photo_url ? (
                      <img
                        src={item.photo_url}
                        alt=""
                        className={styles.resultAvatar}
                      />
                    ) : (
                      <div className={styles.resultAvatarPlaceholder}>
                        {item.type === 'user' ? '@' : '#'}
                      </div>
                    )}
                    {getResultLabel(item)}
                    <span className={styles.resultType}>
                      {item.type === 'user' ? 'User' : 'Profile'}
                    </span>
                  </button>
                ))}
              </>
            ) : query.length > 0 ? (
              <div className={styles.noResults}>
                <p>No results for "{query}"</p>
                {onCreateProfile && (
                  <button
                    type="button"
                    className={styles.createButton}
                    onClick={handleCreateNew}
                  >
                    + Create tag profile for "{query}"
                  </button>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

export default TagPicker
