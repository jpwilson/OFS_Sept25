import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useCallback, useState, useEffect, useRef } from 'react'
import styles from './RichTextEditor.module.css'
import apiService from '../services/api'
import { useToast } from './Toast'
import { LocationMarker } from '../extensions/LocationMarker'
import { VideoNode } from '../extensions/VideoNode'
import LocationPicker from './LocationPicker'
import VideoTrimmer from './VideoTrimmer'
import ProgressRibbon from './ProgressRibbon'
import { getVideoMetadata } from '../utils/videoCompression'
import { CLOUDINARY_CONFIG, getCloudinaryVideoUrl, getCloudinaryThumbnail } from '../config/cloudinary'

// Upload limits per event
const MAX_IMAGES_PER_EVENT = 100
const MAX_VIDEOS_PER_EVENT = 10

function RichTextEditor({ content, onChange, placeholder = "Tell your story...", eventStartDate, eventEndDate, onGPSExtracted, gpsExtractionEnabled = false, onVideoTasksChange }) {
  const [isUploading, setIsUploading] = useState(false)
  const [imageUploadProgress, setImageUploadProgress] = useState({ current: 0, total: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadType, setUploadType] = useState('') // 'image' or 'video'
  const [showVideoTrimmer, setShowVideoTrimmer] = useState(false)
  const [selectedVideoFile, setSelectedVideoFile] = useState(null)
  const [videoTasks, setVideoTasks] = useState([]) // Track video upload/compression tasks
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const { showToast } = useToast()

  // Notify parent component about video task changes
  useEffect(() => {
    if (onVideoTasksChange) {
      onVideoTasksChange(videoTasks)
    }
  }, [videoTasks, onVideoTasksChange])

  // Warn user if they try to leave while videos are processing
  useEffect(() => {
    const hasActiveVideos = videoTasks.some(
      task => task.status === 'uploading' || task.status === 'compressing'
    )

    if (!hasActiveVideos) return

    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = 'Video is still compressing. Are you sure you want to leave? If you leave, upload will stop and your event will be saved to drafts.'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [videoTasks])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Image.extend({
        addNodeView() {
          return ({ node }) => {
            const wrapper = document.createElement('div')
            wrapper.classList.add('image-wrapper')

            const img = document.createElement('img')
            img.src = node.attrs.src
            img.alt = node.attrs.alt || ''
            img.style.maxWidth = '200px'
            img.style.width = 'auto'
            img.style.height = 'auto'
            img.style.display = 'block'
            img.style.borderRadius = '8px'
            img.style.margin = '16px 0'
            img.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
            img.style.cursor = 'pointer'

            wrapper.appendChild(img)

            return {
              dom: wrapper,
              contentDOM: null,
              update: (updatedNode) => {
                if (updatedNode.type.name !== 'image') return false
                img.src = updatedNode.attrs.src
                img.alt = updatedNode.attrs.alt || ''
                return true
              }
            }
          }
        }
      }).configure({
        inline: false,
        allowBase64: true
      }),
      VideoNode,
      Link.configure({
        openOnClick: false, // Don't open links while editing
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'editor-link'
        }
      }),
      Placeholder.configure({
        placeholder
      }),
      LocationMarker
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: styles.editor
      }
    }
  })

  // Keep a ref to the editor for async callbacks (like XHR)
  const editorRef = useRef(editor)
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Count existing media in editor content
  const countMedia = useCallback(() => {
    if (!editor) return { images: 0, videos: 0 }
    const html = editor.getHTML()
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    const images = tempDiv.querySelectorAll('img').length
    const videos = tempDiv.querySelectorAll('video').length
    return { images, videos }
  }, [editor])

  const uploadImage = useCallback(async (file) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error')
      return null
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Image must be smaller than 10MB', 'error')
      return null
    }

    try {
      const result = await apiService.uploadImage(file)

      // Extract GPS data if enabled and available
      if (gpsExtractionEnabled && onGPSExtracted && result.metadata?.gps) {
        const gpsData = result.metadata.gps
        const dateTaken = result.metadata.date_taken

        onGPSExtracted({
          latitude: gpsData.latitude,
          longitude: gpsData.longitude,
          timestamp: dateTaken,
          image_url: result.url
        })
      }

      return result.url
    } catch (error) {
      console.error('Error uploading image:', error)
      showToast('Failed to upload image. Please try again.', 'error')
      return null
    }
  }, [showToast, gpsExtractionEnabled, onGPSExtracted])

  const addImage = useCallback(async () => {
    if (!editor) return

    // Check image limit
    const { images } = countMedia()
    if (images >= MAX_IMAGES_PER_EVENT) {
      showToast(`Maximum ${MAX_IMAGES_PER_EVENT} images per event. Please remove some images first.`, 'error')
      return
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true  // Allow multi-select

    input.onchange = async (e) => {
      const files = Array.from(e.target.files)
      if (files.length === 0) return

      // Check if adding these would exceed limit
      const remainingSlots = MAX_IMAGES_PER_EVENT - images
      if (files.length > remainingSlots) {
        showToast(`Can only add ${remainingSlots} more images (limit: ${MAX_IMAGES_PER_EVENT})`, 'error')
        return
      }

      setIsUploading(true)
      setImageUploadProgress({ current: 0, total: files.length })
      const uploadedUrls = []

      for (let i = 0; i < files.length; i++) {
        setImageUploadProgress({ current: i + 1, total: files.length })
        const url = await uploadImage(files[i])
        if (url) {
          uploadedUrls.push(url)
        }
      }

      // Insert all images with line breaks between them
      if (uploadedUrls.length > 0) {
        let html = ''
        for (let i = 0; i < uploadedUrls.length; i++) {
          html += `<img src="${uploadedUrls[i]}">`
          if (i < uploadedUrls.length - 1) {
            html += '<p><br /></p>'
          }
        }
        // Add trailing paragraph so cursor has clear position for next insert
        editor.chain().focus().insertContent(html + '<p></p>').run()
        showToast(`${uploadedUrls.length} image${uploadedUrls.length > 1 ? 's' : ''} uploaded`, 'success')
      }

      setIsUploading(false)
      setImageUploadProgress({ current: 0, total: 0 })
    }

    input.click()
  }, [editor, uploadImage, showToast, countMedia])

  // Upload video to Cloudinary (handles compression automatically)
  const handleVideoUpload = useCallback(async (file, trimParams = null) => {
    // Check total videos limit
    const { videos } = countMedia()
    if (videos >= MAX_VIDEOS_PER_EVENT) {
      showToast(`Maximum ${MAX_VIDEOS_PER_EVENT} videos per event. Please remove some videos first.`, 'error')
      return
    }

    // Check file size limit (100MB for Cloudinary free tier unsigned uploads)
    const MAX_SIZE = CLOUDINARY_CONFIG.maxFileSize
    if (file.size > MAX_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
      const limitMB = (MAX_SIZE / (1024 * 1024)).toFixed(0)
      showToast(`Video is ${sizeMB}MB but limit is ${limitMB}MB. Please use a shorter or lower quality recording.`, 'error')
      return
    }

    // Check 2-video concurrent upload limit
    const activeVideos = videoTasks.filter(
      task => task.status === 'uploading' || task.status === 'compressing'
    )
    if (activeVideos.length >= 2) {
      showToast('Maximum of 2 videos can be uploaded at a time. Please wait for current uploads to complete.', 'error')
      return
    }

    // Create task ID
    const taskId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Add task to list
    const newTask = {
      id: taskId,
      filename: file.name,
      status: 'uploading',
      progress: 0,
      thumbnailUrl: null,
      videoUrl: null,
      error: null,
    }

    setVideoTasks(prev => [...prev, newTask])

    // Helper function to update task
    function updateTask(id, updates) {
      setVideoTasks(prev =>
        prev.map(task => (task.id === id ? { ...task, ...updates } : task))
      )
    }

    try {
      // Upload directly to Cloudinary using unsigned upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset)
      formData.append('folder', CLOUDINARY_CONFIG.folder)
      formData.append('resource_type', 'video')

      // Add eager transformation for video trimming if trim parameters are provided
      if (trimParams) {
        const { startTime, endTime } = trimParams
        // Cloudinary eager transformation for trimming
        // Format: start_offset (so) and end_offset (eo) in seconds
        const transformation = `so_${startTime},eo_${endTime}`

        // Apply aggressive compression + trimming
        const eagerTransform = `${transformation},q_auto:low,w_1280,h_720,c_limit,br_1m,fps_30,vc_h264,f_auto`

        formData.append('eager', eagerTransform)
        formData.append('eager_async', 'false') // Wait for transformation to complete
      }

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          updateTask(taskId, { progress })
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          const { public_id, eager } = response

          // If eager transformation was applied (trimming), use the trimmed version
          // Otherwise, generate optimized video URL
          let videoUrl
          if (eager && eager.length > 0 && eager[0].secure_url) {
            // Use the trimmed + compressed version from eager transformation
            videoUrl = eager[0].secure_url
          } else {
            // Generate optimized video URL with auto quality and format
            videoUrl = getCloudinaryVideoUrl(public_id)
          }

          // Generate thumbnail URL (frame at 1 second)
          const thumbnailUrl = getCloudinaryThumbnail(public_id)

          updateTask(taskId, {
            status: 'complete',
            progress: 100,
            videoUrl,
            thumbnailUrl,
          })

          // Insert video into editor with trailing paragraph for cursor position
          // Use editorRef to get current editor (avoids stale closure in async callback)
          const currentEditor = editorRef.current
          if (currentEditor && !currentEditor.isDestroyed) {
            currentEditor.chain().focus().insertContent([
              { type: 'video', attrs: { src: videoUrl } },
              { type: 'paragraph' }
            ]).run()
            showToast('Video uploaded successfully!', 'success')
          } else {
            console.error('Editor not available when trying to insert video')
            showToast('Video uploaded but editor unavailable. Please try again.', 'error')
          }
        } else {
          throw new Error(`Upload failed with status ${xhr.status}`)
        }
      })

      xhr.addEventListener('error', () => {
        throw new Error('Network error during upload')
      })

      // Upload to Cloudinary
      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/video/upload`
      xhr.open('POST', uploadUrl)
      xhr.send(formData)

    } catch (error) {
      console.error('Video upload failed:', error)
      updateTask(taskId, {
        status: 'failed',
        error: error.message,
      })
      showToast(`Failed to upload video: ${error.message}`, 'error')
    }
  }, [editor, showToast, videoTasks, countMedia])

  const handleTrimComplete = useCallback(async (trimData) => {
    setShowVideoTrimmer(false)
    setSelectedVideoFile(null)
    // trimData = { originalFile, startTime, endTime, duration }
    await handleVideoUpload(trimData.originalFile, {
      startTime: trimData.startTime,
      endTime: trimData.endTime,
      duration: trimData.duration
    })
  }, [handleVideoUpload])

  const addVideo = useCallback(async () => {
    if (!editor) return

    // Check video limit
    const { videos } = countMedia()
    if (videos >= MAX_VIDEOS_PER_EVENT) {
      showToast(`Maximum ${MAX_VIDEOS_PER_EVENT} videos per event. Please remove some videos first.`, 'error')
      return
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'video/*'
    input.multiple = true  // Allow multi-select

    input.onchange = async (e) => {
      const files = Array.from(e.target.files)
      if (files.length === 0) return

      // Check if adding these would exceed limit
      const remainingSlots = MAX_VIDEOS_PER_EVENT - videos
      if (files.length > remainingSlots) {
        showToast(`Can only add ${remainingSlots} more videos (limit: ${MAX_VIDEOS_PER_EVENT})`, 'error')
        return
      }

      const MAX_SIZE = CLOUDINARY_CONFIG.maxFileSize

      for (const file of files) {
        // Check file type
        if (!file.type.startsWith('video/')) {
          showToast(`"${file.name}" is not a video file`, 'error')
          continue
        }

        // Check file size (100MB limit)
        if (file.size > MAX_SIZE) {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
          showToast(`"${file.name}" is ${sizeMB}MB (limit: 100MB)`, 'error')
          continue
        }

        try {
          // Get video metadata
          const metadata = await getVideoMetadata(file)
          const duration = Math.floor(metadata.duration)

          if (duration > 60) {
            // Show trimmer for videos longer than 60 seconds
            setSelectedVideoFile(file)
            setShowVideoTrimmer(true)
            showToast(`"${file.name}" is ${duration}s long. Please trim to 60s or less.`, 'info')
          } else {
            // Proceed with upload for videos 60 seconds or less
            handleVideoUpload(file)
          }
        } catch (error) {
          console.error('Failed to read video metadata:', error)
          showToast(`Failed to read "${file.name}". Please try a different file.`, 'error')
        }
      }
    }

    input.click()
  }, [editor, handleVideoUpload, showToast, countMedia])

  // Cancel video upload/compression
  const handleCancelVideo = useCallback((taskId) => {
    if (taskId === 'all') {
      setVideoTasks([])
    } else {
      setVideoTasks(prev => prev.filter(task => task.id !== taskId))
    }
  }, [])

  // Retry failed video
  const handleRetryVideo = useCallback(async (taskId) => {
    const task = videoTasks.find(t => t.id === taskId)
    if (!task) return

    // Remove failed task
    setVideoTasks(prev => prev.filter(t => t.id !== taskId))

    // Recreate file and retry
    showToast('Retrying video upload...', 'info')
  }, [videoTasks, showToast])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    const videoFiles = files.filter(file => file.type.startsWith('video/'))

    if (imageFiles.length === 0 && videoFiles.length === 0) {
      showToast('No image or video files found', 'error')
      return
    }

    // Check limits before processing
    const { images: currentImages, videos: currentVideos } = countMedia()
    const remainingImageSlots = MAX_IMAGES_PER_EVENT - currentImages
    const remainingVideoSlots = MAX_VIDEOS_PER_EVENT - currentVideos

    if (imageFiles.length > remainingImageSlots) {
      showToast(`Can only add ${remainingImageSlots} more images (limit: ${MAX_IMAGES_PER_EVENT})`, 'error')
      return
    }
    if (videoFiles.length > remainingVideoSlots) {
      showToast(`Can only add ${remainingVideoSlots} more videos (limit: ${MAX_VIDEOS_PER_EVENT})`, 'error')
      return
    }

    // Handle images
    if (imageFiles.length > 0) {
      setIsUploading(true)
      setImageUploadProgress({ current: 0, total: imageFiles.length })
      const uploadedUrls = []
      for (let i = 0; i < imageFiles.length; i++) {
        setImageUploadProgress({ current: i + 1, total: imageFiles.length })
        const url = await uploadImage(imageFiles[i])
        if (url) {
          uploadedUrls.push(url)
        }
      }

      // Build HTML content with all images and spacing
      if (uploadedUrls.length > 0) {
        let html = ''
        for (let i = 0; i < uploadedUrls.length; i++) {
          html += `<img src="${uploadedUrls[i]}">`
          // Add spacing between images (not after the last one)
          if (i < uploadedUrls.length - 1) {
            html += '<p><br /></p>'
          }
        }

        // Insert all content at once with trailing paragraph for cursor position
        editor.chain().focus().insertContent(html + '<p></p>').run()

        showToast(`${uploadedUrls.length} image${uploadedUrls.length > 1 ? 's' : ''} uploaded successfully`, 'success')
      }

      setIsUploading(false)
      setImageUploadProgress({ current: 0, total: 0 })
    }

    // Handle videos
    if (videoFiles.length > 0) {
      for (const file of videoFiles) {
        // Check file size limit (100MB for Cloudinary free tier)
        const MAX_SIZE = CLOUDINARY_CONFIG.maxFileSize
        if (file.size > MAX_SIZE) {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
          showToast(`Video "${file.name}" is ${sizeMB}MB but limit is 100MB. Please use a smaller video or trim it.`, 'error')
          continue
        }

        try {
          // Get video metadata to check duration
          const metadata = await getVideoMetadata(file)
          const duration = Math.floor(metadata.duration)

          if (duration > 60) {
            // Show trimmer for videos longer than 60 seconds
            setSelectedVideoFile(file)
            setShowVideoTrimmer(true)
            showToast(`Video "${file.name}" is ${duration}s long. Please trim it to 60s or less.`, 'info')
          } else {
            // Proceed with upload for videos 60 seconds or less
            handleVideoUpload(file)
          }
        } catch (error) {
          console.error('Failed to read video metadata:', error)
          showToast(`Failed to read video "${file.name}". Please try a different file.`, 'error')
        }
      }
    }
  }, [editor, uploadImage, showToast, handleVideoUpload, countMedia])

  const handleLocationSelect = useCallback((locationData) => {
    if (!editor) return

    editor.chain().focus().insertContent({
      type: 'locationMarker',
      attrs: locationData
    }).run()

    showToast('Location marker added', 'success')
  }, [editor, showToast])

  // Open link modal - pre-fill with selected text if any
  const openLinkModal = useCallback(() => {
    if (!editor) return

    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, '')

    // Check if cursor is on existing link
    const existingLink = editor.getAttributes('link').href

    setLinkText(selectedText || '')
    setLinkUrl(existingLink || '')
    setShowLinkModal(true)
  }, [editor])

  // Insert or update link
  const handleLinkSubmit = useCallback(() => {
    if (!editor) return

    const url = linkUrl.trim()
    if (!url) {
      showToast('Please enter a URL', 'error')
      return
    }

    // Add https:// if no protocol specified
    const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`

    const text = linkText.trim()

    if (text) {
      // Insert new link with text
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${finalUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`)
        .run()
    } else {
      // Apply link to selection or insert URL as text
      const { from, to } = editor.state.selection
      if (from === to) {
        // No selection, insert URL as both text and link
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${finalUrl}" target="_blank" rel="noopener noreferrer">${finalUrl}</a>`)
          .run()
      } else {
        // Apply link to selection
        editor
          .chain()
          .focus()
          .setLink({ href: finalUrl })
          .run()
      }
    }

    setShowLinkModal(false)
    setLinkUrl('')
    setLinkText('')
    showToast('Link added', 'success')
  }, [editor, linkUrl, linkText, showToast])

  // Remove link from selection
  const removeLink = useCallback(() => {
    if (!editor) return
    editor.chain().focus().unsetLink().run()
    showToast('Link removed', 'success')
  }, [editor, showToast])

  if (!editor) {
    return null
  }

  return (
    <div className={styles.container}>
      {/* Progress ribbon for video upload/compression */}
      <ProgressRibbon
        videoTasks={videoTasks}
        onCancel={handleCancelVideo}
      />

      <div className={styles.menuBar}>
        <div className={styles.buttonGroup}>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? styles.active : ''}
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? styles.active : ''}
            title="Italic (Ctrl+I)"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={openLinkModal}
            className={editor.isActive('link') ? styles.active : ''}
            title="Add Link"
          >
            🔗
          </button>
          {editor.isActive('link') && (
            <button
              type="button"
              onClick={removeLink}
              className={styles.removeLink}
              title="Remove Link"
            >
              ✕
            </button>
          )}
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? styles.active : ''}
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? styles.active : ''}
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive('heading', { level: 3 }) ? styles.active : ''}
            title="Heading 3"
          >
            H3
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={editor.isActive('paragraph') ? styles.active : ''}
            title="Paragraph"
          >
            P
          </button>
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? styles.active : ''}
            title="Bullet List"
          >
            • List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? styles.active : ''}
            title="Numbered List"
          >
            1. List
          </button>
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            onClick={addImage}
            disabled={isUploading}
            title="Add Image (or drag & drop)"
            className={styles.imageButton}
          >
            {isUploading
              ? imageUploadProgress.total > 1
                ? `${imageUploadProgress.current}/${imageUploadProgress.total}...`
                : 'Uploading...'
              : '📷 Image'}
          </button>
          <button
            type="button"
            onClick={addVideo}
            disabled={isUploading}
            title="Add Video"
            className={styles.videoButton}
          >
            {isUploading ? 'Uploading...' : '📹 Video'}
          </button>
          <button
            type="button"
            onClick={() => setShowLocationPicker(true)}
            title="Add Location Marker"
            className={styles.locationButton}
          >
            📍 Location
          </button>
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Shift+Z)"
          >
            ↷
          </button>
        </div>
      </div>

      <div
        className={`${styles.editorWrapper} ${isDragging ? styles.dragging : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className={styles.dropOverlay}>
            <div className={styles.dropMessage}>
              <span className={styles.dropIcon}>📷</span>
              <p>Drop images here to upload</p>
            </div>
          </div>
        )}
        <EditorContent editor={editor} />
        <div className={styles.imageHint}>
          💡 Images appear smaller during editing but will display full-size in the published event
        </div>
      </div>

      <LocationPicker
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelect={handleLocationSelect}
        eventStartDate={eventStartDate}
        eventEndDate={eventEndDate}
      />

      <VideoTrimmer
        isOpen={showVideoTrimmer}
        onClose={() => {
          setShowVideoTrimmer(false)
          setSelectedVideoFile(null)
        }}
        videoFile={selectedVideoFile}
        onTrimComplete={handleTrimComplete}
      />

      {/* Link Modal */}
      {showLinkModal && (
        <div className={styles.linkModalOverlay} onClick={() => setShowLinkModal(false)}>
          <div className={styles.linkModal} onClick={e => e.stopPropagation()}>
            <h3>Add Link</h3>
            <div className={styles.linkField}>
              <label>Display Text (optional)</label>
              <input
                type="text"
                value={linkText}
                onChange={e => setLinkText(e.target.value)}
                placeholder="e.g., our Hawaii trip"
                autoFocus
              />
            </div>
            <div className={styles.linkField}>
              <label>URL</label>
              <input
                type="text"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="e.g., https://example.com"
                onKeyDown={e => e.key === 'Enter' && handleLinkSubmit()}
              />
            </div>
            <div className={styles.linkButtons}>
              <button type="button" onClick={() => setShowLinkModal(false)} className={styles.cancelButton}>
                Cancel
              </button>
              <button type="button" onClick={handleLinkSubmit} className={styles.submitButton}>
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RichTextEditor
