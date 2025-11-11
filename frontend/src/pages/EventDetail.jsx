import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmModal'
import LoginPromptModal from '../components/LoginPromptModal'
import ImageGallery from '../components/ImageGallery'
import EventNavigation from '../components/EventNavigation'
import EventMap from '../components/EventMap'
import ShortLocation from '../components/ShortLocation'
import styles from './EventDetail.module.css'
import apiService from '../services/api'
import { mockEventDetails } from '../data/mockEvents'

function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [likeStats, setLikeStats] = useState({ like_count: 0, is_liked: false, recent_likes: [] })
  const [showAllLikes, setShowAllLikes] = useState(false)
  const [allLikes, setAllLikes] = useState([])
  const [sections, setSections] = useState([])
  const [activeSection, setActiveSection] = useState(null)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [galleryViewMode, setGalleryViewMode] = useState('single')
  const [locations, setLocations] = useState([])
  const [eventImages, setEventImages] = useState([])
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [loginPromptAction, setLoginPromptAction] = useState('continue')
  const contentRef = useRef(null)
  const mapRef = useRef(null)

  const isAuthor = user && event && user.username === event.author_username

  // Handle gallery button click from navigation
  const handleGalleryClick = useCallback(() => {
    // Toggle between grid and single mode
    const newMode = galleryViewMode === 'grid' ? 'single' : 'grid'
    setGalleryViewMode(newMode)

    // Only scroll to gallery when opening (switching to grid)
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

    // Close mobile menu if open
    if (isMobile) {
      setIsMobileNavOpen(false)
    }
  }, [isMobile, galleryViewMode])

  // Handle map button click from navigation
  const handleMapClick = useCallback(() => {
    if (mapRef.current) {
      const offset = 80
      const elementPosition = mapRef.current.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }

    // Close mobile menu if open
    if (isMobile) {
      setIsMobileNavOpen(false)
    }
  }, [isMobile])

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    loadEvent()
    loadComments()
    loadLocations()
    loadEventImages()
    if (user) {
      loadLikes()
    }
  }, [id, user])

  async function handleDelete() {
    const confirmed = await confirm({
      title: 'Move to Trash',
      message: 'Move this event to trash? You can restore it later or delete it permanently.',
      confirmText: 'Move to Trash',
      cancelText: 'Cancel',
      danger: false
    })

    if (!confirmed) return

    try {
      await apiService.deleteEvent(id)
      showToast('Event moved to trash', 'success')
      navigate('/profile/' + user.username, { state: { activeTab: 'trash' } })
    } catch (error) {
      console.error('Error deleting event:', error)
      showToast('Failed to delete event', 'error')
    }
  }

  async function loadEvent() {
    const data = await apiService.getEvent(id)
    if (!data) {
      // Use mock data if API fails
      setEvent(getMockEvent(id))
    } else {
      setEvent(data)
    }
    setLoading(false)
  }

  async function loadLocations() {
    try {
      const data = await apiService.getEventLocations(id)
      const eventLocations = data || []

      // Add primary event location as the first location (if it exists)
      // This is the location from the "Location" field in the event form
      if (event?.latitude && event?.longitude && event?.location_name) {
        const primaryLocation = {
          id: 'primary',
          event_id: event.id,
          location_name: event.location_name,
          latitude: event.latitude,
          longitude: event.longitude,
          location_type: 'primary',
          order_index: -1, // First location
          timestamp: event.start_date,
          section_id: null,
          section_title: 'Event Start'
        }
        setLocations([primaryLocation, ...eventLocations])
      } else {
        setLocations(eventLocations)
      }
    } catch (error) {
      console.error('Error loading locations:', error)
      setLocations([])
    }
  }

  async function loadEventImages() {
    try {
      const images = await apiService.getEventImages(id)
      setEventImages(images || [])
    } catch (error) {
      console.error('Error loading event images:', error)
      setEventImages([])
    }
  }

  function getMockEvent(eventId) {
    return mockEventDetails[eventId] || mockEventDetails[1]
  }

  function formatDateRange(start, end, shortFormat = false) {
    const startDate = new Date(start)
    const endDate = new Date(end)

    if (shortFormat) {
      // Mobile short format: "Sept 24 - Oct 20, '25"
      const startMonth = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const endMonth = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const year = `'${endDate.getFullYear().toString().slice(-2)}`

      if (start === end || !end) {
        return `${startMonth}, ${year}`
      }

      return `${startMonth} - ${endMonth}, ${year}`
    }

    // Desktop full format: "September 24 - October 20, 2025"
    const options = { month: 'long', day: 'numeric', year: 'numeric' }

    if (start === end || !end) {
      return startDate.toLocaleDateString('en-US', options)
    }

    const startMonth = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    return `${startMonth} - ${endDate.toLocaleDateString('en-US', options)}`
  }

  async function loadComments() {
    const data = await apiService.getComments(id)
    setComments(data)
  }

  async function loadLikes() {
    const data = await apiService.getLikes(id)
    setLikeStats(data)
  }

  async function handleLikeToggle() {
    if (!user) {
      setLoginPromptAction('like this event')
      setShowLoginPrompt(true)
      return
    }

    try {
      if (likeStats.is_liked) {
        await apiService.unlikeEvent(id)
        showToast('Unliked event', 'success')
      } else {
        await apiService.likeEvent(id)
        showToast('Liked event', 'success')
      }
      loadLikes()
    } catch (error) {
      console.error('Error toggling like:', error)
      showToast('Failed to update like', 'error')
    }
  }

  async function handleCommentSubmit(e) {
    e.preventDefault()
    if (!user) {
      setLoginPromptAction('comment on this event')
      setShowLoginPrompt(true)
      return
    }
    if (!newComment.trim() || commentLoading) return

    setCommentLoading(true)
    try {
      await apiService.createComment(id, newComment.trim())
      setNewComment('')
      loadComments()
      showToast('Comment posted', 'success')
    } catch (error) {
      console.error('Error creating comment:', error)
      showToast('Failed to post comment', 'error')
    }
    setCommentLoading(false)
  }

  async function handleDeleteComment(commentId) {
    const confirmed = await confirm({
      title: 'Delete Comment',
      message: 'Are you sure you want to delete this comment?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true
    })

    if (!confirmed) return

    try {
      await apiService.deleteComment(id, commentId)
      loadComments()
      showToast('Comment deleted', 'success')
    } catch (error) {
      console.error('Error deleting comment:', error)
      showToast('Failed to delete comment', 'error')
    }
  }

  async function handleShowAllLikes() {
    if (!showAllLikes) {
      const data = await apiService.getAllLikes(id)
      setAllLikes(data)
    }
    setShowAllLikes(!showAllLikes)
  }

  function formatCommentDate(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Extract all images from the event for the gallery
  const allImages = useMemo(() => {
    if (!event) return []

    const images = []

    // ALWAYS include cover image first if it exists
    if (event.cover_image_url) {
      images.push({ src: event.cover_image_url, caption: null })
    }

    // Priority 1: Use event_images from database (new system with captions)
    if (eventImages && eventImages.length > 0) {
      eventImages.forEach(img => {
        // Don't duplicate cover image if it's already in event_images
        if (img.image_url !== event.cover_image_url) {
          images.push({
            src: img.image_url,
            caption: img.caption,
            id: img.id,
            alt: img.alt_text
          })
        }
      })
      return images
    }

    // Priority 2: Fallback to HTML parsing (backwards compatibility for old events)
    // Add images from content blocks (old system)
    if (event.content_blocks && event.content_blocks.length > 0) {
      event.content_blocks.forEach(block => {
        if (block.type === 'image' && block.media_url && block.media_url !== event.cover_image_url) {
          images.push({ src: block.media_url, caption: block.caption || null })
        }
      })
    }

    // Add images from rich HTML content
    if ((!event.content_blocks || event.content_blocks.length === 0) && event.description) {
      const parser = new DOMParser()
      const doc = parser.parseFromString(event.description, 'text/html')
      const imgElements = doc.querySelectorAll('img')
      imgElements.forEach(img => {
        if (img.src && img.src !== event.cover_image_url) {
          images.push({ src: img.src, caption: null })
        }
      })
    }

    return images
  }, [event, eventImages])

  // Parse headings from rich HTML content and generate sections
  const parsedContent = useMemo(() => {
    if (!event || !event.description) return { sections: [], html: '' }

    const parser = new DOMParser()
    const doc = parser.parseFromString(event.description, 'text/html')
    const headings = doc.querySelectorAll('h1, h2')

    const sections = []
    let currentSkip = null

    headings.forEach((heading, index) => {
      // Skip headings with empty or whitespace-only content
      const title = heading.textContent.trim()
      if (!title) return

      const anchor = `section-${index}`
      heading.id = anchor

      if (heading.tagName === 'H1') {
        currentSkip = {
          id: anchor,
          title: title,
          jumps: []
        }
        sections.push(currentSkip)
      } else if (heading.tagName === 'H2' && currentSkip) {
        currentSkip.jumps.push({
          id: anchor,
          title: title
        })
      }
    })

    // Serialize the modified document back to HTML
    const html = doc.body.innerHTML

    return { sections, html }
  }, [event])

  // Update sections when content is parsed
  useEffect(() => {
    setSections(parsedContent.sections)
  }, [parsedContent])

  // Intersection Observer to track active section
  useEffect(() => {
    if (!parsedContent.sections || parsedContent.sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
      }
    )

    // Observe all heading elements
    const allSectionIds = []
    parsedContent.sections.forEach(skip => {
      allSectionIds.push(skip.id)
      skip.jumps.forEach(jump => {
        allSectionIds.push(jump.id)
      })
    })

    // Wait for DOM to be ready
    setTimeout(() => {
      allSectionIds.forEach(id => {
        const element = document.getElementById(id)
        if (element) observer.observe(element)
      })
    }, 100)

    return () => observer.disconnect()
  }, [parsedContent])

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  if (!event) {
    return <div className={styles.notFound}>Event not found</div>
  }

  return (
    <div className={styles.container}>
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
            {isAuthor && (
              <div className={styles.authorButtons}>
                <button
                  className={styles.editButton}
                  onClick={() => navigate(`/event/${id}/edit`)}
                >
                  ✎ Edit
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={handleDelete}
                >
                  🗑 Delete
                </button>
              </div>
            )}
          </div>
          <div className={styles.meta}>
            <Link to={`/profile/${event.author_username}`} className={styles.author}>
              <div className={styles.avatar}></div>
              <span className={styles.authorDesktop}>{event.author_full_name || event.author_username}</span>
              <span className={styles.authorMobile}>@{event.author_username}</span>
            </Link>
            <span>·</span>
            <span className={styles.dateDesktop}>{formatDateRange(event.start_date, event.end_date)}</span>
            <span className={styles.dateMobile}>{formatDateRange(event.start_date, event.end_date, true)}</span>
            <span>·</span>
            <ShortLocation locationName={event.location_name} maxWords={3} />
          </div>
        </div>
      </div>

      <div className={styles.pageLayout}>
        {sections.length > 0 && (
          <EventNavigation
            sections={sections}
            activeSection={activeSection}
            imageCount={allImages.length}
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
        {event.content_blocks && event.content_blocks.map((block, index) => {
          if (block.type === 'text') {
            return (
              <p key={index} className={styles.text}>
                {block.content}
              </p>
            )
          }
          if (block.type === 'image') {
            return (
              <div key={index} className={styles.imageBlock}>
                <div
                  className={styles.image}
                  style={{ backgroundImage: `url(${block.media_url})` }}
                ></div>
                {block.caption && (
                  <div className={styles.caption}>{block.caption}</div>
                )}
              </div>
            )
          }
          return null
        })}

        {(!event.content_blocks || event.content_blocks.length === 0) && (
          <div
            className={styles.richContent}
            dangerouslySetInnerHTML={{ __html: parsedContent.html || event.description }}
          />
        )}
      </div>

      {/* Journey Map */}
      {locations.length > 0 && (
        <div className={styles.mapSection} ref={mapRef}>
          <div className={styles.mapContainer}>
            <div className={styles.mapFadeOverlay}></div>
            <EventMap locations={locations} />
            <div className={styles.mapTitleOverlay}>
              <h2 className={styles.mapTitle}>Journey Map</h2>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Button */}
      {allImages.length > 0 && (
        <button className={styles.galleryButton} onClick={handleGalleryClick}>
          {galleryViewMode === 'grid'
            ? 'Hide Grid'
            : `📷 View all ${allImages.length} ${allImages.length === 1 ? 'image' : 'images'}`
          }
        </button>
      )}

      {/* Image Gallery */}
      {allImages.length > 0 && (
        <div className={styles.gallerySection}>
          <ImageGallery
            images={allImages}
            viewMode={galleryViewMode}
            onViewModeChange={setGalleryViewMode}
          />
        </div>
      )}

      <div className={styles.interactions}>
        <div className={styles.likeSection}>
          <button
            className={`${styles.likeButton} ${likeStats.is_liked ? styles.liked : ''}`}
            onClick={handleLikeToggle}
            disabled={!user}
          >
            <span className={styles.heartIcon}>{likeStats.is_liked ? '♥' : '♡'}</span>
            <span>{likeStats.like_count} {likeStats.like_count === 1 ? 'like' : 'likes'}</span>
          </button>

          {likeStats.like_count > 0 && (
            <div className={styles.likesPreview}>
              <span>
                Liked by{' '}
                {likeStats.recent_likes.slice(0, 3).map((like, index) => (
                  <span key={like.id}>
                    {index > 0 && ', '}
                    <Link to={`/profile/${like.username}`} className={styles.likerLink}>
                      {like.full_name || like.username}
                    </Link>
                  </span>
                ))}
                {likeStats.like_count > 3 && (
                  <span>
                    {' '}and{' '}
                    <button onClick={handleShowAllLikes} className={styles.showMoreLink}>
                      {likeStats.like_count - 3} others
                    </button>
                  </span>
                )}
              </span>
            </div>
          )}

          {showAllLikes && (
            <div className={styles.likesModal}>
              <div className={styles.likesModalContent}>
                <div className={styles.likesModalHeader}>
                  <h3>Likes</h3>
                  <button onClick={() => setShowAllLikes(false)} className={styles.closeButton}>×</button>
                </div>
                <div className={styles.likesList}>
                  {allLikes.map(like => (
                    <Link
                      key={like.id}
                      to={`/profile/${like.username}`}
                      className={styles.likeItem}
                      onClick={() => setShowAllLikes(false)}
                    >
                      <div className={styles.likeAvatar}>
                        {(like.full_name || like.username).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.likeName}>{like.full_name || like.username}</div>
                        <div className={styles.likeUsername}>@{like.username}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.commentsSection}>
        <h3 className={styles.commentsTitle}>Comments ({comments.length})</h3>

        {user ? (
          <form className={styles.commentForm} onSubmit={handleCommentSubmit}>
            <textarea
              className={styles.commentInput}
              placeholder="Share your thoughts..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            <button
              type="submit"
              className={styles.commentSubmit}
              disabled={!newComment.trim() || commentLoading}
            >
              {commentLoading ? 'Posting...' : 'Post Comment'}
            </button>
          </form>
        ) : (
          <div className={styles.loginPrompt}>
            <Link to="/login">Log in</Link> to leave a comment
          </div>
        )}

        <div className={styles.commentsList}>
          {comments.length === 0 ? (
            <p className={styles.noComments}>No comments yet. Be the first to share your thoughts!</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className={styles.comment}>
                <Link to={`/profile/${comment.author_username}`} className={styles.commentAvatar}>
                  {(comment.author_full_name || comment.author_username).charAt(0).toUpperCase()}
                </Link>
                <div className={styles.commentContent}>
                  <div className={styles.commentHeader}>
                    <Link to={`/profile/${comment.author_username}`} className={styles.commentAuthor}>
                      {comment.author_full_name || comment.author_username}
                    </Link>
                    <span className={styles.commentDate}>{formatCommentDate(comment.created_at)}</span>
                  </div>
                  <p className={styles.commentText}>{comment.content}</p>
                  {user && (user.id === comment.author_id || user.id === event.author_id) && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className={styles.deleteComment}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
        </div>
      </div>

      {/* Login Prompt Modal */}
      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        action={loginPromptAction}
      />
    </div>
  )
}

export default EventDetail