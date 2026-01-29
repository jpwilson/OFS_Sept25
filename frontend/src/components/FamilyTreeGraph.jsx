import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel
} from 'reactflow'
import { toPng } from 'html-to-image'
import 'reactflow/dist/style.css'
import FamilyNode from './FamilyNode'
import styles from './FamilyTreeGraph.module.css'

// Register custom node types
const nodeTypes = {
  familyMember: FamilyNode
}

// Default edge options
const defaultEdgeOptions = {
  type: 'smoothstep',
  style: {
    strokeWidth: 2
  }
}

export default function FamilyTreeGraph({ data, currentUserId, relationships }) {
  const navigate = useNavigate()
  const flowRef = useRef(null)

  // Use React Flow's state management for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState(data?.nodes || [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(data?.edges || [])

  // Handle node click - navigate to profile
  const onNodeClick = useCallback((event, node) => {
    const { id } = node
    const nodeData = node.data

    // Don't navigate if clicking on current user
    if (nodeData.isCurrentUser) return

    if (id.startsWith('user-')) {
      // Navigate to user profile
      if (nodeData.username) {
        navigate(`/profile/${nodeData.username}`)
      }
    } else if (id.startsWith('tag-')) {
      // Navigate to tag profile
      const tagId = id.replace('tag-', '')
      navigate(`/tag-profile/${tagId}`)
    }
  }, [navigate])

  // Export to PNG
  const handleExport = useCallback(() => {
    if (!flowRef.current) return

    // Find the ReactFlow viewport element
    const viewport = flowRef.current.querySelector('.react-flow__viewport')
    if (!viewport) return

    toPng(viewport, {
      backgroundColor: '#1a1a2e',
      quality: 1,
      pixelRatio: 2
    })
      .then(dataUrl => {
        const link = document.createElement('a')
        link.download = 'family-tree.png'
        link.href = dataUrl
        link.click()
      })
      .catch(err => {
        console.error('Failed to export image:', err)
      })
  }, [])

  // Fit view on initial load
  const onInit = useCallback((reactFlowInstance) => {
    reactFlowInstance.fitView({ padding: 0.2 })
  }, [])

  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No family connections to display yet.</p>
        <p>Add relationships to see your family tree!</p>
      </div>
    )
  }

  return (
    <div className={styles.graphContainer} ref={flowRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onInit={onInit}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        minZoom={0.3}
        maxZoom={2}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#2a2a4a" gap={24} size={1} />
        <Controls className={styles.controls} />

        {/* Export button panel */}
        <Panel position="top-right" className={styles.exportPanel}>
          <button onClick={handleExport} className={styles.exportButton} title="Download as PNG">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </button>
        </Panel>
      </ReactFlow>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendIcon}>Click</span>
          <span>cards to view profiles</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendIcon}>Drag</span>
          <span>to pan the tree</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendIcon}>Scroll</span>
          <span>to zoom in/out</span>
        </div>
      </div>
    </div>
  )
}
