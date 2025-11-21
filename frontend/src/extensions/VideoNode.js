import { Node, mergeAttributes } from '@tiptap/core'

export const VideoNode = Node.create({
  name: 'video',

  group: 'block',

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      controls: {
        default: true,
      },
      width: {
        default: '100%',
      },
      maxWidth: {
        default: '600px',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'video',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes, { controls: true })]
  },

  addNodeView() {
    return ({ node }) => {
      const wrapper = document.createElement('div')
      wrapper.style.margin = '16px 0'
      wrapper.style.maxWidth = node.attrs.maxWidth
      wrapper.style.width = '100%'
      wrapper.style.display = 'flex'
      wrapper.style.justifyContent = 'center'

      const video = document.createElement('video')
      video.src = node.attrs.src
      video.controls = true
      video.style.maxWidth = '600px'
      video.style.maxHeight = '70vh' // Constrain height for portrait videos
      video.style.width = 'auto' // Let width adjust to maintain aspect ratio
      video.style.height = 'auto' // Let height adjust to maintain aspect ratio
      video.style.borderRadius = '8px'
      video.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
      video.style.display = 'block'

      wrapper.appendChild(video)

      return {
        dom: wrapper,
        contentDOM: null,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'video') return false
          video.src = updatedNode.attrs.src
          return true
        }
      }
    }
  },

  addCommands() {
    return {
      setVideo: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      },
    }
  },
})

export default VideoNode
