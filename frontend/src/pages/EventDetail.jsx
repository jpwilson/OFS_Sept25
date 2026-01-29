import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmModal'
import LoginPromptModal from '../components/LoginPromptModal'
import UpgradeModal from '../components/UpgradeModal'
import ShareEventModal from '../components/ShareEventModal'
import ImageGallery from '../components/ImageGallery'
import EventNavigation from '../components/EventNavigation'
import EventMap from '../components/EventMap'
import ShortLocation from '../components/ShortLocation'
import TagBadge from '../components/TagBadge'
import ShareSignUpBanner from '../components/ShareSignUpBanner'
import styles from './EventDetail.module.css'
import apiService from '../services/api'
import { mockEventDetails } from '../data/mockEvents'
import { extractLocationImageMappings } from '../utils/locationExtractor'

function EventDetail({ isShareMode = false }) {
  const { id, token } = useParams()
  const navigate = useNavigate()
  const { user, isTrialExpired, canAccessContent, isExpired } = useAuth()
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [privacyError, setPrivacyError] = useState(null)
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
  const [lightboxState, setLightboxState] = useState({ open: false, index: 0 })
  const [showShareModal, setShowShareModal] = useState(false)
  const [hideInlineMedia, setHideInlineMedia] = useState(false)
  const [showFloatingTOC, setShowFloatingTOC] = useState(false)
  const [eventTags, setEventTags] = useState([])
  const [shareContext, setShareContext] = useState(null)
  const [showSignUpBanner, setShowSignUpBanner] = useState(isShareMode)
  const [mediaStats, setMediaStats] = useState({}) // { mediaId: { like_count, comment_count, is_liked, user_reaction } }
  const contentRef = useRef(null)
  const mapRef = useRef(null)
  const likesSectionRef = useRef(null)
  const commentsSectionRef = useRef(null)

  // Hide/show inline media (images, videos, and their captions) in content
  useEffect(() => {
    if (!contentRef.current || !event) return

    const images = contentRef.current.querySelectorAll('img')
    const videos = contentRef.current.querySelectorAll('video')
    const imageCaptions = contentRef.current.querySelectorAll('.image-caption')
    const videoCaptions = contentRef.current.querySelectorAll('.video-caption')

    images.forEach(img => {
      img.style.display = hideInlineMedia ? 'none' : ''
    })

    videos.forEach(video => {
      video.style.display = hideInlineMedia ? 'none' : ''
    })

    imageCaptions.forEach(caption => {
      caption.style.display = hideInlineMedia ? 'none' : ''
    })

    videoCaptions.forEach(caption => {
      caption.style.display = hideInlineMedia ? 'none' : ''
    })
  }, [hideInlineMedia, event])

  // Reset toggle when event changes
  useEffect(() => {
    setHideInlineMedia(false)
  }, [id])

  // Track scroll position for floating TOC button
  useEffect(() => {
    const handleScroll = () => {
      // Show button after scrolling 300px down
      setShowFloatingTOC(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // In share mode, author features are disabled
  const isAuthor = !isShareMode && user && event && user.username === event.author_username
  const isEditingBlocked = isAuthor && !canAccessContent && (isExpired || isTrialExpired)

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

  // Handle image/video click - simple function without useCallback to avoid circular deps
  function handleImageClick(mediaUrl) {
    // Find the media index in allMedia
    const mediaIndex = allMedia.findIndex(item => {
      const itemSrc = typeof item === 'string' ? item : (item.src || item.url)
      return itemSrc === mediaUrl
    })

    if (mediaIndex !== -1) {
      setLightboxState({ open: true, index: mediaIndex })
    }
  }

  // Make rich HTML images/videos clickable and add engagement overlays
  useEffect(() => {
    if (!contentRef.current) return

    const handleClick = (e) => {
      // Check if click was on an img element or video
      if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
        e.preventDefault()
        handleImageClick(e.target.src)
      }
      // Don't intercept clicks on overlay buttons
    }

    const content = contentRef.current
    content.addEventListener('click', handleClick)

    // Add cursor pointer style and engagement overlays to all images/videos
    const mediaElements = content.querySelectorAll('img, video')

    // Helper to normalize URLs for comparison
    const normalizeUrl = (url) => {
      if (!url) return ''
      return url.replace('/full/', '/').replace('/medium/', '/').replace('/thumbnails/', '/')
    }

    mediaElements.forEach(element => {
      element.style.cursor = 'pointer'

      // Find matching eventImage to get the media ID
      const elementSrc = element.src || element.getAttribute('src')
      const normalizedSrc = normalizeUrl(elementSrc)
      const matchingMedia = eventImages?.find(ei => normalizeUrl(ei.image_url) === normalizedSrc)

      if (matchingMedia?.id) {
        const mediaId = matchingMedia.id
        const stats = mediaStats[mediaId]

        // Wrap in container if not already wrapped
        if (!element.parentElement?.classList?.contains('media-engagement-wrapper')) {
          const wrapper = document.createElement('div')
          wrapper.className = 'media-engagement-wrapper'
          wrapper.style.cssText = 'position: relative; display: inline-block;'
          element.parentNode.insertBefore(wrapper, element)
          wrapper.appendChild(element)

          // Add overlay
          const overlay = document.createElement('div')
          overlay.className = 'media-engagement-overlay'
          overlay.style.cssText = `
            position: absolute;
            bottom: 8px;
            right: 8px;
            display: flex;
            gap: 8px;
            background: rgba(0, 0, 0, 0.7);
            padding: 6px 10px;
            border-radius: 16px;
            font-size: 13px;
            color: white;
            backdrop-filter: blur(4px);
            z-index: 2;
            pointer-events: none;
          `

          // Reactions count
          if (stats?.like_count > 0 || stats?.comment_count > 0) {
            if (stats?.like_count > 0) {
              const reactionSpan = document.createElement('span')
              reactionSpan.style.cssText = 'display: flex; align-items: center; gap: 4px;'
              // Show the most common reaction or default heart
              let emoji = '❤️'
              if (stats?.reaction_counts && Object.keys(stats.reaction_counts).length > 0) {
                const topReaction = Object.entries(stats.reaction_counts).sort((a, b) => b[1] - a[1])[0][0]
                const emojiMap = { heart: '❤️', laugh: '😂', sad: '😢', wow: '😮', love: '😍', clap: '👏', fire: '🔥', hundred: '💯', hug: '🤗', smile: '😊' }
                emoji = emojiMap[topReaction] || '❤️'
              }
              reactionSpan.innerHTML = `<span style="font-size: 14px;">${emoji}</span><span style="font-weight: 600;">${stats.like_count}</span>`
              overlay.appendChild(reactionSpan)
            }

            if (stats?.comment_count > 0) {
              const commentSpan = document.createElement('span')
              commentSpan.style.cssText = 'display: flex; align-items: center; gap: 4px;'
              commentSpan.innerHTML = `<span style="font-size: 14px;">💬</span><span style="font-weight: 600;">${stats.comment_count}</span>`
              overlay.appendChild(commentSpan)
            }

            wrapper.appendChild(overlay)
          }
        } else {
          // Update existing overlay
          const wrapper = element.parentElement
          let overlay = wrapper.querySelector('.media-engagement-overlay')

          if (stats?.like_count > 0 || stats?.comment_count > 0) {
            if (!overlay) {
              overlay = document.createElement('div')
              overlay.className = 'media-engagement-overlay'
              overlay.style.cssText = `
                position: absolute;
                bottom: 8px;
                right: 8px;
                display: flex;
                gap: 8px;
                background: rgba(0, 0, 0, 0.7);
                padding: 6px 10px;
                border-radius: 16px;
                font-size: 13px;
                color: white;
                backdrop-filter: blur(4px);
                z-index: 2;
                pointer-events: none;
              `
              wrapper.appendChild(overlay)
            }

            overlay.innerHTML = ''
            if (stats?.like_count > 0) {
              let emoji = '❤️'
              if (stats?.reaction_counts && Object.keys(stats.reaction_counts).length > 0) {
                const topReaction = Object.entries(stats.reaction_counts).sort((a, b) => b[1] - a[1])[0][0]
                const emojiMap = { heart: '❤️', laugh: '😂', sad: '😢', wow: '😮', love: '😍', clap: '👏', fire: '🔥', hundred: '💯', hug: '🤗', smile: '😊' }
                emoji = emojiMap[topReaction] || '❤️'
              }
              overlay.innerHTML += `<span style="display: flex; align-items: center; gap: 4px;"><span style="font-size: 14px;">${emoji}</span><span style="font-weight: 600;">${stats.like_count}</span></span>`
            }
            if (stats?.comment_count > 0) {
              overlay.innerHTML += `<span style="display: flex; align-items: center; gap: 4px;"><span style="font-size: 14px;">💬</span><span style="font-weight: 600;">${stats.comment_count}</span></span>`
            }
          } else if (overlay) {
            overlay.remove()
          }
        }
      }
    })

    return () => {
      content.removeEventListener('click', handleClick)
    }
  }, [event, eventImages, mediaStats]) // Re-run when event, images, or stats change

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
    if (isShareMode && token) {
      loadSharedEvent()
    } else if (id) {
      loadEvent()
    }
  }, [id, token, isShareMode])

  // Load comments, likes, tags, and locations AFTER event is loaded
  // These endpoints require numeric event ID, not the slug
  useEffect(() => {
    if (event && !isShareMode) {
      const eventId = event.id  // Use numeric ID from loaded event
      loadComments(eventId)
      loadTags(eventId)
      loadLocations(eventId)
      if (user) {
        loadLikes(eventId)
      }
    } else if (event && isShareMode) {
      // In share mode, use locations from the API response (same as regular mode)
      const eventLocations = event.locations || []

      // Extract image mappings from the event description HTML
      const imageMappings = extractLocationImageMappings(event.description || '')

      // Enrich locations with associated images from the HTML content
      const enrichedLocations = eventLocations.map(loc => {
        if (loc.associated_image_url) return loc
        const key = `${parseFloat(loc.latitude).toFixed(6)},${parseFloat(loc.longitude).toFixed(6)}`
        const imageUrl = imageMappings.get(key)
        return imageUrl ? { ...loc, associated_image_url: imageUrl } : loc
      })

      // Add primary event location at the beginning (same as loadLocations does)
      if (event.latitude && event.longitude) {
        const primaryLocation = {
          id: 'primary',
          event_id: event.id,
          location_name: event.location_name || 'Event Location',
          latitude: event.latitude,
          longitude: event.longitude,
          location_type: 'primary',
          order_index: -1,
          timestamp: event.start_date,
          section_id: null,
          section_title: 'Event Start'
        }
        setLocations([primaryLocation, ...enrichedLocations])
      } else {
        setLocations(enrichedLocations)
      }
    }
  }, [event, isShareMode])

  // Load media stats for all eventImages (reactions/comments per media)
  useEffect(() => {
    async function loadMediaStats() {
      if (!eventImages || eventImages.length === 0) return

      const mediaIds = eventImages.filter(img => img.id).map(img => img.id)
      if (mediaIds.length === 0) return

      try {
        const stats = await apiService.getBatchMediaStats(mediaIds)
        const statsMap = {}
        stats.forEach(stat => {
          statsMap[stat.media_id] = {
            like_count: stat.like_count,
            comment_count: stat.comment_count,
            is_liked: stat.is_liked,
            user_reaction: stat.user_reaction,
            reaction_counts: stat.reaction_counts
          }
        })
        setMediaStats(statsMap)
      } catch (error) {
        console.error('Failed to load media stats:', error)
      }
    }

    loadMediaStats()
  }, [eventImages])

  async function loadTags(eventId) {
    try {
      const tags = await apiService.getEventTags(eventId)
      setEventTags(tags || [])
    } catch (error) {
      console.error('Error loading event tags:', error)
    }
  }

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
      await apiService.deleteEvent(event.id)
      showToast('Event moved to trash', 'success')
      navigate('/profile/' + user.username, { state: { activeTab: 'trash' } })
    } catch (error) {
      console.error('Error deleting event:', error)
      showToast('Failed to delete event', 'error')
    }
  }

  async function handlePublish() {
    const confirmed = await confirm({
      title: 'Publish Event',
      message: 'Make this event visible to your followers?',
      confirmText: 'Publish',
      cancelText: 'Cancel',
      danger: false
    })

    if (!confirmed) return

    try {
      await apiService.publishEvent(event.id)
      showToast('Event published successfully', 'success')
      // Reload event to update status
      await loadEvent()
    } catch (error) {
      console.error('Error publishing event:', error)
      showToast(error.message || 'Failed to publish event', 'error')
    }
  }

  async function handleUnpublish() {
    const confirmed = await confirm({
      title: 'Move to Drafts',
      message: 'Hide this event from followers? Comments and likes will be preserved.',
      confirmText: 'Move to Drafts',
      cancelText: 'Cancel',
      danger: false
    })

    if (!confirmed) return

    try {
      await apiService.unpublishEvent(event.id)
      showToast('Event moved to drafts', 'success')
      // Reload event to update status
      await loadEvent()
    } catch (error) {
      console.error('Error unpublishing event:', error)
      showToast('Failed to move event to drafts', 'error')
    }
  }

  async function loadEvent() {
    try {
      const data = await apiService.getEvent(id)
      if (!data) {
        // Event not found - don't replace with mock data
        setLoading(false)
        return
      }
      setEvent(data)
      // Load event_images from the event response (consolidated API call)
      setEventImages(data.event_images || [])
      setPrivacyError(null)
      setLoading(false)
    } catch (error) {
      // Check if it's a privacy/permission error (403) - this is expected behavior
      if (error.response?.status === 403 && error.response?.data?.detail) {
        setPrivacyError(error.response.data.detail)
      } else {
        // Only log unexpected errors
        console.error('Error loading event:', error)
      }
      setLoading(false)
    }
  }

  async function loadSharedEvent() {
    try {
      const data = await apiService.viewSharedEvent(token)
      if (!data || !data.event) {
        setLoading(false)
        return
      }
      setEvent(data.event)
      setEventImages(data.event.event_images || [])
      setShareContext(data.share_context)
      setPrivacyError(null)
      setLoading(false)

      // Load comments and tags for shared event
      try {
        const commentsData = await apiService.getComments(data.event.id)
        setComments(commentsData || [])
      } catch (e) {
        console.log('Could not load comments for shared event')
        setComments([])
      }

      // Load tags
      try {
        loadTags(data.event.id)
      } catch (e) {
        console.log('Could not load tags for shared event')
      }
    } catch (error) {
      console.error('Error loading shared event:', error)
      // Handle specific share link errors
      if (error.message === 'expired' || error.message === 'not_found') {
        setPrivacyError({
          message: 'This share link is no longer valid or has expired',
          share_expired: true
        })
      } else {
        setPrivacyError({
          message: 'Unable to load shared event. Please try again.',
          share_expired: true
        })
      }
      setLoading(false)
    }
  }

  async function loadLocations(eventId) {
    try {
      const data = await apiService.getEventLocations(eventId)
      const eventLocations = data || []

      // Extract image mappings from the event description HTML
      // This finds the first image after each location marker in the content
      const imageMappings = extractLocationImageMappings(event?.description || '')

      // Enrich locations with associated images from the HTML content
      const enrichedLocations = eventLocations.map(loc => {
        // If location already has an associated image, use it
        if (loc.associated_image_url) return loc

        // Try to find an image for this location from the HTML content
        const key = `${parseFloat(loc.latitude).toFixed(6)},${parseFloat(loc.longitude).toFixed(6)}`
        const imageUrl = imageMappings.get(key)

        return imageUrl ? { ...loc, associated_image_url: imageUrl } : loc
      })

      // Add primary event location as the first location (if coordinates exist)
      // This is the location from the "Location" field in the event form
      // Show map even for single-location events - only hide if NO coordinates at all
      if (event?.latitude && event?.longitude) {
        const primaryLocation = {
          id: 'primary',
          event_id: event.id,
          location_name: event.location_name || 'Event Location',
          latitude: event.latitude,
          longitude: event.longitude,
          location_type: 'primary',
          order_index: -1, // First location
          timestamp: event.start_date,
          section_id: null,
          section_title: 'Event Start'
        }
        setLocations([primaryLocation, ...enrichedLocations])
      } else {
        setLocations(enrichedLocations)
      }
    } catch (error) {
      console.error('Error loading locations:', error)
      setLocations([])
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

  async function loadComments(eventId) {
    const data = await apiService.getComments(eventId)
    setComments(data)
  }

  async function loadLikes(eventId) {
    const data = await apiService.getLikes(eventId)
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
        await apiService.unlikeEvent(event.id)
        showToast('Unliked event', 'success')
      } else {
        await apiService.likeEvent(event.id)
        showToast('Liked event', 'success')
      }
      loadLikes(event.id)
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
      await apiService.createComment(event.id, newComment.trim())
      setNewComment('')
      loadComments(event.id)
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
      await apiService.deleteComment(event.id, commentId)
      loadComments(event.id)
      showToast('Comment deleted', 'success')
    } catch (error) {
      console.error('Error deleting comment:', error)
      showToast('Failed to delete comment', 'error')
    }
  }

  async function handleShowAllLikes() {
    if (!showAllLikes) {
      const data = await apiService.getAllLikes(event.id)
      setAllLikes(data)
    }
    setShowAllLikes(!showAllLikes)
  }

  function scrollToLikes() {
    if (likesSectionRef.current) {
      const offset = 80
      const elementPosition = likesSectionRef.current.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
    }
  }

  function scrollToComments() {
    if (commentsSectionRef.current) {
      const offset = 80
      const elementPosition = commentsSectionRef.current.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
    }
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

  // Extract all media (images and videos) from the event for the gallery, in document order
  const allMedia = useMemo(() => {
    if (!event) return []

    const media = []
    const mediaUrls = new Set() // Track unique media URLs to avoid duplicates

    // Helper to normalize URLs for comparison (handle /full/, /medium/, /thumbnails/ variations)
    const normalizeUrl = (url) => {
      if (!url) return ''
      return url.replace('/full/', '/').replace('/medium/', '/').replace('/thumbnails/', '/')
    }

    // Helper to add media if not duplicate, or update caption if already exists
    const addMedia = (src, type = 'image', caption = null, id = null, alt = null, duration = null) => {
      const normalizedUrl = normalizeUrl(src)
      if (!mediaUrls.has(normalizedUrl)) {
        mediaUrls.add(normalizedUrl)
        media.push({ src, type, caption, id, alt, duration })
      } else if (caption || id) {
        // Update caption/metadata for existing item if we now have it
        // This handles the case where image was added from HTML first (no caption)
        // then we try to add from eventImages (has caption) - don't skip, update instead
        const existing = media.find(m => normalizeUrl(m.src) === normalizedUrl)
        if (existing) {
          if (caption && !existing.caption) existing.caption = caption
          if (id && !existing.id) existing.id = id
          if (alt && !existing.alt) existing.alt = alt
          if (duration && !existing.duration) existing.duration = duration
        }
      }
    }

    // 1. ALWAYS include cover image first if it exists
    if (event.cover_image_url) {
      addMedia(event.cover_image_url, 'image', null)
    }

    // 2. Parse rich HTML content to extract media in document order
    // This ensures videos appear in the correct position alongside images
    if (event.description) {
      const parser = new DOMParser()
      const doc = parser.parseFromString(event.description, 'text/html')

      // Get all media elements (img and video) in document order
      const mediaElements = doc.querySelectorAll('img, video')
      mediaElements.forEach(element => {
        const src = element.src || element.getAttribute('src')
        if (!src) return

        const isVideo = element.tagName === 'VIDEO'
        const type = isVideo ? 'video' : 'image'

        // Try to find matching caption/metadata from eventImages
        const matchingMedia = eventImages?.find(ei => {
          const eiUrl = normalizeUrl(ei.image_url)
          const srcUrl = normalizeUrl(src)
          return eiUrl === srcUrl
        })

        addMedia(
          src,
          type,
          matchingMedia?.caption || null,
          matchingMedia?.id,
          matchingMedia?.alt_text,
          matchingMedia?.duration_seconds
        )
      })
    }

    // 3. Add any images/videos from event_images table that weren't in the HTML
    // This catches media that might have been added but not yet rendered
    if (eventImages && eventImages.length > 0) {
      eventImages.forEach(item => {
        const type = item.media_type === 'video' ? 'video' : 'image'
        addMedia(
          item.image_url,
          type,
          item.caption,
          item.id,
          item.alt_text,
          item.duration_seconds
        )
      })
    }

    // 4. Add images from content blocks (old system - backwards compatibility)
    if (event.content_blocks && event.content_blocks.length > 0) {
      event.content_blocks.forEach(block => {
        if (block.type === 'image' && block.media_url) {
          addMedia(block.media_url, 'image', block.caption || null)
        }
      })
    }

    return media
  }, [event, eventImages])

  // Backwards compatibility: allImages contains only images
  const allImages = useMemo(() => {
    return allMedia.filter(m => m.type === 'image')
  }, [allMedia])

  // Get all videos from event_images and HTML content
  const allVideos = useMemo(() => {
    if (!event) return []

    const videos = []
    const videoUrls = new Set()

    const addVideo = (src, caption = null, id = null, duration = null) => {
      if (!videoUrls.has(src)) {
        videoUrls.add(src)
        videos.push({ src, caption, id, duration, type: 'video' })
      }
    }

    // Add videos from event_images table
    if (eventImages && eventImages.length > 0) {
      eventImages.forEach(img => {
        if (img.media_type === 'video') {
          addVideo(img.image_url, img.caption, img.id, img.duration_seconds)
        }
      })
    }

    // Parse rich HTML content for video elements
    if (event.description) {
      const parser = new DOMParser()
      const doc = parser.parseFromString(event.description, 'text/html')
      const videoElements = doc.querySelectorAll('video')
      videoElements.forEach(video => {
        if (video.src) {
          // Try to find matching caption from eventImages
          const matchingVideo = eventImages?.find(ei =>
            ei.media_type === 'video' && (video.src.includes(ei.image_url) || ei.image_url.includes(video.src))
          )
          addVideo(video.src, matchingVideo?.caption || null, matchingVideo?.id, matchingVideo?.duration_seconds)
        }
      })
    }

    return videos
  }, [event, eventImages])

  // Calculate word count and estimated read time
  const readStats = useMemo(() => {
    if (!event || !event.description) return { wordCount: 0, readTime: 0 }

    // Strip HTML tags and get plain text
    const parser = new DOMParser()
    const doc = parser.parseFromString(event.description, 'text/html')
    const text = doc.body.textContent || ''

    // Count words (split by whitespace, filter empty)
    const words = text.split(/\s+/).filter(word => word.length > 0)
    const wordCount = words.length

    // Average reading speed: 200-250 words per minute
    // Using 200 wpm for a comfortable pace
    const readTime = Math.max(1, Math.ceil(wordCount / 200))

    return { wordCount, readTime }
  }, [event])

  // Parse headings from rich HTML content and generate sections
  // Also inject captions under images
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

    // Inject captions under images AND videos (must be done here, not in useEffect,
    // because React will overwrite DOM changes made after render)
    if (eventImages && eventImages.length > 0) {
      const normalizeUrl = (url) => {
        if (!url) return ''
        return url.replace('/full/', '/').replace('/medium/', '/').replace('/thumbnails/', '/')
      }
      const getFilename = (url) => url?.split('/').pop()?.split('?')[0] || ''

      // Handle images
      const images = doc.querySelectorAll('img')
      images.forEach((img) => {
        const imgSrc = img.src || img.getAttribute('src') || ''
        const normalizedImgSrc = normalizeUrl(imgSrc)
        const imgFilename = getFilename(imgSrc)

        let matchingImage = eventImages.find(ei => normalizeUrl(ei.image_url) === normalizedImgSrc && ei.caption)
        if (!matchingImage) {
          matchingImage = eventImages.find(ei => getFilename(ei.image_url) === imgFilename && ei.caption)
        }

        if (matchingImage && matchingImage.caption) {
          const captionDiv = doc.createElement('div')
          captionDiv.className = 'image-caption'
          captionDiv.style.cssText = 'font-size: 0.85em; color: #aaa; font-weight: 500; text-align: center; margin-top: 2px; margin-bottom: 48px; line-height: 1.4;'
          captionDiv.textContent = matchingImage.caption
          img.parentNode.insertBefore(captionDiv, img.nextSibling)
        }
      })

      // Handle videos - same logic
      const videos = doc.querySelectorAll('video')
      videos.forEach((video) => {
        const videoSrc = video.src || video.getAttribute('src') || ''
        const normalizedVideoSrc = normalizeUrl(videoSrc)
        const videoFilename = getFilename(videoSrc)

        let matchingVideo = eventImages.find(ei => normalizeUrl(ei.image_url) === normalizedVideoSrc && ei.caption)
        if (!matchingVideo) {
          matchingVideo = eventImages.find(ei => getFilename(ei.image_url) === videoFilename && ei.caption)
        }

        if (matchingVideo && matchingVideo.caption) {
          const captionDiv = doc.createElement('div')
          captionDiv.className = 'video-caption'
          captionDiv.style.cssText = 'font-size: 0.85em; color: #aaa; font-weight: 500; text-align: center; margin-top: 2px; margin-bottom: 48px; line-height: 1.4;'
          captionDiv.textContent = matchingVideo.caption
          video.parentNode.insertBefore(captionDiv, video.nextSibling)
        }
      })
    }

    // Serialize the modified document back to HTML
    const html = doc.body.innerHTML

    return { sections, html }
  }, [event, eventImages])

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

  // Note: Trial expired check is now handled per-event by the backend
  // Expired trial users can still view events from people they follow

  if (privacyError) {
    // Check if this is a share link expired error
    if (privacyError.share_expired) {
      return (
        <div className={styles.privacyBlock}>
          <div className={styles.privacyIcon}>⏰</div>
          <h2>Share Link Expired</h2>
          <p className={styles.privacyDescription}>
            {privacyError.message || 'This share link is no longer valid.'}
          </p>
          <div className={styles.privacyActions}>
            <p className={styles.privacyExplainer}>
              Share links expire for privacy. Sign up or log in to request access from the event author.
            </p>
            <Link to="/login?signup=true" className={styles.primaryButton}>
              Sign Up Free
            </Link>
            <Link to="/login" className={styles.secondaryButton}>
              Already have an account? Sign In
            </Link>
          </div>
        </div>
      )
    }

    // Check if this is a subscription access error
    if (privacyError.subscription_required) {
      return (
        <div className={styles.privacyBlock}>
          <div className={styles.privacyIcon}>🔒</div>
          <h2>Premium Content</h2>
          <p className={styles.privacyDescription}>
            {privacyError.message}
          </p>

          <div className={styles.privacyActions}>
            <p className={styles.privacyExplainer}>
              This event is from <strong>@{privacyError.author_username}</strong>.
              Follow them to see their events.
            </p>
            <Link to={`/profile/${privacyError.author_username}`} className={styles.primaryButton}>
              Visit @{privacyError.author_username}'s Profile
            </Link>
            <Link to="/feed" className={styles.secondaryButton}>
              Back to Feed
            </Link>
          </div>
        </div>
      )
    }

    return (
      <div className={styles.privacyBlock}>
        <div className={styles.privacyIcon}>👋</div>
        <h2>Welcome to Our Family Socials!</h2>
        <p className={styles.privacyDescription}>
          This event is shared privately by{' '}
          <strong>{privacyError.author_full_name || privacyError.author_username}</strong>.
        </p>

        <div className={styles.privacyActions}>
          {privacyError.requires_auth ? (
            <>
              <p className={styles.privacyExplainer}>
                Join Our Family Socials to view this event and connect with friends and family.
                Once you create an account, you can request to follow{' '}
                <strong>@{privacyError.author_username}</strong>, who can then grant you access to their events.
              </p>
              <Link to="/login?signup=true" className={styles.primaryButton}>
                Sign Up Free
              </Link>
              <Link to="/login" className={styles.secondaryButton}>
                Already have an account? Sign In
              </Link>
            </>
          ) : privacyError.requires_follow ? (
            <>
              <p className={styles.privacyExplainer}>
                This event is only visible to followers of{' '}
                <strong>{privacyError.author_full_name || privacyError.author_username}</strong>.
                {privacyError.follow_request_pending ? (
                  <> Your request to follow them is pending their approval.</>
                ) : (
                  <> Visit their profile to request to follow them, and they can grant you access to view their events.</>
                )}
              </p>
              {privacyError.follow_request_pending ? (
                <div className={styles.requestPendingMessage}>
                  Your request to follow @{privacyError.author_username} has been sent
                </div>
              ) : (
                <Link to={`/profile/${privacyError.author_username}`} className={styles.requestFollowButton}>
                  Request to Follow @{privacyError.author_username}
                </Link>
              )}
              <Link to="/feed" className={styles.secondaryButton}>
                Back to Feed
              </Link>
            </>
          ) : (
            <>
              <p className={styles.privacyExplainer}>
                This is a private event. Only the author can view it.
              </p>
              <Link to="/feed" className={styles.primaryButton}>
                Back to Feed
              </Link>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!event) {
    return <div className={styles.notFound}>Event not found</div>
  }

  return (
    <div className={styles.container}>
      {/* Share mode banner for non-logged-in users */}
      {isShareMode && !user && showSignUpBanner && (
        <ShareSignUpBanner
          shareContext={shareContext}
          onClose={() => setShowSignUpBanner(false)}
        />
      )}

      <div
        className={`${styles.heroImage} ${isShareMode && !user && showSignUpBanner ? styles.withBanner : ''}`}
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
                  onClick={() => {
                    if (isEditingBlocked) {
                      confirm({ title: 'Pro Feature', message: 'You are no longer able to edit or create events. Upgrade to Pro to regain full access.', confirmText: 'Upgrade to Pro', cancelText: 'Close' }).then(ok => { if (ok) navigate('/billing') })
                    } else {
                      navigate(`/event/${id}/edit`)
                    }
                  }}
                >
                  ✎ Edit
                </button>
                <button
                  className={styles.shareButton}
                  onClick={() => setShowShareModal(true)}
                >
                  🔗 Share
                </button>
                {event.is_published ? (
                  <button
                    className={styles.unpublishButton}
                    onClick={() => {
                      if (isEditingBlocked) {
                        confirm({ title: 'Pro Feature', message: 'You are no longer able to edit or create events. Upgrade to Pro to regain full access.', confirmText: 'Upgrade to Pro', cancelText: 'Close' }).then(ok => { if (ok) navigate('/billing') })
                      } else {
                        handleUnpublish()
                      }
                    }}
                  >
                    📋 Move to Drafts
                  </button>
                ) : (
                  <button
                    className={styles.publishButton}
                    onClick={() => {
                      if (isEditingBlocked) {
                        confirm({ title: 'Pro Feature', message: 'You are no longer able to edit or create events. Upgrade to Pro to regain full access.', confirmText: 'Upgrade to Pro', cancelText: 'Close' }).then(ok => { if (ok) navigate('/billing') })
                      } else {
                        handlePublish()
                      }
                    }}
                  >
                    ✓ Publish
                  </button>
                )}
                <button
                  className={styles.deleteButton}
                  onClick={() => {
                    if (isEditingBlocked) {
                      confirm({ title: 'Pro Feature', message: 'You are no longer able to edit or create events. Upgrade to Pro to regain full access.', confirmText: 'Upgrade to Pro', cancelText: 'Close' }).then(ok => { if (ok) navigate('/billing') })
                    } else {
                      handleDelete()
                    }
                  }}
                >
                  🗑 Delete
                </button>
              </div>
            )}
          </div>
          <div className={styles.meta}>
            <Link to={`/profile/${event.author_username}`} className={styles.author}>
              <span className={styles.authorDesktop}>{event.author_full_name || event.author_username}</span>
              <span className={styles.authorMobile}>@{event.author_username}</span>
            </Link>
            <span>·</span>
            <span className={styles.dateDesktop}>{formatDateRange(event.start_date, event.end_date)}</span>
            <span className={styles.dateMobile}>{formatDateRange(event.start_date, event.end_date, true)}</span>
            <span>·</span>
            <ShortLocation locationName={event.location_name} maxWords={3} />
            {readStats.wordCount > 0 && (
              <span className={styles.readStats}>
                <span className={styles.readStatsDesktop}>
                  {readStats.wordCount.toLocaleString()} words · {readStats.readTime} min read
                </span>
                <span className={styles.readStatsMobile}>
                  {readStats.readTime} min
                </span>
              </span>
            )}
            <span className={styles.engagementStats}>
              <button
                className={styles.statButton}
                onClick={scrollToLikes}
                aria-label={`${likeStats.like_count} likes`}
              >
                <span className={styles.statIcon}>{likeStats.is_liked ? '♥' : '♡'}</span>
                <span>{likeStats.like_count}</span>
              </button>
              <button
                className={styles.statButton}
                onClick={scrollToComments}
                aria-label={`${comments.length} comments`}
              >
                <span className={styles.statIcon}>💬</span>
                <span>{comments.length}</span>
              </button>
            </span>
          </div>
          {(() => {
            // Author sees all tags (including pending), others see only accepted
            const visibleTags = isAuthor
              ? eventTags.filter(tag => tag.status !== 'rejected')
              : eventTags.filter(tag => tag.status === 'accepted')

            return visibleTags.length > 0 && (
              <div className={styles.taggedPeople}>
                <span className={styles.taggedLabel}>Tagged:</span>
                {visibleTags.map((tag) => (
                  <TagBadge key={tag.id} tag={tag} />
                ))}
              </div>
            )
          })()}
        </div>
      </div>

      <div className={styles.pageLayout}>
        {sections.length > 0 && (
          <EventNavigation
            sections={sections}
            activeSection={activeSection}
            mediaCount={allMedia.length}
            locationCount={locations.length}
            isMobile={isMobile}
            isOpen={isMobileNavOpen}
            onToggle={() => setIsMobileNavOpen(!isMobileNavOpen)}
            onGalleryClick={handleGalleryClick}
            onMapClick={handleMapClick}
            hideInlineMedia={hideInlineMedia}
            onToggleInlineMedia={() => setHideInlineMedia(!hideInlineMedia)}
            isShareMode={isShareMode && !user}
          />
        )}

        <div className={styles.mainContent} ref={contentRef}>
          {isMobile && sections.length > 0 && (
            <>
              <button
                className={styles.mobileMenuButton}
                onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              >
                ☰ Table of Contents
              </button>

              {/* Floating TOC button - appears when scrolling */}
              {showFloatingTOC && !isMobileNavOpen && (
                <button
                  className={styles.floatingTOCButton}
                  onClick={() => setIsMobileNavOpen(true)}
                  aria-label="Open Table of Contents"
                >
                  <span className={styles.floatingTOCIcon}>☰</span>
                </button>
              )}
            </>
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
                  style={{ backgroundImage: `url(${block.media_url})`, cursor: 'pointer' }}
                  onClick={() => handleImageClick(block.media_url)}
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
            <EventMap locations={locations} eventCoverImage={event?.cover_image_url} />
            <div className={styles.mapTitleOverlay}>
              <h2 className={styles.mapTitle}>Journey Map</h2>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Button */}
      {allMedia.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <button className={styles.galleryButton} onClick={handleGalleryClick}>
            {galleryViewMode === 'grid'
              ? 'Hide Grid'
              : `📷 View all ${allMedia.length} ${allMedia.length === 1 ? 'item' : 'items'}`
            }
          </button>
        </div>
      )}

      {/* Image & Video Gallery */}
      {allMedia.length > 0 && (
        <div className={styles.gallerySection}>
          <ImageGallery
            images={allMedia}
            viewMode={galleryViewMode}
            onViewModeChange={setGalleryViewMode}
            lightboxOpen={lightboxState.open}
            lightboxIndex={lightboxState.index}
            onLightboxChange={setLightboxState}
            enableEngagement={true}
            showCaptions={true}
          />
        </div>
      )}


      <div className={styles.interactions} ref={likesSectionRef}>
        <div className={styles.likeSection}>
          <button
            className={`${styles.likeButton} ${likeStats.is_liked ? styles.liked : ''} ${isShareMode ? styles.disabled : ''}`}
            onClick={isShareMode ? undefined : handleLikeToggle}
            disabled={!user || isShareMode}
            title={isShareMode ? 'Sign up to like events' : ''}
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

      <div className={styles.commentsSection} ref={commentsSectionRef}>
        <h3 className={styles.commentsTitle}>Comments ({comments.length})</h3>

        {isShareMode ? (
          <div className={styles.sharePrompt}>
            <p>Sign up to leave comments and reactions</p>
            <Link to="/login?signup=true" className={styles.sharePromptButton}>
              Create Free Account
            </Link>
          </div>
        ) : user ? (
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

      {/* Bottom CTA for shared event view */}
      {isShareMode && !user && (
        <div className={styles.shareBottomCta}>
          <a href="https://ourfamilysocials.com" className={styles.shareBottomLogo}>
            Our Family Socials
          </a>
          <p className={styles.shareBottomText}>
            Create and share your own family memories
          </p>
          <Link to="/login?signup=true" className={styles.shareBottomButton}>
            Sign Up Free
          </Link>
        </div>
      )}

      {/* Login Prompt Modal */}
      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        action={loginPromptAction}
      />

      {/* Share Event Modal */}
      <ShareEventModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        event={event}
      />
    </div>
  )
}

export default EventDetail