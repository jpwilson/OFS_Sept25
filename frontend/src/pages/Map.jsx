import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import styles from './Map.module.css'
import { useAuth } from '../context/AuthContext'
import apiService from '../services/api'

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

function Map() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [filteredEvents, setFilteredEvents] = useState([])
  const [filter, setFilter] = useState('all') // all, following, self
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: '',
    end: ''
  })
  const [timelineExpanded, setTimelineExpanded] = useState(true)
  const [center, setCenter] = useState([20, 0]) // World center
  const [zoom, setZoom] = useState(2)

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    const data = await apiService.getEvents()
    // Filter only events with location data
    const eventsWithLocation = data.filter(
      event => event.latitude && event.longitude
    )
    setEvents(eventsWithLocation)
    setFilteredEvents(eventsWithLocation)

    // Set initial center based on first event
    if (eventsWithLocation.length > 0) {
      setCenter([eventsWithLocation[0].latitude, eventsWithLocation[0].longitude])
      setZoom(4)
    }
  }

  useEffect(() => {
    applyFilters()
  }, [filter, selectedDateRange, events])

  const applyFilters = () => {
    let filtered = [...events]

    // Apply person filter
    if (filter === 'self' && user) {
      filtered = filtered.filter(event => event.author_username === user.username)
    } else if (filter === 'following') {
      // Mock following list
      const following = ['sarahw', 'michaelc']
      filtered = filtered.filter(event => following.includes(event.author_username))
    }

    // Apply date filter
    if (selectedDateRange.start) {
      filtered = filtered.filter(event =>
        new Date(event.start_date) >= new Date(selectedDateRange.start)
      )
    }
    if (selectedDateRange.end) {
      filtered = filtered.filter(event =>
        new Date(event.end_date || event.start_date) <= new Date(selectedDateRange.end)
      )
    }

    setFilteredEvents(filtered)
  }

  const getEventTimeline = () => {
    // Return all filtered events sorted by date
    return [...filteredEvents].sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
  }

  const handleEventClick = (event) => {
    if (event.latitude && event.longitude) {
      setCenter([event.latitude, event.longitude])
      setZoom(8)
    }
  }

  const createCustomIcon = (color = '#667eea') => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          <div style="
            transform: rotate(45deg);
            text-align: center;
            line-height: 32px;
            font-size: 16px;
          ">📍</div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Event Map</h1>

        <div className={styles.filters}>
          <div className={styles.dateSelector}>
            <span>From:</span>
            <input
              type="date"
              value={selectedDateRange.start}
              onChange={(e) => setSelectedDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <span>To:</span>
            <input
              type="date"
              value={selectedDateRange.end}
              onChange={(e) => setSelectedDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>

          <button
            className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            All Events
          </button>
          <button
            className={`${styles.filterButton} ${filter === 'following' ? styles.active : ''}`}
            onClick={() => setFilter('following')}
          >
            Following
          </button>
          <button
            className={`${styles.filterButton} ${filter === 'self' ? styles.active : ''}`}
            onClick={() => setFilter('self')}
          >
            My Events
          </button>
        </div>
      </div>

      <div className={styles.mapContainer}>
        <MapContainer
          center={center}
          zoom={zoom}
          className={styles.map}
          scrollWheelZoom={true}
          maxBounds={[[-90, -180], [90, 180]]}
          maxBoundsViscosity={1.0}
          minZoom={2}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MarkerClusterGroup
            key={`${filter}-${filteredEvents.length}`}
            chunkedLoading
            showCoverageOnHover={false}
            maxClusterRadius={80}
            spiderfyOnMaxZoom={true}
            disableClusteringAtZoom={15}
            iconCreateFunction={(cluster) => {
              const count = cluster.getChildCount()
              let size = 'small'
              let sizeClass = styles.markerClusterSmall

              if (count >= 100) {
                size = 'large'
                sizeClass = styles.markerClusterLarge
              } else if (count >= 10) {
                size = 'medium'
                sizeClass = styles.markerClusterMedium
              }

              return L.divIcon({
                html: `<div class="${styles.clusterIcon} ${sizeClass}"><span>${count}</span></div>`,
                className: 'marker-cluster',
                iconSize: L.point(40, 40)
              })
            }}
          >
            {filteredEvents.map(event => (
              <Marker
                key={event.id}
                position={[event.latitude, event.longitude]}
                icon={createCustomIcon()}
              >
                <Popup className={styles.eventPopup}>
                  <div
                    className={styles.popupImage}
                    style={{ backgroundImage: `url(${event.cover_image_url})` }}
                  />
                  <div className={styles.popupTitle}>{event.title}</div>
                  <div className={styles.popupMeta}>
                    {event.author_full_name} • {event.location_name}
                  </div>
                  <div className={styles.popupDescription}>
                    {event.description}
                  </div>
                  <Link to={`/event/${event.id}`} className={styles.viewButton}>
                    View Event
                  </Link>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>

        <div className={`${styles.eventTimeline} ${timelineExpanded ? styles.expanded : ''}`}>
          <div className={styles.timelineHeader}>
            <div className={styles.timelineTitle}>
              Event Timeline ({getEventTimeline().length} events)
            </div>
            <button
              className={styles.expandButton}
              onClick={() => setTimelineExpanded(!timelineExpanded)}
              aria-label={timelineExpanded ? "Collapse timeline" : "Expand timeline"}
            >
              {timelineExpanded ? '▼' : '▲'}
            </button>
          </div>

          {timelineExpanded && (
            <div className={styles.eventScroll}>
              {getEventTimeline().map((event) => (
                <div
                  key={event.id}
                  className={styles.eventThumb}
                  style={{ backgroundImage: `url(${event.cover_image_url})` }}
                  title={event.title}
                >
                  <Link
                    to={`/event/${event.id}`}
                    className={styles.eventThumbLink}
                  >
                    <div className={styles.eventThumbOverlay}>
                      <div className={styles.eventThumbTitle}>{event.title}</div>
                      <div className={styles.eventDate}>
                        {new Date(event.start_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  </Link>
                  <button
                    className={styles.zoomToEventBtn}
                    onClick={() => handleEventClick(event)}
                    title="Zoom to location"
                  >
                    📍
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Map