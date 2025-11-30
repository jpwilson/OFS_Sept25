import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import apiService from '../services/api'
import ImageGallery from '../components/ImageGallery'
import EventNavigation from '../components/EventNavigation'
import EventMap from '../components/EventMap'
import ShortLocation from '../components/ShortLocation'
import styles from './EventDetail.module.css'
import bannerStyles from './SharedEvent.module.css'

function SharedEvent() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [shareContext, setShareContext] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bannerType, setBannerType] = useState(null)
  const [isExpired, setIsExpired] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [sections, setSections] = useState([])
  const [activeSection, setActiveSection] = useState(null)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [galleryViewMode, setGalleryViewMode] = useState('single')
  const [locations, setLocations] = useState([])
  const [eventImages, setEventImages] = useState([])
  const [lightboxState, setLightboxState] = useState({ open: false, index: 0 })
  const [showCaptions, setShowCaptions] = useState(() => {
    const saved = localStorage.getItem('showImageCaptions')
    return saved === 'true'
  })
  const contentRef = useRef(null)
  const mapRef = useRef(null)

  // Save caption preference to localStorage
  useEffect(() => {
    localStorage.setItem('showImageCaptions', showCaptions)
  }, [showCaptions])

  useEffect(() => {
    loadSharedEvent()
  }, [token, user])

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  async function loadSharedEvent() {
    try {
      const data = await apiService.viewSharedEvent(token)
      setEvent(data.event)
      setShareContext(data.share_context)

      // Load event images
      try {
        const images = await apiService.getEventImages(data.event.id)
        setEventImages(images || [])
      } catch (err) {
        console.error('Error loading event images:', err)
      }

      // Load locations if multi-location event
      if (data.event.has_multiple_locations) {
        try {
          const locs = await apiService.getEventLocations(data.event.id)
          setLocations(locs || [])
        } catch (err) {
          console.error('Error loading locations:', err)
        }
      }

      // Check if expired
      const expired = data.share_context.expires_at && new Date(data.share_context.expires_at) < new Date()
      setIsExpired(expired)

      // Determine banner type
      if (!user) {
        setBannerType('not_logged_in')
      } else if (user.username === data.share_context.author_username) {
        setBannerType('is_author')
      } else {
        try {
          const followStatus = await apiService.checkIfFollowing(data.share_context.author_username)
          setIsFollowing(followStatus.is_following)
          setBannerType(followStatus.is_following ? 'already_following' : 'not_following')
        } catch (err) {
          setBannerType('not_following')
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading shared event:', error)
      setError(error.message || 'Failed to load event')
      setLoading(false)
    }
  }

  // Extract sections from content
  useEffect(() => {
    if (!event || !event.description) return

    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = event.description

    const headings = tempDiv.querySelectorAll('h1, h2, h3')
    const extractedSections = Array.from(headings).map((heading, index) => ({
      id: `section-${index}`,
      title: heading.textContent,
      level: parseInt(heading.tagName.substring(1))
    }))

    setSections(extractedSections)
  }, [event])

  // Make rich HTML images clickable with event delegation and add captions
  useEffect(() => {
    if (!contentRef.current) return

    const handleClick = (e) => {
      // Check if click was on an img element
      if (e.target.tagName === 'IMG') {
        e.preventDefault()
        handleImageClick(e.target.src)
      }
    }

    const content = contentRef.current
    content.addEventListener('click', handleClick)

    // Add cursor pointer style to all images and insert captions if they exist
    const images = content.querySelectorAll('img')
    images.forEach(img => {
      img.style.cursor = 'pointer'

      // Find matching caption from eventImages
      const matchingImage = eventImages?.find(ei => img.src.includes(ei.image_url) || ei.image_url.includes(img.src))

      if (matchingImage && matchingImage.caption) {
        // Check if caption already exists
        let captionDiv = img.nextElementSibling
        if (!captionDiv || !captionDiv.classList.contains('image-caption')) {
          // Create caption div
          captionDiv = document.createElement('div')
          captionDiv.classList.add('image-caption')
          captionDiv.style.fontSize = '14px'
          captionDiv.style.color = '#888'
          captionDiv.style.fontStyle = 'italic'
          captionDiv.style.textAlign = 'center'
          captionDiv.style.marginTop = '8px'
          captionDiv.style.marginBottom = '20px'
          captionDiv.textContent = matchingImage.caption

          // Insert after image
          img.parentNode.insertBefore(captionDiv, img.nextSibling)
        }

        // Show/hide based on showCaptions state
        captionDiv.style.display = showCaptions ? 'block' : 'none'
      }
    })

    return () => {
      content.removeEventListener('click', handleClick)
      // Clean up caption divs
      const captions = content.querySelectorAll('.image-caption')
      captions.forEach(cap => cap.remove())
    }
  }, [event, eventImages, showCaptions]) // Re-run when event, eventImages, or showCaptions changes

  // All media (images and videos)
  const allMedia = useMemo(() => {
    if (!event || !event.description) return []

    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = event.description
    const mediaElements = tempDiv.querySelectorAll('img, video')

    return Array.from(mediaElements).map((element) => {
      if (element.tagName === 'VIDEO') {
        return {
          type: 'video',
          src: element.src,
          alt: element.alt || ''
        }
      }
      return {
        type: 'image',
        src: element.src,
        alt: element.alt || ''
      }
    })
  }, [event])

  async function handleFollow() {
    if (!user) {
      navigate('/login')
      return
    }

    try {
      await apiService.followUser(shareContext.author_username)
      setIsFollowing(true)
      setBannerType('already_following')
    } catch (error) {
      console.error('Error following user:', error)
    }
  }

  function formatDateRange(start, end, short = false) {
    const startDate = new Date(start)
    const endDate = end ? new Date(end) : null

    const options = short
      ? { month: 'short', day: 'numeric', year: '2-digit' }
      : { month: 'long', day: 'numeric', year: 'numeric' }

    if (!endDate || startDate.toDateString() === endDate.toDateString()) {
      return startDate.toLocaleDateString('en-US', options)
    }

    if (startDate.getFullYear() === endDate.getFullYear()) {
      if (startDate.getMonth() === endDate.getMonth()) {
        return `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDate.getDate()}, ${endDate.getFullYear()}`
      }
      return `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
    }

    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`
  }

  function handleImageClick(mediaUrl) {
    const mediaIndex = allMedia.findIndex(item => {
      const itemSrc = typeof item === 'string' ? item : (item.src || item.url)
      return itemSrc === mediaUrl
    })

    if (mediaIndex !== -1) {
      setLightboxState({ open: true, index: mediaIndex })
    }
  }

  const handleGalleryClick = () => {
    const newMode = galleryViewMode === 'grid' ? 'single' : 'grid'
    setGalleryViewMode(newMode)

    if (newMode === 'grid') {
      setTimeout(() => {
        const gallery = document.querySelector('[class*="gallerySection"]')
        if (gallery) {
          const offset = 80
          const elementPosition = gallery.getBoundingClientRect().top
          const offsetPosition = elementPosition + window.pageYOffset - offset

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          })
        }
      }, 100)
    }

    if (isMobile) {
      setIsMobileNavOpen(false)
    }
  }

  const handleMapClick = () => {
    setTimeout(() => {
      if (mapRef.current) {
        const offset = 80
        const elementPosition = mapRef.current.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - offset

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      }
    }, 100)

    if (isMobile) {
      setIsMobileNavOpen(false)
    }
  }

  if (!event || !shareContext) {
    return loading ? (
      <div className={styles.loading}>Loading event...</div>
    ) : (
      <div className={bannerStyles.container}>
        <div className={bannerStyles.error}>
          <div className={bannerStyles.errorIcon}>🔗</div>
          <h2>Unable to Load Event</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Banner */}
      {isExpired ? (
        <div className={`${bannerStyles.banner} ${bannerStyles.bannerExpired}`}>
          <div className={bannerStyles.bannerContent}>
            <div className={bannerStyles.bannerIcon}>⏰</div>
            <div className={bannerStyles.bannerText}>
              <strong>This share link has expired.</strong>
              <p>
                Follow <Link to={`/profile/${shareContext.author_username}`}>@{shareContext.author_username}</Link> to request access to their events.
              </p>
            </div>
            {!user && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <Link to="/login?signup=true" className={bannerStyles.bannerButton}>
                  Sign Up Free
                </Link>
                <Link to="/login" className={bannerStyles.bannerButton} style={{ background: 'rgba(255,255,255,0.2)' }}>
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : bannerType === 'not_logged_in' ? (
        <div className={`${bannerStyles.banner} ${bannerStyles.bannerSignup}`}>
          <div className={bannerStyles.bannerContent}>
            <div className={bannerStyles.bannerIcon}>👋</div>
            <div className={bannerStyles.bannerText}>
              <strong>Enjoying this event?</strong>
              <p>
                Sign up to follow <Link to={`/profile/${shareContext.author_username}`}>@{shareContext.author_username}</Link> and see more of their events!
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Link to="/login?signup=true" className={bannerStyles.bannerButton}>
                Sign Up Free
              </Link>
              <Link to="/login" className={bannerStyles.bannerButton} style={{ background: 'rgba(102, 126, 234, 0.2)', color: '#667eea', border: '1px solid #667eea' }}>
                Already have an account? Sign In
              </Link>
            </div>
          </div>
        </div>
      ) : bannerType === 'not_following' ? (
        <div className={`${bannerStyles.banner} ${bannerStyles.bannerFollow}`}>
          <div className={bannerStyles.bannerContent}>
            <div className={bannerStyles.bannerIcon}>👤</div>
            <div className={bannerStyles.bannerText}>
              <strong>Want to see more?</strong>
              <p>
                Follow <Link to={`/profile/${shareContext.author_username}`}>@{shareContext.author_username}</Link> to permanently access their events.
              </p>
            </div>
            <button onClick={handleFollow} className={bannerStyles.bannerButton}>
              Request to Follow
            </button>
          </div>
        </div>
      ) : bannerType === 'already_following' ? (
        <div className={`${bannerStyles.banner} ${bannerStyles.bannerSuccess}`}>
          <div className={bannerStyles.bannerContent}>
            <div className={bannerStyles.bannerIcon}>✓</div>
            <div className={bannerStyles.bannerText}>
              <strong>You're following this user</strong>
              <p>
                You already have access to <Link to={`/profile/${shareContext.author_username}`}>@{shareContext.author_username}</Link>'s events.
              </p>
            </div>
            <Link to="/feed" className={bannerStyles.bannerButton}>
              Go to Feed
            </Link>
          </div>
        </div>
      ) : bannerType === 'is_author' ? (
        <div className={`${bannerStyles.banner} ${bannerStyles.bannerInfo}`}>
          <div className={bannerStyles.bannerContent}>
            <div className={bannerStyles.bannerIcon}>ℹ️</div>
            <div className={bannerStyles.bannerText}>
              <strong>This is your shared event</strong>
              <p>This is how others see your event when you share the link.</p>
            </div>
            <Link to={`/event/${event.id}`} className={bannerStyles.bannerButton}>
              View Full Event
            </Link>
          </div>
        </div>
      ) : null}

      {/* Hero Image */}
      <div
        className={styles.heroImage}
        style={{ backgroundImage: `url(${event.cover_image_url})` }}
      >
        <div className={styles.heroOverlay}>
          <div className={styles.heroHeader}>
            <h1 className={styles.title}>
              <span className={styles.titleDesktop}>{event.title}</span>
              <span className={styles.titleMobile}>{event.short_title || event.title}</span>
            </h1>
          </div>
          <div className={styles.meta}>
            <Link to={`/profile/${shareContext.author_username}`} className={styles.author}>
              <div className={styles.avatar}></div>
              <span className={styles.authorDesktop}>{shareContext.author_full_name || shareContext.author_username}</span>
              <span className={styles.authorMobile}>@{shareContext.author_username}</span>
            </Link>
            <span>·</span>
            <span className={styles.dateDesktop}>{formatDateRange(event.start_date, event.end_date)}</span>
            <span className={styles.dateMobile}>{formatDateRange(event.start_date, event.end_date, true)}</span>
            <span>·</span>
            <ShortLocation locationName={event.location_name} maxWords={3} />
          </div>
        </div>
      </div>

      {/* Page Layout */}
      <div className={styles.pageLayout}>
        {sections.length > 0 && (
          <EventNavigation
            sections={sections}
            activeSection={activeSection}
            imageCount={allMedia.length}
            locationCount={locations.length}
            isMobile={isMobile}
            isOpen={isMobileNavOpen}
            onToggle={() => setIsMobileNavOpen(!isMobileNavOpen)}
            onGalleryClick={handleGalleryClick}
            onMapClick={handleMapClick}
          />
        )}

        <div className={styles.mainContent} ref={contentRef}>
          {isMobile && sections.length > 0 && (
            <button
              className={styles.mobileMenuButton}
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            >
              ☰ Table of Contents
            </button>
          )}

          <div className={styles.content}>
            <div
              className={styles.richContent}
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          </div>

          {/* Image Gallery */}
          {allMedia.length > 0 && (
            <div className={styles.gallerySection}>
              <ImageGallery
                images={allMedia}
                viewMode={galleryViewMode}
                onToggleView={() => setGalleryViewMode(galleryViewMode === 'grid' ? 'single' : 'grid')}
                onImageClick={handleImageClick}
                lightboxState={lightboxState}
                setLightboxState={setLightboxState}
                showCaptions={showCaptions}
                setShowCaptions={setShowCaptions}
                eventImages={eventImages}
              />
            </div>
          )}

          {/* Map */}
          {locations.length > 0 && (
            <div ref={mapRef} className={styles.mapSection}>
              <EventMap locations={locations} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SharedEvent
