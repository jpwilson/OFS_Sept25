import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { useCallback, useState } from 'react'
import styles from './RichTextEditor.module.css'
import apiService from '../services/api'
import { useToast } from './Toast'
import { LocationMarker } from '../extensions/LocationMarker'
import LocationPicker from './LocationPicker'

function RichTextEditor({ content, onChange, placeholder = "Tell your story...", eventStartDate, eventEndDate, onGPSExtracted, gpsExtractionEnabled = false }) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const { showToast } = useToast()

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

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'

    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (file) {
        setIsUploading(true)
        const url = await uploadImage(file)
        if (url) {
          editor.chain().focus().setImage({ src: url }).run()
          showToast('Image uploaded successfully', 'success')
        }
        setIsUploading(false)
      }
    }

    input.click()
  }, [editor, uploadImage, showToast])

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

    if (imageFiles.length === 0) {
      showToast('No image files found', 'error')
      return
    }

    // Upload all images first
    setIsUploading(true)
    const uploadedUrls = []
    for (const file of imageFiles) {
      const url = await uploadImage(file)
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

      // Insert all content at once at the current cursor position
      editor.chain().focus().insertContent(html).run()

      showToast(`${uploadedUrls.length} image${uploadedUrls.length > 1 ? 's' : ''} uploaded successfully`, 'success')
    }

    setIsUploading(false)
  }, [editor, uploadImage, showToast])

  const handleLocationSelect = useCallback((locationData) => {
    if (!editor) return

    editor.chain().focus().insertContent({
      type: 'locationMarker',
      attrs: locationData
    }).run()

    showToast('Location marker added', 'success')
  }, [editor, showToast])

  if (!editor) {
    return null
  }

  return (
    <div className={styles.container}>
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
            {isUploading ? 'Uploading...' : '📷 Image'}
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
    </div>
  )
}

export default RichTextEditor
