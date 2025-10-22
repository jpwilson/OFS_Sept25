import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import styles from './EventDetail.module.css'
import apiService from '../services/api'
import { mockEventDetails } from '../data/mockEvents'

function EventDetail() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvent()
  }, [id])

  async function loadEvent() {
    const data = await apiService.getEvent(id)
    if (!data) {
      // Use mock data if API fails
      setEvent(getMockEvent(id))
    } else {
      setEvent(data)
    }
    setLoading(false)
  }

  function getMockEvent(eventId) {
    return mockEventDetails[eventId] || mockEventDetails[1]
  }

  function formatDateRange(start, end) {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const options = { month: 'long', day: 'numeric', year: 'numeric' }

    if (start === end || !end) {
      return startDate.toLocaleDateString('en-US', options)
    }

    const startMonth = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    return `${startMonth} - ${endDate.toLocaleDateString('en-US', options)}`
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  if (!event) {
    return <div className={styles.notFound}>Event not found</div>
  }

  return (
    <div className={styles.container}>
      <div
        className={styles.heroImage}
        style={{ backgroundImage: `url(${event.cover_image_url})` }}
      >
        <div className={styles.heroOverlay}>
          <h1 className={styles.title}>{event.title}</h1>
          <div className={styles.meta}>
            <div className={styles.author}>
              <div className={styles.avatar}></div>
              <span>{event.author_full_name || event.author_username}</span>
            </div>
            <span>·</span>
            <span>{formatDateRange(event.start_date, event.end_date)}</span>
            <span>·</span>
            <span>{event.location_name}</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {event.content_blocks && event.content_blocks.map((block, index) => {
          if (block.type === 'text') {
            return (
              <p key={index} className={styles.text}>
                {block.content}
              </p>
            )
          }
          if (block.type === 'image') {
            return (
              <div key={index} className={styles.imageBlock}>
                <div
                  className={styles.image}
                  style={{ backgroundImage: `url(${block.media_url})` }}
                ></div>
                {block.caption && (
                  <div className={styles.caption}>{block.caption}</div>
                )}
              </div>
            )
          }
          return null
        })}

        {(!event.content_blocks || event.content_blocks.length === 0) && (
          <p className={styles.text}>{event.description}</p>
        )}
      </div>

      <div className={styles.stats}>
        <span>♥ {event.like_count || 0} likes</span>
        <span>{event.comment_count || 0} comments</span>
        <span>{event.view_count || 0} views</span>
      </div>

      <div className={styles.comments}>
        <h3>Comments</h3>
        <div className={styles.commentsList}>
          <p className={styles.noComments}>No comments yet. Be the first to share your thoughts!</p>
        </div>
      </div>
    </div>
  )
}

export default EventDetail