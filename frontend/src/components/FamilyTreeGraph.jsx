import { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createChart } from 'family-chart'
import 'family-chart/styles/family-chart.css'
import styles from './FamilyTreeGraph.module.css'

export default function FamilyTreeGraph({ data, currentUserId, relationships }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const navigate = useNavigate()
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  // Handle card click - navigate to profile
  const handleCardClick = useCallback((e, d) => {
    const id = d.id
    if (id.startsWith('user-')) {
      const userId = id.replace('user-', '')
      if (userId === String(currentUserId)) {
        return // Don't navigate if clicking own card
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

  // Get container dimensions
  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }

    // Initial dimensions
    updateDimensions()

    // Watch for resize
    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [])

  // Create chart when dimensions are available
  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return
    if (dimensions.width === 0 || dimensions.height === 0) return

    // Clear any existing chart
    containerRef.current.innerHTML = ''

    try {
      // Create the chart with proper data
      const chart = createChart(containerRef.current, data)

      // Configure the chart
      chart
        .setOrientationVertical()
        .setCardYSpacing(100)
        .setCardXSpacing(30)
        .setTransitionTime(300)

      // Set up SVG card
      const cardSvg = chart.setCardSvg()
      cardSvg
        .setCardDim({
          w: 200,
          h: 70,
          img_dim: 50,
          img_x: 10,
          img_y: 10,
          text_x: 70,
          text_y: 15
        })
        .setCardDisplay([
          d => d.data['first name'] || 'Unknown',
          d => d.data['relationship'] || ''
        ])
        .setOnCardClick(handleCardClick)

      // Set main person
      const mainPersonId = `user-${currentUserId}`
      if (data.find(d => d.id === mainPersonId)) {
        chart.updateMainId(mainPersonId)
      }

      // Update tree and fit to container
      chart.updateTree({ tree_position: 'fit' })

      chartRef.current = chart
    } catch (error) {
      console.error('Error creating family chart:', error)
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
      chartRef.current = null
    }
  }, [data, currentUserId, handleCardClick, dimensions])

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
