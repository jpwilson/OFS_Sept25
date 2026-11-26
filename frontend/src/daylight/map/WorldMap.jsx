// World map (stub by F0; MAP replaces the insides, keeps the props).
// <WorldMap events selectedId onSelect />  events: production list items (latitude, longitude, cover_image_url...)
// The stub is the static level: a Places list, plus a count of stories with no place yet.
import { PlacesList } from './PlacesList.jsx'
import { isLatLng } from '../lib/geo.js'
import s from './WorldMap.module.css'

export default function WorldMap({ events = [], selectedId, onSelect }) {
  const placed = events.filter((e) => isLatLng(e.latitude, e.longitude))
  const unplaced = events.length - placed.length
  return (
    <div className={s.world} data-ui="world-map" data-map-state="idle">
      <p className="a-label">{placed.length} on the map{unplaced ? ` · ${unplaced} with no place yet` : ''}</p>
      <PlacesList events={events} selectedId={selectedId} onSelect={onSelect} />
    </div>
  )
}
