// Story HTML -> blocks (owner: F0). PLAN-DAYLIGHT 2.5 "How it renders". Browser only
// (uses DOMParser). The contract the story page, the creation preview and the iOS app
// (OFS_iOS/App/StoryHTML.swift) share.
//
// parseStory(html, eventImages, {localMedia}) -> {blocks, chapters, media, markers}
//   localMedia: true keeps blob: URLs (photos still on this device) through sanitising, for
//   the creation flow's preview. Only for HTML built on this device; never for stored stories.
//   block:   {type:'heading', level, id, text, chapterId}
//          | {type:'html', html, chapterId}                 sanitised HTML, safe for dangerouslySetInnerHTML
//          | {type:'media', items, chapterId}                a run of consecutive photos or clips
//          | {type:'marker', stop, chapterId}                comes right before the text that holds it
//                                                             (a paragraph holding only markers adds no text block)
//   media item: {id, kind:'image'|'video', src, poster, caption, alt, w, h, lat, lng, ts, imageId, inBody}
//   chapter: {id, title, level, index}                       H1s (H2s when a story has no H1)
//   marker stop: {anchorId, name, lat, lng, ts, placeId, chapterId, order}
// Marker spans inside html blocks carry data-anchor-id={anchorId}, so a page can anchor
// scroll sync on the exact word.
import DOMPurify from 'dompurify'
import { sanitizeHtml } from '../../utils/sanitizeHtml.js'

const HEADING = /^H[1-3]$/
const MEDIA_TAGS = new Set(['IMG', 'VIDEO', 'PICTURE'])

/** A stable key for matching an <img src> to an event_images row. */
export function mediaKey(url) {
  if (!url) return ''
  try {
    const u = new URL(url, 'http://x.invalid')
    return u.pathname.replace(/\/+$/, '')
  } catch {
    return String(url).split(/[?#]/)[0]
  }
}
const fileKey = (url) => mediaKey(url).split('/').pop() || ''

function slugify(text, used) {
  const base = String(text || 'section').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'section'
  let id = base, n = 2
  while (used.has(id)) id = `${base}-${n++}`
  used.add(id)
  return id
}

const num = (v) => (v === '' || v == null || isNaN(+v) ? null : +v)

// DOMPurify's own URI rule (3.x) with blob: added: local photos in the creation preview.
const LOCAL_MEDIA_URI = /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
const clean = (html, localMedia) => (localMedia ? DOMPurify.sanitize(html, { ADD_ATTR: ['target'], ALLOWED_URI_REGEXP: LOCAL_MEDIA_URI }) : sanitizeHtml(html))

function isBlankNode(n) {
  if (n.nodeType === 3) return !n.textContent.trim()
  if (n.nodeType === 1 && n.tagName === 'BR') return true
  return false
}

export function parseStory(html, eventImages = [], { localMedia = false } = {}) {
  const out = { blocks: [], chapters: [], media: [], markers: [] }
  if (!html || typeof DOMParser === 'undefined') return out
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${clean(html, localMedia)}</body>`, 'text/html')
  const body = doc.body

  const byPath = new Map(), byFile = new Map()
  for (const im of eventImages || []) {
    if (!im?.image_url) continue
    byPath.set(mediaKey(im.image_url), im)
    if (!byFile.has(fileKey(im.image_url))) byFile.set(fileKey(im.image_url), im)
  }
  const used = new Set()
  const matched = new Set()
  const hasH1 = !!body.querySelector('h1')
  let chapterId = null
  let text = []
  let group = null
  let mediaN = 0

  const flushGroup = () => {
    if (group?.length) out.blocks.push({ type: 'media', items: group, chapterId })
    group = null
  }
  const flushText = () => {
    const h = text.join('').trim()
    if (h) out.blocks.push({ type: 'html', html: h, chapterId })
    text = []
  }
  const addText = (h) => {
    if (!h || !h.replace(/<br\s*\/?>/gi, '').replace(/&nbsp;/g, ' ').trim()) return
    flushGroup()
    text.push(h)
  }

  const itemFor = (el) => {
    const isVideo = el.tagName === 'VIDEO'
    const src = isVideo ? el.getAttribute('src') || el.querySelector('source')?.getAttribute('src') : el.tagName === 'PICTURE' ? el.querySelector('img')?.getAttribute('src') : el.getAttribute('src')
    if (!src) return null
    const im = byPath.get(mediaKey(src)) || byFile.get(fileKey(src))
    if (im) matched.add(im)
    const img = el.tagName === 'PICTURE' ? el.querySelector('img') : el
    return {
      id: im ? `img-${im.id}` : `m${mediaN++}`,
      imageId: im?.id ?? null,
      kind: isVideo ? 'video' : 'image',
      src,
      poster: isVideo ? el.getAttribute('poster') || im?.video_thumbnail_url || null : null,
      caption: im?.caption || el.closest('figure')?.querySelector('figcaption')?.textContent?.trim() || '',
      alt: img?.getAttribute?.('alt') || im?.alt_text || im?.caption || '',
      w: num(img?.getAttribute?.('width')) ?? im?.width ?? null,
      h: num(img?.getAttribute?.('height')) ?? im?.height ?? null,
      lat: im?.latitude ?? null,
      lng: im?.longitude ?? null,
      ts: im?.timestamp ?? null,
      inBody: true,
    }
  }
  const addMedia = (el) => {
    const item = itemFor(el)
    if (!item) return
    flushText()
    ;(group ||= []).push(item)
    out.media.push(item)
  }

  // Markers inside an element become marker blocks placed before it.
  const takeMarkers = (el) => {
    const spans = el.matches?.('span[data-location-marker]') ? [el] : [...(el.querySelectorAll?.('span[data-location-marker]') || [])]
    for (const sp of spans) {
      const order = out.markers.length
      const stop = {
        anchorId: `stop-anchor-${order + 1}`,
        name: sp.getAttribute('data-location-name') || sp.textContent.replace(/^\s*📍\s*/, '').trim() || null,
        lat: num(sp.getAttribute('data-latitude')),
        lng: num(sp.getAttribute('data-longitude')),
        ts: sp.getAttribute('data-timestamp') || null,
        placeId: sp.getAttribute('data-place-id') || null,
        chapterId,
        order,
      }
      sp.setAttribute('data-anchor-id', stop.anchorId)
      out.markers.push(stop)
      flushGroup()
      flushText()
      out.blocks.push({ type: 'marker', stop, chapterId })
    }
  }

  // An element holding text and media: split it into text runs and media, keeping order.
  const splitMixed = (el) => {
    const tag = el.tagName.toLowerCase()
    let run = []
    const flushRun = () => {
      const inner = run.map((n) => (n.nodeType === 1 ? n.outerHTML : escapeText(n.textContent))).join('')
      if (inner.replace(/<br\s*\/?>/gi, '').trim()) addText(`<${tag}>${inner}</${tag}>`)
      run = []
    }
    for (const n of [...el.childNodes]) {
      if (n.nodeType === 1 && (MEDIA_TAGS.has(n.tagName) || n.querySelector?.('img,video'))) {
        flushRun()
        if (MEDIA_TAGS.has(n.tagName)) addMedia(n)
        else n.querySelectorAll('img,video').forEach(addMedia)
      } else run.push(n)
    }
    flushRun()
  }

  for (const node of [...body.childNodes]) {
    if (node.nodeType === 3) {
      if (node.textContent.trim()) addText(`<p>${escapeText(node.textContent)}</p>`)
      continue
    }
    if (node.nodeType !== 1) continue
    const tag = node.tagName
    if (HEADING.test(tag)) {
      flushGroup()
      flushText()
      const level = +tag[1]
      const t = node.textContent.trim()
      const id = slugify(t, used)
      if ((hasH1 && level === 1) || (!hasH1 && level === 2)) {
        chapterId = id
        out.chapters.push({ id, title: t, level, index: out.chapters.length })
      }
      out.blocks.push({ type: 'heading', level, id, text: t, chapterId })
      takeMarkers(node)
      continue
    }
    if (MEDIA_TAGS.has(tag) || tag === 'FIGURE') {
      const m = MEDIA_TAGS.has(tag) ? node : node.querySelector('img,video')
      if (m) addMedia(m)
      continue
    }
    takeMarkers(node)
    const hasMedia = !!node.querySelector('img,video')
    if (!hasMedia) {
      if (onlyMarkers(node)) continue // its marker block already says it: no leftover chip
      addText(node.outerHTML)
      continue
    }
    const onlyMedia = [...node.childNodes].every((n) => isBlankNode(n) || (n.nodeType === 1 && (MEDIA_TAGS.has(n.tagName) || (n.tagName === 'A' && n.querySelector('img') && !n.textContent.trim()))))
    if (onlyMedia) node.querySelectorAll('img,video').forEach(addMedia)
    else splitMixed(node)
  }
  flushGroup()
  flushText()

  // Photos attached to the story but not placed in the text (shown in the gallery only).
  for (const im of eventImages || []) {
    if (!im?.image_url || matched.has(im)) continue
    out.media.push({
      id: `img-${im.id}`, imageId: im.id, kind: /\.(mp4|mov|webm)(\?|$)/i.test(im.image_url) ? 'video' : 'image', src: im.image_url,
      poster: im.video_thumbnail_url || null, caption: im.caption || '', alt: im.alt_text || im.caption || '',
      w: im.width ?? null, h: im.height ?? null, lat: im.latitude ?? null, lng: im.longitude ?? null, ts: im.timestamp ?? null, inBody: false,
    })
  }
  return out
}

/** True when an element holds location markers and nothing else to read. */
function onlyMarkers(el) {
  if (el.matches?.('span[data-location-marker]')) return true
  if (!el.querySelector?.('span[data-location-marker]')) return false
  const copy = el.cloneNode(true)
  copy.querySelectorAll('span[data-location-marker]').forEach((sp) => sp.remove())
  return !copy.textContent.replace(/📍️?/g, '').replace(/\u00a0/g, ' ').trim()
}

function escapeText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
