import { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createChart } from 'family-chart'
import * as d3 from 'd3'
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

      // Force SVG to fill container and center content
      setTimeout(() => {
        try {
          // Find the f3 wrapper and SVG
          const f3Wrapper = containerRef.current?.querySelector('.f3')
          const svg = containerRef.current?.querySelector('svg')

          console.log('f3Wrapper:', f3Wrapper, 'svg:', svg)
          console.log('Container dimensions:', dimensions.width, dimensions.height)

          if (!svg) {
            console.error('No SVG found')
            return
          }

          // Force SVG to fill container with inline styles (override library)
          if (f3Wrapper) {
            f3Wrapper.style.cssText = `width: ${dimensions.width}px !important; height: ${dimensions.height}px !important; display: block !important; position: absolute !important; top: 0 !important; left: 0 !important;`
          }

          svg.style.cssText = `width: ${dimensions.width}px !important; height: ${dimensions.height}px !important; display: block !important;`
          svg.setAttribute('width', dimensions.width)
          svg.setAttribute('height', dimensions.height)

          // Get the view group that contains the tree
          const viewGroup = svg.querySelector('.view')
          console.log('viewGroup:', viewGroup)

          if (!viewGroup) {
            console.error('No .view group found')
            return
          }

          // Get the bounds of the tree content
          const bbox = viewGroup.getBBox()
          console.log('Tree bbox:', bbox)

          // Calculate the center transform
          const containerWidth = dimensions.width
          const containerHeight = dimensions.height

          // Calculate scale to fit with some padding
          const padding = 50
          const scaleX = (containerWidth - padding * 2) / bbox.width
          const scaleY = (containerHeight - padding * 2) / bbox.height
          const scale = Math.min(scaleX, scaleY, 1.5) // Cap at 1.5x zoom

          // Calculate translation to center
          const translateX = (containerWidth / 2) - (bbox.x + bbox.width / 2) * scale
          const translateY = (containerHeight / 2) - (bbox.y + bbox.height / 2) * scale

          console.log('Transform:', { scale, translateX, translateY, containerWidth, containerHeight })

          // Apply the transform using D3 zoom
          const svgSelection = d3.select(svg)
          const zoom = d3.zoom().on('zoom', (event) => {
            d3.select(viewGroup).attr('transform', event.transform)
          })

          svgSelection.call(zoom)
          svgSelection.call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale))

          console.log('Transform applied successfully')
        } catch (err) {
          console.error('Error centering chart:', err)
        }
      }, 500)
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
