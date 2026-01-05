import { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createChart } from 'family-chart'
import 'family-chart/styles/family-chart.css'
import styles from './FamilyTreeGraph.module.css'

export default function FamilyTreeGraph({ data, currentUserId, relationships }) {
  const wrapperRef = useRef(null)
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

  // Get wrapper dimensions
  useEffect(() => {
    if (!wrapperRef.current) return

    const updateDimensions = () => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect()
        console.log('Container dimensions:', rect.width, rect.height)
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({ width: Math.floor(rect.width), height: Math.floor(rect.height) })
        }
      }
    }

    // Small delay to ensure layout is complete
    const timer = setTimeout(updateDimensions, 100)

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions()
    })
    resizeObserver.observe(wrapperRef.current)

    return () => {
      clearTimeout(timer)
      resizeObserver.disconnect()
    }
  }, [])

  // Create chart when dimensions are available
  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return
    if (dimensions.width < 100 || dimensions.height < 100) return

    console.log('Creating chart with dimensions:', dimensions.width, dimensions.height)

    // Clear any existing chart
    containerRef.current.innerHTML = ''

    try {
      const chart = createChart(containerRef.current, data)

      chart
        .setOrientationVertical()
        .setCardYSpacing(100)
        .setCardXSpacing(30)
        .setTransitionTime(300)

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

      const mainPersonId = `user-${currentUserId}`
      if (data.find(d => d.id === mainPersonId)) {
        chart.updateMainId(mainPersonId)
      }

      chart.updateTree({ tree_position: 'fit' })

      chartRef.current = chart

      // Refit after a short delay to ensure SVG is properly sized
      setTimeout(() => {
        if (chartRef.current) {
          chartRef.current.updateTree({ tree_position: 'fit' })
        }
      }, 200)
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
    <div className={styles.graphContainer} ref={wrapperRef}>
      {/* Container with explicit pixel dimensions */}
      <div
        ref={containerRef}
        className={styles.chart}
        style={{
          width: dimensions.width > 0 ? `${dimensions.width}px` : '100%',
          height: dimensions.height > 0 ? `${dimensions.height}px` : '100%'
        }}
      />
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
