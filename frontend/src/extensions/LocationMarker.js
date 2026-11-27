import { Node, mergeAttributes } from '@tiptap/core'

export const LocationMarker = Node.create({
  name: 'locationMarker',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    // Each value is read from the plain attribute this editor writes, or else from its
    // data-* copy: stories made by the new story maker carry only the data-* attributes.
    // Number-like values become numbers, as TipTap's default attribute parsing does.
    const typed = (v) => (typeof v === 'string' && /^[+-]?(?:\d*\.)?\d+$/.test(v) ? Number(v) : v)
    const read = (plain, data) => (el) => typed(el.getAttribute(plain) ?? el.getAttribute(data))
    return {
      locationName: {
        default: null,
        parseHTML: read('locationname', 'data-location-name'),
      },
      latitude: {
        default: null,
        parseHTML: read('latitude', 'data-latitude'),
      },
      longitude: {
        default: null,
        parseHTML: read('longitude', 'data-longitude'),
      },
      timestamp: {
        default: null,
        parseHTML: read('timestamp', 'data-timestamp'),
      },
      placeId: {
        default: null,
        parseHTML: read('placeid', 'data-place-id'),
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-location-marker]',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-location-marker': '',
        'data-location-name': node.attrs.locationName,
        'data-latitude': node.attrs.latitude,
        'data-longitude': node.attrs.longitude,
        'data-timestamp': node.attrs.timestamp,
        'data-place-id': node.attrs.placeId,
        class: 'location-marker',
        contenteditable: 'false',
      }),
      `📍 ${node.attrs.locationName || 'Unknown Location'}`
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const span = document.createElement('span')
      span.classList.add('location-marker')
      span.setAttribute('data-location-marker', '')
      span.setAttribute('data-location-name', node.attrs.locationName || '')
      span.setAttribute('data-latitude', node.attrs.latitude || '')
      span.setAttribute('data-longitude', node.attrs.longitude || '')
      span.setAttribute('data-timestamp', node.attrs.timestamp || '')
      span.setAttribute('data-place-id', node.attrs.placeId || '')
      span.contentEditable = 'false'
      span.style.display = 'inline-block'
      span.style.padding = '4px 8px'
      span.style.margin = '0 2px'
      span.style.borderRadius = '4px'
      span.style.backgroundColor = '#2dd4bf'
      span.style.color = 'white'
      span.style.fontSize = '14px'
      span.style.fontWeight = '500'
      span.style.cursor = 'pointer'
      span.style.userSelect = 'none'
      span.textContent = `📍 ${node.attrs.locationName || 'Unknown Location'}`

      return {
        dom: span,
      }
    }
  },
})
