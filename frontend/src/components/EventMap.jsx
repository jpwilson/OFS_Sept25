import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './EventMap.module.css';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom numbered marker icon
const createNumberedIcon = (number) => {
  return L.divIcon({
    className: 'numbered-marker',
    html: `<div class="numbered-marker-inner">${number}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

// Component to fit map bounds to all markers
function FitBounds({ locations }) {
  const map = useMap();

  useEffect(() => {
    if (locations && locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map(loc => [loc.latitude, loc.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locations, map]);

  return null;
}

function EventMap({ locations, onLocationClick }) {
  const [selectedLocation, setSelectedLocation] = useState(null);

  if (!locations || locations.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No locations to display on map</p>
      </div>
    );
  }

  // Calculate center point
  const centerLat = locations.reduce((sum, loc) => sum + loc.latitude, 0) / locations.length;
  const centerLng = locations.reduce((sum, loc) => sum + loc.longitude, 0) / locations.length;

  // Create polyline coordinates (journey path)
  const pathCoordinates = locations.map(loc => [loc.latitude, loc.longitude]);

  const handleMarkerClick = (location, index) => {
    setSelectedLocation(location);
    if (onLocationClick) {
      onLocationClick(location, index);
    }
  };

  return (
    <div className={styles.mapContainer}>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={10}
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

        <FitBounds locations={locations} />

        {/* Journey path - polyline connecting all locations */}
        {locations.length > 1 && (
          <Polyline
            positions={pathCoordinates}
            color="#667eea"
            weight={3}
            opacity={0.7}
            smoothFactor={1}
          />
        )}

        {/* Numbered markers for each location */}
        {locations.map((location, index) => (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            icon={createNumberedIcon(index + 1)}
            eventHandlers={{
              click: () => handleMarkerClick(location, index)
            }}
          >
            <Popup>
              <div className={styles.popup}>
                <div className={styles.popupNumber}>Location {index + 1}</div>
                <div className={styles.popupName}>{location.location_name}</div>
                {location.timestamp && (
                  <div className={styles.popupDate}>
                    {new Date(location.timestamp).toLocaleDateString()}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <style>{`
        .numbered-marker {
          background: transparent;
          border: none;
        }

        .numbered-marker-inner {
          width: 36px;
          height: 36px;
          border-radius: 50% 50% 50% 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-weight: 600;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(-45deg);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          border: 3px solid white;
        }

        .numbered-marker-inner::after {
          content: '';
          transform: rotate(45deg);
        }
      `}</style>
    </div>
  );
}

export default EventMap;
