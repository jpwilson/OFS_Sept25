import { useState, useCallback } from 'react'
import styles from './EventNavigation.module.css'

function EventNavigation({ sections, activeSection, imageCount, isMobile, isOpen, onToggle, onGalleryClick }) {
  const [expanded, setExpanded] = useState(() => {
    // Auto-expand all sections by default
    const initialState = {}
    sections.forEach(skip => {
      initialState[skip.id] = true
    })
    return initialState
  })

  const toggleSection = useCallback((sectionId) => {
    setExpanded(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }, [])

  const scrollToSection = useCallback((anchorId) => {
    const element = document.getElementById(anchorId)
    if (element) {
      const offset = 80 // Account for fixed header
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })

      // Close mobile menu after selecting a section
      if (isMobile && onToggle) {
        onToggle()
      }
    }
  }, [isMobile, onToggle])


  if (!sections || sections.length === 0) {
    return null
  }

  return (
    <>
      {isMobile && isOpen && (
        <div className={styles.overlay} onClick={onToggle} />
      )}
      <nav className={`${styles.navigation} ${isMobile ? styles.mobile : ''} ${isMobile && isOpen ? styles.open : ''}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>Contents</h3>
      </div>

      {imageCount > 0 && onGalleryClick && (
        <button className={styles.galleryButton} onClick={onGalleryClick}>
          📷 View all {imageCount} {imageCount === 1 ? 'image' : 'images'}
        </button>
      )}

      <div className={styles.sections}>
        {sections.map(skip => (
          <div key={skip.id} className={styles.skipSection}>
            <button
              className={`${styles.skipButton} ${activeSection === skip.id ? styles.active : ''}`}
              onClick={() => {
                toggleSection(skip.id)
                scrollToSection(skip.id)
              }}
            >
              <span className={`${styles.arrow} ${expanded[skip.id] ? styles.expanded : ''}`}>
                ▶
              </span>
              <span className={styles.skipTitle}>{skip.title}</span>
            </button>

            {expanded[skip.id] && skip.jumps && skip.jumps.length > 0 && (
              <div className={styles.jumps}>
                {skip.jumps.map(jump => (
                  <button
                    key={jump.id}
                    className={`${styles.jumpButton} ${activeSection === jump.id ? styles.active : ''}`}
                    onClick={() => scrollToSection(jump.id)}
                  >
                    {jump.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
    </>
  )
}

export default EventNavigation
