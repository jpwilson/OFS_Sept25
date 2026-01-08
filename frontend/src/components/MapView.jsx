import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import styles from './MapView.module.css'

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Component to handle map center/zoom changes
function MapController({ center, zoom }) {
  const map = useMap()

  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom)
    }
  }, [center, zoom, map])

  return null
}

export default function MapView({ events = [] }) {
  const [timelineExpanded, setTimelineExpanded] = useState(true)
  const [center, setCenter] = useState([20, 0])
  const [zoom, setZoom] = useState(2)

  // Filter only events with location data
  const eventsWithLocation = events.filter(
    event => event.latitude && event.longitude
  )

  // Set initial center based on first event
  useEffect(() => {
    if (eventsWithLocation.length > 0) {
      setCenter([eventsWithLocation[0].latitude, eventsWithLocation[0].longitude])
      setZoom(4)
    }
  }, [events])

  const getEventTimeline = () => {
    return [...eventsWithLocation].sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
  }

  const handleEventClick = (event) => {
    if (event.latitude && event.longitude) {
      setCenter([event.latitude, event.longitude])
      setZoom(8)
    }
  }

  const createCustomIcon = (color = '#22c55e') => {
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

  if (eventsWithLocation.length === 0) {
    return (
      <div className={styles.noEvents}>
        <p>No events with location data to display on the map.</p>
      </div>
    )
  }

  return (
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
        <MapController center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MarkerClusterGroup
          key={eventsWithLocation.length}
          chunkedLoading
          showCoverageOnHover={false}
          maxClusterRadius={80}
          spiderfyOnMaxZoom={true}
          disableClusteringAtZoom={15}
          iconCreateFunction={(cluster) => {
            const count = cluster.getChildCount()
            let sizeClass = styles.markerClusterSmall

            if (count >= 100) {
              sizeClass = styles.markerClusterLarge
            } else if (count >= 10) {
              sizeClass = styles.markerClusterMedium
            }

            return L.divIcon({
              html: `<div class="${styles.clusterIcon} ${sizeClass}"><span>${count}</span></div>`,
              className: 'marker-cluster',
              iconSize: L.point(40, 40)
            })
          }}
        >
          {eventsWithLocation.map(event => (
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
                <Link to={`/event/${event.slug || event.id}`} className={styles.viewButton}>
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
                  to={`/event/${event.slug || event.id}`}
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
  )
}
