import { Node, mergeAttributes } from '@tiptap/core'

export const LocationMarker = Node.create({
  name: 'locationMarker',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      locationName: {
        default: null,
      },
      latitude: {
        default: null,
      },
      longitude: {
        default: null,
      },
      timestamp: {
        default: null,
      },
      placeId: {
        default: null,
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
