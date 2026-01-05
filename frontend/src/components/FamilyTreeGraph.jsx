import { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createChart } from 'family-chart'
import 'family-chart/styles/family-chart.css'
import styles from './FamilyTreeGraph.module.css'

export default function FamilyTreeGraph({ data, currentUserId, relationships }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const navigate = useNavigate()
  const [isReady, setIsReady] = useState(false)

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

  // Wait for container to be ready
  useEffect(() => {
    if (!containerRef.current) return

    const checkReady = () => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect && rect.width > 100 && rect.height > 100) {
        console.log('Container ready:', rect.width, rect.height)
        setIsReady(true)
      } else {
        requestAnimationFrame(checkReady)
      }
    }

    const timer = setTimeout(checkReady, 50)
    return () => clearTimeout(timer)
  }, [])

  // Create chart when ready
  useEffect(() => {
    if (!isReady || !containerRef.current || !data || data.length === 0) return

    console.log('Creating chart with data:', data)

    // Clear any existing chart
    containerRef.current.innerHTML = ''

    try {
      const chart = createChart(containerRef.current, data)

      chart
        .setOrientationVertical()
        .setCardYSpacing(120)
        .setCardXSpacing(40)
        .setTransitionTime(300)

      const cardSvg = chart.setCardSvg()
      cardSvg
        .setCardDim({
          w: 220,
          h: 80,
          img_w: 60,
          img_h: 60,
          img_x: 8,
          img_y: 10,
          text_x: 75,
          text_y: 20
        })
        .setCardDisplay([
          d => d.data['first name'] || 'Unknown',
          d => d.data['relationship'] || ''
        ])
        .setOnCardClick(handleCardClick)

      // Set the main person (current user)
      const mainPersonId = `user-${currentUserId}`
      if (data.find(d => d.id === mainPersonId)) {
        chart.updateMainId(mainPersonId)
      }

      // Render and fit the tree
      chart.updateTree({ tree_position: 'fit' })

      chartRef.current = chart
      console.log('Chart created successfully')

    } catch (error) {
      console.error('Error creating family chart:', error)
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
      chartRef.current = null
    }
  }, [isReady, data, currentUserId, handleCardClick])

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
