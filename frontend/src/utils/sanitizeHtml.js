import DOMPurify from 'dompurify'

// Links that open a new tab must not get a handle on this window.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

/**
 * Sanitize user- or AI-authored story HTML before it is rendered with
 * dangerouslySetInnerHTML. Keeps the formatting, images, videos, inline
 * styles and data-* attributes the editor produces; strips scripts, event
 * handlers and javascript: URLs.
 */
export function sanitizeHtml(html) {
  if (!html) return ''
  return DOMPurify.sanitize(html, { ADD_ATTR: ['target'] })
}
