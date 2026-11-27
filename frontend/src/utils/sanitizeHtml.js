import DOMPurify from 'dompurify'

// Story HTML is written by members (the TipTap editor, or the API called
// directly) and by the AI writer, then shown to everyone who can see the story.
// Only the shapes those writers produce are kept; anything that could run
// script, load another page, look like part of the app (forms, buttons) or
// escape the story column (fixed/absolute positioning, z-index, app classes)
// is removed. backend/app/utils/story_html.py applies the same allowlist on save.

// Tags the editor, the AI writer and quick-add produce, plus plain text markup
// an older story or an API client might use. No form controls, style, link,
// meta, base, iframe, object, embed, dialog, svg or math.
const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'ins', 'mark', 'sub', 'sup', 'small',
  'code', 'pre', 'kbd', 'samp', 'blockquote', 'q', 'cite', 'abbr', 'time',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'a', 'span', 'div',
  'img', 'picture', 'source', 'video', 'track', 'figure', 'figcaption',
  'table', 'caption', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col',
  'details', 'summary',
]

// data-* and aria-* attributes are kept as well (DOMPurify's defaults).
const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height', 'class', 'id', 'style',
  'start', 'reversed', 'type', 'value', 'colspan', 'rowspan', 'scope', 'dir', 'lang', 'cite', 'datetime', 'open',
  'controls', 'poster', 'preload', 'playsinline', 'muted', 'loop', 'kind', 'srclang', 'label', 'srcset', 'sizes', 'media',
  'contenteditable',
  // The editor's own node attributes. TipTap writes each node attribute as a
  // plain HTML attribute and reads it back from there (LocationMarker reads
  // locationname, latitude, ...; VideoNode reads maxwidth), so dropping these
  // would erase a story's places the next time it is edited.
  'locationname', 'latitude', 'longitude', 'timestamp', 'placeid', 'maxwidth',
]

// Classes the editor and the story pages use. Anything else is dropped, so a
// story cannot borrow a global class such as a lightbox or map overlay
// (position: fixed, full screen) to cover the app.
const ALLOWED_CLASSES = new Set(['location-marker', 'editor-link', 'image-caption', 'video-caption', 'image-wrapper'])
const ALLOWED_CLASS_PATTERN = /^language-[\w+#-]{1,40}$/

const LENGTH_PROPS = [
  'width', 'max-width', 'min-width', 'height', 'max-height', 'min-height',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
]
const MARGIN_PROPS = ['margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left']

// Inline CSS that stays in the story's flow. No position, z-index, inset,
// transform, opacity, pointer-events, background images, shadows or animation.
const ALLOWED_CSS = new Set([
  'color', 'background-color', 'font-size', 'font-weight', 'font-style', 'font-family',
  'text-align', 'text-decoration', 'text-decoration-line', 'text-transform', 'line-height', 'letter-spacing',
  'white-space', 'vertical-align', 'list-style-type', 'border-radius', 'display', 'float', 'clear',
  'justify-content', 'align-items', 'gap', 'cursor', 'user-select', 'object-fit',
  ...LENGTH_PROPS, ...MARGIN_PROPS,
])
const ALLOWED_DISPLAY = new Set(['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'list-item', 'none'])
// Plain values plus a few simple functions with plain arguments.
const CSS_FUNCTION = /\b(?:var|rgba?|hsla?|calc)\(\s*[-\w.,%\s+*/]*\)/gi
const CSS_PLAIN_VALUE = /^[-#\w.,%\s'"]*$/

/** Keep only allowlisted, in-flow declarations from a style attribute. */
export function cleanStyle(style) {
  const kept = []
  for (const declaration of String(style || '').split(';')) {
    const colon = declaration.indexOf(':')
    if (colon < 0) continue
    const prop = declaration.slice(0, colon).trim().toLowerCase()
    const value = declaration.slice(colon + 1).replace(/!\s*important\s*$/i, '').trim()
    if (!ALLOWED_CSS.has(prop) || !value || value.length > 200) continue
    const lower = value.toLowerCase()
    if (/url|expression|javascript|@|\\|\/\*|[<>{}]/.test(lower)) continue
    if (!CSS_PLAIN_VALUE.test(value.replace(CSS_FUNCTION, ''))) continue
    if (prop === 'display' && !ALLOWED_DISPLAY.has(lower)) continue
    // Negative margins pull the story over the page around it.
    if (MARGIN_PROPS.includes(prop) && /-\s*[\d.]/.test(lower)) continue
    kept.push(`${prop}: ${value}`)
  }
  return kept.join('; ')
}

function cleanClasses(value) {
  return String(value || '')
    .split(/\s+/)
    .filter((c) => ALLOWED_CLASSES.has(c) || ALLOWED_CLASS_PATTERN.test(c))
    .join(' ')
}

DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
  const name = data.attrName
  let value = data.attrValue
  if (name === 'style') value = cleanStyle(value)
  else if (name === 'class') value = cleanClasses(value)
  // Only the location marker's contenteditable="false" is ever written.
  else if (name === 'contenteditable') value = value === 'false' ? 'false' : ''
  else if (name === 'target') value = value === '_blank' ? '_blank' : ''
  else return
  if (value) data.attrValue = value
  else data.keepAttr = false
})

// Links that open a new tab must not get a handle on this window.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

const CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: true,
  ALLOW_ARIA_ATTR: true,
  // Removed together with everything inside them (on top of DOMPurify's list:
  // script, style, template, iframe, svg, math, ...).
  ADD_FORBID_CONTENTS: ['object', 'embed', 'select', 'textarea', 'button', 'form', 'dialog'],
}

/**
 * Sanitize user- or AI-authored story HTML before it is rendered with
 * dangerouslySetInnerHTML or parsed into the editor. Keeps the formatting,
 * images, videos, captions, location markers (and their data-* attributes)
 * the editor produces; strips scripts, event handlers, javascript: URLs, form
 * controls, embedded pages and CSS that could cover the app.
 */
export function sanitizeHtml(html) {
  if (!html) return ''
  return DOMPurify.sanitize(html, CONFIG)
}
