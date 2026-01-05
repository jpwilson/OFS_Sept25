import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { createChart } from 'family-chart'
import 'family-chart/styles/family-chart.css'
import styles from './FamilyTreeGraph.module.css'

export default function FamilyTreeGraph({ data, currentUserId, relationships }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const navigate = useNavigate()

  // Handle card click - navigate to profile
  const handleCardClick = useCallback((e, d) => {
    const id = d.id
    if (id.startsWith('user-')) {
      const userId = id.replace('user-', '')
      // Find the username from relationships or check if it's current user
      if (userId === String(currentUserId)) {
        // Don't navigate if clicking own card - it's the center
        return
      }
      const rel = relationships?.find(r => String(r.other_user_id) === userId)
      if (rel) {
        navigate(`/profile/${rel.other_user_username}`)
      }
    } else if (id.startsWith('tag-')) {
      const tagId = id.replace('tag-', '')
      navigate(`/tag-profile/${tagId}`)
    }
  }, [relationships, currentUserId, navigate])

  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return

    // Clear any existing chart
    containerRef.current.innerHTML = ''

    try {
      // Create the chart
      const chart = createChart(containerRef.current, data)

      // Configure the chart
      chart
        .setOrientationVertical()  // Vertical layout (top to bottom)
        .setCardYSpacing(100)      // Level separation
        .setCardXSpacing(20)       // Node separation
        .setTransitionTime(300)    // Smooth transitions

      // Set up SVG card with custom dimensions and styling
      const cardSvg = chart.setCardSvg()
      cardSvg
        .setCardDim({
          w: 180,
          h: 80,
          img_dim: 50,
          text_x: 65,
          text_y: 20,
          img_x: 5,
          img_y: 15
        })
        .setCardDisplay([
          d => d.data['first name'] || 'Unknown',
          d => d.data['relationship'] || ''
        ])
        .setOnCardClick(handleCardClick)

      // Find and set the main person (current user)
      const mainPersonId = `user-${currentUserId}`
      const mainPerson = data.find(d => d.id === mainPersonId)
      if (mainPerson) {
        chart.updateMainId(mainPersonId)
      }

      // Update the tree with fit to container
      chart.updateTree({ tree_position: 'main_to_middle' })

      chartRef.current = chart
    } catch (error) {
      console.error('Error creating family chart:', error)
    }

    return () => {
      // Cleanup
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
      chartRef.current = null
    }
  }, [data, currentUserId, handleCardClick])

  // Zoom controls
  const handleZoomIn = () => {
    if (chartRef.current?.svg) {
      // family-chart uses d3 zoom internally
      const svg = chartRef.current.svg
      const currentTransform = svg.querySelector('.view')?.getAttribute('transform')
      if (currentTransform) {
        // Parse and scale up
        console.log('Zoom in clicked')
      }
    }
  }

  const handleZoomOut = () => {
    if (chartRef.current?.svg) {
      console.log('Zoom out clicked')
    }
  }

  const handleReset = () => {
    if (chartRef.current) {
      chartRef.current.updateTree({ tree_position: 'fit' })
    }
  }

  if (!data || data.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No family connections to display yet.</p>
        <p>Add relationships to see your family tree!</p>
      </div>
    )
  }

  return (
    <div className={styles.graphContainer}>
      <div ref={containerRef} className={styles.chart} />
      <div className={styles.controls}>
        <button onClick={handleReset} className={styles.controlButton} title="Reset view">
          Reset
        </button>
      </div>
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
